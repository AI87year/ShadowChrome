import { browser } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import Registry from './registry.js';

const registry = new Registry();
let parsedConfigs = null;

async function loadConfig() {
  const cfg = await browser.storage.local.get(['accessUrl']);
  if (cfg.accessUrl) {
    document.getElementById('url').value = cfg.accessUrl;
  }
  renderDomains();
}

async function renderDomains() {
  const list = await registry.getDomains();
  const ul = document.getElementById('domain-list');
  ul.innerHTML = '';
  list.forEach(d => {
    const li = document.createElement('li');
    li.textContent = d;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', async () => {
      await registry.removeDomain(d);
      renderDomains();
    });
    li.appendChild(btn);
    ul.appendChild(li);
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
      browser.storage.local.set(finalCfg);
      browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
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
    browser.storage.local.set(finalCfg);
    browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
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
  browser.runtime.sendMessage({ type: 'stop-proxy' }, () => {
    status.textContent = 'Proxy stopped';
  });
});

document.getElementById('add-domain').addEventListener('click', async () => {
  const input = document.getElementById('domain-input');
  await registry.addDomain(input.value);
  input.value = '';
  renderDomains();
});
