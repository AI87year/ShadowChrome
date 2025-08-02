import { parseAccessUrl } from './ssConfig.js';

function loadConfig() {
  chrome.storage.local.get(['accessUrl', 'localPort'], (cfg) => {
    if (cfg.localPort) {
      document.getElementById('port').value = cfg.localPort;
    }
    if (cfg.accessUrl) {
      document.getElementById('url').value = cfg.accessUrl;
    }
  });
}

document.addEventListener('DOMContentLoaded', loadConfig);

document.getElementById('connect').addEventListener('click', async () => {
  const port = document.getElementById('port').value || '1080';
  const url = document.getElementById('url').value.trim();
  const status = document.getElementById('status');
  status.textContent = 'Starting proxy...';
  try {
    const cfg = await parseAccessUrl(url);
    const finalCfg = { ...cfg, localPort: parseInt(port, 10), accessUrl: url };
    chrome.storage.local.set(finalCfg);
    chrome.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
      if (response && response.success) {
        status.textContent = 'Proxy running on 127.0.0.1:' + port;
      } else {
        status.textContent = 'Error: ' + (response && response.error);
      }
    });
  } catch (e) {
    status.textContent = 'Failed to start proxy';
  }
});

document.getElementById('disconnect').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = 'Stopping...';
  chrome.runtime.sendMessage({ type: 'stop-proxy' }, () => {
    status.textContent = 'Proxy stopped';
  });
});
