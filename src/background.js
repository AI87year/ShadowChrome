chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'set-proxy') {
    try {
      await chrome.proxy.settings.set({value: {
        mode: 'fixed_servers',
        rules: {singleProxy: {scheme: 'socks5', host: message.host, port: parseInt(message.port, 10)}}
      }});
      sendResponse({success: true});
    } catch (e) {
      console.error('Failed to set proxy', e);
      sendResponse({success: false, error: e.message});
    }
  } else if (message.type === 'clear-proxy') {
    try {
      await chrome.proxy.settings.clear({});
      sendResponse({success: true});
    } catch (e) {
      console.error('Failed to clear proxy', e);
      sendResponse({success: false, error: e.message});
    }
  }
});
