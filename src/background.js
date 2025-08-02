let proxyConfig = null;

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
    // TODO: start Shadowsocks client using chrome.sockets here
    setChromeProxy(proxyConfig, sendResponse);
    return true;
  } else if (message.type === 'stop-proxy') {
    // TODO: stop Shadowsocks client when implemented
    chrome.proxy.settings.clear({}, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to clear proxy', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        proxyConfig = null;
        sendResponse({ success: true });
      }
    });
    return true;
  }
});
