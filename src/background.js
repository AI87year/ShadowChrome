import { browser } from './browser-api.js';
import ProxyManager from './proxyManager.js';
import Registry from './registry.js';
import ServerClient from './serverClient.js';
import logger from './logger.js';
import { collectDiagnostics } from './diagnostics.js';
import { loadBundledDomains, fetchRemoteDomains } from './censortracker.js';
import {
  scheduleCensorTrackerSync,
  syncCensorTracker,
  getStoredCensorTrackerFallback
} from './censortrackerServer.js';
import ServerStore from './serverStore.js';
import OutlineManager from './outlineManager.js';

let proxyConfig = null;
let serverSocketId = null;

const registry = new Registry();
const serverStore = new ServerStore();
const proxyManager = new ProxyManager(registry);
const serverClient = new ServerClient(registry, [
  'https://config.example.com',
  'https://backup.example.net'
]);
serverClient.scheduleUpdates();
const outlineManager = new OutlineManager(serverStore);
outlineManager.scheduleSync();
scheduleCensorTrackerSync(registry);

async function bootstrapDomains() {
  const current = await registry.getDomains();
  if (current.length === 0) {
    const bundled = await loadBundledDomains();
    if (bundled.length) {
      await registry.setDomains(bundled);
    }
    fetchRemoteDomains().then(domains => {
      if (domains.length) registry.setDomains(domains);
    });
  }
}

bootstrapDomains();

logger.load().then(() => logger.info('Background script initialized'));

browser.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && (changes.domainRegistry || changes.registryState)) {
    const port = proxyConfig ? proxyConfig.localPort : 1080;
    await proxyManager.refresh(port);
  }
});

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
    browser.sockets.tcp.send(conn.remoteSocketId, payload.buffer, () => {});
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
    browser.sockets.tcp.send(conn.clientSocketId, data.buffer, () => {});
  }
}

