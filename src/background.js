let proxyConfig = null;
let serverSocketId = null;

// Per-connection state keyed by client socket id
const connections = new Map();
const remoteMap = new Map(); // remote socket id -> connection

const TAG_LENGTH = 16;

function buildNonce(counter) {
  const nonce = new Uint8Array(12);
  const view = new DataView(nonce.buffer);
  view.setUint32(4, Number(counter >> 32n));
  view.setUint32(8, Number(counter & 0xffffffffn));
  return nonce;
}

async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    password,
    'HKDF',
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-1',
      salt,
      info: new TextEncoder().encode('ss-subkey')
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function concatUint8(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function encrypt(key, counter, data) {
  const nonce = buildNonce(counter);
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    data
  );
  return new Uint8Array(buf);
}

async function decrypt(key, counter, data) {
  const nonce = buildNonce(counter);
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    data
  );
  return new Uint8Array(buf);
}

async function encryptAndSend(conn, data) {
  let offset = 0;
  while (offset < data.length) {
    const size = Math.min(0x3fff, data.length - offset);
    const chunk = data.slice(offset, offset + size);
    const lenBuf = new Uint8Array(2);
    lenBuf[0] = (size >> 8) & 0xff;
    lenBuf[1] = size & 0xff;
    const encLen = await encrypt(conn.outKey, conn.outNonce++, lenBuf);
    const encData = await encrypt(conn.outKey, conn.outNonce++, chunk);
    const payload = concatUint8(encLen, encData);
    chrome.sockets.tcp.send(conn.remoteSocketId, payload.buffer, () => {});
    offset += size;
  }
}

async function processRemote(conn) {
  for (;;) {
    if (conn.remoteBuffer.length < 2 + TAG_LENGTH) return;
    const encLen = conn.remoteBuffer.slice(0, 2 + TAG_LENGTH);
    const lenBuf = await decrypt(conn.inKey, conn.inNonce++, encLen);
    const len = (lenBuf[0] << 8) | lenBuf[1];
    if (conn.remoteBuffer.length < 2 + TAG_LENGTH + len + TAG_LENGTH) return;
    const encData = conn.remoteBuffer.slice(
      2 + TAG_LENGTH,
      2 + TAG_LENGTH + len + TAG_LENGTH
    );
    conn.remoteBuffer = conn.remoteBuffer.slice(2 + TAG_LENGTH + len + TAG_LENGTH);
    const data = await decrypt(conn.inKey, conn.inNonce++, encData);
    chrome.sockets.tcp.send(conn.clientSocketId, data.buffer, () => {});
  }
}

function startClient(config, cb) {
  chrome.sockets.tcpServer.create({}, createInfo => {
    serverSocketId = createInfo.socketId;
    chrome.sockets.tcpServer.listen(
      serverSocketId,
      '127.0.0.1',
      parseInt(config.localPort, 10),
      () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to listen', chrome.runtime.lastError);
          cb(false, chrome.runtime.lastError.message);
          return;
        }
        chrome.sockets.tcpServer.onAccept.addListener(onAccept);
        chrome.sockets.tcp.onReceive.addListener(onReceive);
        chrome.sockets.tcp.onReceiveError.addListener(onReceiveError);
        cb(true);
      }
    );
  });
}

function onAccept(info) {
  if (info.socketId !== serverSocketId) return;
  const conn = {
    clientSocketId: info.clientSocketId,
    remoteSocketId: null,
    stage: 'init',
    outKey: null,
    inKey: null,
    outNonce: 0n,
    inNonce: 0n,
    remoteBuffer: new Uint8Array(0)
  };
  connections.set(info.clientSocketId, conn);
  chrome.sockets.tcp.create({}, createInfo => {
    conn.remoteSocketId = createInfo.socketId;
    remoteMap.set(conn.remoteSocketId, conn);
    chrome.sockets.tcp.connect(
      conn.remoteSocketId,
      proxyConfig.host,
      parseInt(proxyConfig.port, 10),
      () => {
        if (chrome.runtime.lastError) {
          console.error('Remote connect failed', chrome.runtime.lastError);
          chrome.sockets.tcp.close(conn.clientSocketId);
          chrome.sockets.tcp.close(conn.remoteSocketId);
          connections.delete(info.clientSocketId);
          remoteMap.delete(conn.remoteSocketId);
        } else {
          chrome.sockets.tcp.setPaused(info.clientSocketId, false);
        }
      }
    );
  });
}

