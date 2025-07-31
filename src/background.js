chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'set-proxy') {
    chrome.proxy.settings.set({
      value: {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: 'socks5',
            host: message.host,
            port: parseInt(message.port, 10)
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
    return true;
  } else if (message.type === 'clear-proxy') {
    chrome.proxy.settings.clear({}, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to clear proxy', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});
