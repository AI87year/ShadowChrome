import { parseAccessUrl } from './ssConfig.js';

let parsedConfigs = null;

function loadConfig() {
  chrome.storage.local.get(['accessUrl'], (cfg) => {
    if (cfg.accessUrl) {
      document.getElementById('url').value = cfg.accessUrl;
    }
  });
}

function showLocations(configs) {
  const label = document.getElementById('location-label');
  const select = document.getElementById('location');
  select.innerHTML = '';
  configs.forEach((cfg, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = cfg.tag || cfg.name || cfg.host;
    select.appendChild(option);
  });
  label.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', loadConfig);

document.getElementById('url').addEventListener('input', () => {
  parsedConfigs = null;
  document.getElementById('location-label').style.display = 'none';
});

document.getElementById('connect').addEventListener('click', async () => {
  const url = document.getElementById('url').value.trim();
  const status = document.getElementById('status');
  const locSelect = document.getElementById('location');
  status.textContent = 'Starting proxy...';
  try {
    if (parsedConfigs && Array.isArray(parsedConfigs)) {
      const chosen = parsedConfigs[parseInt(locSelect.value, 10)];
      const finalCfg = { ...chosen, localPort: 1080, accessUrl: url };
      chrome.storage.local.set(finalCfg);
      chrome.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
        if (response && response.success) {
          status.textContent = 'Proxy running on 127.0.0.1:1080';
        } else {
          status.textContent = 'Error: ' + (response && response.error);
        }
      });
      return;
    }

    const cfg = await parseAccessUrl(url);
    if (Array.isArray(cfg)) {
      parsedConfigs = cfg;
      showLocations(cfg);
      status.textContent = 'Select location and press Connect';
      return;
    }
    const finalCfg = { ...cfg, localPort: 1080, accessUrl: url };
    chrome.storage.local.set(finalCfg);
    chrome.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
      if (response && response.success) {
        status.textContent = 'Proxy running on 127.0.0.1:1080';
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