function onReceive(info) {
  if (connections.has(info.socketId)) {
    handleClientData(connections.get(info.socketId), new Uint8Array(info.data));
  } else if (remoteMap.has(info.socketId)) {
    handleRemoteData(remoteMap.get(info.socketId), new Uint8Array(info.data));
  }
}

function onReceiveError(info) {
  const conn = connections.get(info.socketId) || remoteMap.get(info.socketId);
  if (conn) {
    chrome.sockets.tcp.close(conn.clientSocketId);
    chrome.sockets.tcp.close(conn.remoteSocketId);
    connections.delete(conn.clientSocketId);
    remoteMap.delete(conn.remoteSocketId);
  }
}

function handleClientData(conn, data) {
  if (conn.stage === 'init') {
    chrome.sockets.tcp.send(
      conn.clientSocketId,
      new Uint8Array([5, 0]).buffer,
      () => {}
    );
    conn.stage = 'request';
    return;
  }

  if (conn.stage === 'request') {
    const atyp = data[3];
    let offset = 4;
    if (atyp === 1) {
      offset += 4;
    } else if (atyp === 3) {
      offset += 1 + data[4];
    } else if (atyp === 4) {
      offset += 16;
    }
    const addrBuf = data.slice(3, offset + 2);
    const extra = data.slice(offset + 2);

    const resp = new Uint8Array([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    chrome.sockets.tcp.send(conn.clientSocketId, resp.buffer, () => {});

    const salt = crypto.getRandomValues(new Uint8Array(32));
    const password = new TextEncoder().encode(proxyConfig.password);
    chrome.sockets.tcp.send(conn.remoteSocketId, salt.buffer, () => {
      deriveKey(password, salt).then(key => {
        conn.outKey = key;
        conn.outNonce = 0n;
        encryptAndSend(conn, concatUint8(addrBuf, extra));
        conn.stage = 'stream';
      });
    });

    return;
  }

  if (conn.stage === 'stream') {
    encryptAndSend(conn, data);
  }
}

function handleRemoteData(conn, data) {
  conn.remoteBuffer = concatUint8(conn.remoteBuffer, data);
  if (!conn.inKey) {
    if (conn.remoteBuffer.length < 32) return;
    const salt = conn.remoteBuffer.slice(0, 32);
    conn.remoteBuffer = conn.remoteBuffer.slice(32);
    const password = new TextEncoder().encode(proxyConfig.password);
    deriveKey(password, salt).then(key => {
      conn.inKey = key;
      conn.inNonce = 0n;
      processRemote(conn);
    });
  } else {
    processRemote(conn);
  }
}

function stopClient(cb) {
  if (serverSocketId === null) {
    cb(true);
    return;
  }
  connections.forEach(conn => {
    chrome.sockets.tcp.close(conn.clientSocketId);
    chrome.sockets.tcp.close(conn.remoteSocketId);
  });
  connections.clear();
  remoteMap.clear();
  chrome.sockets.tcpServer.close(serverSocketId, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to close server', chrome.runtime.lastError);
      cb(false, chrome.runtime.lastError.message);
    } else {
      chrome.sockets.tcpServer.onAccept.removeListener(onAccept);
      chrome.sockets.tcp.onReceive.removeListener(onReceive);
      chrome.sockets.tcp.onReceiveError.removeListener(onReceiveError);
      serverSocketId = null;
      cb(true);
    }
  });
}

function setChromeProxy(config, sendResponse) {
  chrome.proxy.settings.set({
    value: {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: 'socks5',
          host: '127.0.0.1',
          port: parseInt(config.localPort, 10)
        }
      }
    }
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to set proxy', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start-proxy') {
    proxyConfig = message.config;
    startClient(proxyConfig, (ok, err) => {
      if (!ok) {
        sendResponse({ success: false, error: err });
        return;
      }
      setChromeProxy(proxyConfig, sendResponse);
    });
    return true;
  } else if (message.type === 'stop-proxy') {
    stopClient((ok, err) => {
      chrome.proxy.settings.clear({}, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to clear proxy', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else if (!ok) {
          sendResponse({ success: false, error: err });
        } else {
          proxyConfig = null;
          sendResponse({ success: true });
        }
      });
    });
    return true;
  }
});
