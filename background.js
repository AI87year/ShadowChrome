let processRunning = false;

function sendNative(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(
      'com.example.shadowchrome',
      message,
      resolve
    );
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'connect') {
    sendNative({ action: 'connect', server: msg.server }).then((res) => {
      processRunning = true;
      chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: { scheme: 'socks5', host: '127.0.0.1', port: 1080 },
            bypassList: ['<local>']
          }
        }
      });
      chrome.runtime.sendMessage({ status: res && res.status ? res.status : 'Connected' });
    });
  } else if (msg.action === 'disconnect') {
    sendNative({ action: 'disconnect' }).then((res) => {
      processRunning = false;
      chrome.proxy.settings.clear({}, () => {});
      chrome.runtime.sendMessage({ status: res && res.status ? res.status : 'Disconnected' });
    });
  } else if (msg.action === 'logout') {
    sendNative({ action: 'logout' }).then((res) => {
      processRunning = false;
      chrome.proxy.settings.clear({}, () => {});
      chrome.runtime.sendMessage({ status: res && res.status ? res.status : 'Disconnected' });
    });
  }
});