function startClient(config, cb) {
  logger.info('Starting client', { port: config.localPort });
  if (serverSocketId !== null) {
    logger.warn('Existing client detected, restarting before binding');
    stopClient((ok, err) => {
      if (!ok) {
        cb(false, err);
        return;
      }
      startClient(config, cb);
    });
    return;
  }
  browser.sockets.tcpServer.create({}, createInfo => {
    if (browser.runtime.lastError) {
      logger.error('Failed to create server socket', browser.runtime.lastError);
      cb(false, browser.runtime.lastError.message);
      return;
    }
    serverSocketId = createInfo.socketId;
    browser.sockets.tcpServer.listen(
      serverSocketId,
      '127.0.0.1',
      parseInt(config.localPort, 10),
      () => {
        if (browser.runtime.lastError) {
          logger.error('Failed to listen', browser.runtime.lastError);
          browser.sockets.tcpServer.close(serverSocketId, () => {
            serverSocketId = null;
          });
          cb(false, browser.runtime.lastError.message);
          return;
        }
        logger.info('Listening on 127.0.0.1:' + parseInt(config.localPort, 10));
        browser.sockets.tcpServer.onAccept.addListener(onAccept);
        browser.sockets.tcp.onReceive.addListener(onReceive);
        browser.sockets.tcp.onReceiveError.addListener(onReceiveError);
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
  browser.sockets.tcp.create({}, createInfo => {
    conn.remoteSocketId = createInfo.socketId;
    remoteMap.set(conn.remoteSocketId, conn);
    browser.sockets.tcp.connect(
      conn.remoteSocketId,
      proxyConfig.host,
      parseInt(proxyConfig.port, 10),
      () => {
        if (browser.runtime.lastError) {
          logger.error('Remote connect failed', browser.runtime.lastError);
          browser.sockets.tcp.close(conn.clientSocketId);
          browser.sockets.tcp.close(conn.remoteSocketId);
          connections.delete(info.clientSocketId);
          remoteMap.delete(conn.remoteSocketId);
        } else {
          browser.sockets.tcp.setPaused(info.clientSocketId, false);
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
    browser.sockets.tcp.close(conn.clientSocketId);
    browser.sockets.tcp.close(conn.remoteSocketId);
    connections.delete(conn.clientSocketId);
    remoteMap.delete(conn.remoteSocketId);
  }
}

function handleClientData(conn, data) {
  if (conn.stage === 'init') {
    browser.sockets.tcp.send(
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
    browser.sockets.tcp.send(conn.clientSocketId, resp.buffer, () => {});

    const salt = crypto.getRandomValues(new Uint8Array(32));
    const password = new TextEncoder().encode(proxyConfig.password);
    browser.sockets.tcp.send(conn.remoteSocketId, salt.buffer, () => {
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
  logger.info('Stopping client');
  if (serverSocketId === null) {
    cb(true);
    return;
  }
  connections.forEach(conn => {
    browser.sockets.tcp.close(conn.clientSocketId);
    browser.sockets.tcp.close(conn.remoteSocketId);
  });
  connections.clear();
  remoteMap.clear();
  const socketId = serverSocketId;
  serverSocketId = null;
  browser.sockets.tcpServer.onAccept.removeListener(onAccept);
  browser.sockets.tcp.onReceive.removeListener(onReceive);
  browser.sockets.tcp.onReceiveError.removeListener(onReceiveError);
  browser.sockets.tcpServer.close(socketId, () => {
    if (browser.runtime.lastError) {
      logger.error('Failed to close server', browser.runtime.lastError);
      cb(false, browser.runtime.lastError.message);
      return;
    }
    logger.info('Server closed');
    cb(true);
  });
}

// ProxyManager handles PAC generation and proxy settings

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start-proxy') {
    logger.info('Start proxy requested');
    proxyConfig = message.config;
    startClient(proxyConfig, (ok, err) => {
      if (!ok) {
        sendResponse({ success: false, error: err });
        return;
      }
      proxyManager
        .enable(proxyConfig.localPort)
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
    });
    return true;
  } else if (message.type === 'stop-proxy') {
    logger.info('Stop proxy requested');
    stopClient((ok, err) => {
      proxyManager
        .disable()
        .then(() => {
          if (!ok) {
            sendResponse({ success: false, error: err });
          } else {
            proxyConfig = null;
            sendResponse({ success: true });
          }
        })
        .catch(e => sendResponse({ success: false, error: e.message }));
    });
    return true;
  } else if (message.type === 'sync') {
    logger.info('Sync requested');
    serverClient
      .syncAll()
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'sync-censortracker') {
    syncCensorTracker(registry)
      .then(result => sendResponse({ success: !!result.success, result }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'get-censortracker-fallback') {
    getStoredCensorTrackerFallback()
      .then(data => sendResponse({ success: true, data: data || { servers: [] } }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'get-diagnostics') {
    logger.info('Diagnostics requested');
    collectDiagnostics()
      .then(data => sendResponse({ success: true, data }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'add-outline-manager') {
    (async () => {
      try {
        await outlineManager.addManager(message.apiUrl, message.certSha256);
        try {
          await outlineManager.syncManager({
            apiUrl: message.apiUrl,
            certSha256: message.certSha256
          });
          sendResponse({ success: true });
        } catch (syncErr) {
          logger.warn('Outline manager sync failed after add', syncErr);
          sendResponse({ success: true, warning: syncErr.message });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  } else if (message.type === 'remove-outline-manager') {
    outlineManager
      .removeManager(message.apiUrl)
      .then(() => serverStore.removeByManager(message.apiUrl))
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'list-outline-managers') {
    outlineManager
      .listManagers()
      .then(list => sendResponse({ success: true, list }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'sync-outline') {
    outlineManager
      .syncAll()
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'remove-server') {
    serverStore
      .remove(message.id)
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'list-servers') {
    serverStore
      .list()
      .then(list => sendResponse({ success: true, list }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'get-registry-state') {
    registry
      .getRegistryState()
      .then(state => sendResponse({ success: true, state }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'set-registry-enabled') {
    registry
      .toggleRegistry(message.enabled)
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'add-ignored-domain') {
    registry
      .mergeIgnoredHosts([message.domain])
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'remove-ignored-domain') {
    registry
      .removeIgnoredHost(message.domain)
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  } else if (message.type === 'get-proxy-status') {
    const summary = proxyConfig
      ? {
          host: proxyConfig.host,
          port: proxyConfig.port,
          localPort: proxyConfig.localPort || 1080,
          tag: proxyConfig.tag || null
        }
      : null;
    sendResponse({ success: true, running: !!proxyConfig, summary });
  }
});
// Updated: 2025-11-13
