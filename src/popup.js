import { browser } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import Registry from './registry.js';
import { LANGS, getMessage } from './i18n.js';

const registry = new Registry();
let parsedConfigs = null;
let currentLang = 'en';

function populateLanguageSelect() {
  const select = document.getElementById('language');
  select.innerHTML = '';
  Object.entries(LANGS).forEach(([code, info]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${info.flag} ${info.name}`;
    if (code === currentLang) option.selected = true;
    select.appendChild(option);
  });
}

function applyTranslations() {
  document.getElementById('language-label-text').textContent = getMessage(currentLang, 'languageLabel');
  document.getElementById('access-label-text').textContent = getMessage(currentLang, 'accessUrlLabel');
  document.getElementById('url').placeholder = getMessage(currentLang, 'accessUrlPlaceholder');
  document.getElementById('location-label-text').textContent = getMessage(currentLang, 'locationLabel');
  document.getElementById('connect').textContent = getMessage(currentLang, 'connectBtn');
  document.getElementById('disconnect').textContent = getMessage(currentLang, 'disconnectBtn');
  document.getElementById('domains-heading').textContent = getMessage(currentLang, 'proxyDomainsHeading');
  document.getElementById('domain-input').placeholder = getMessage(currentLang, 'domainPlaceholder');
  document.getElementById('add-domain').textContent = getMessage(currentLang, 'addDomainBtn');
}

async function loadConfig() {
  const cfg = await browser.storage.local.get(['accessUrl', 'lang']);
  if (cfg.lang && LANGS[cfg.lang]) {
    currentLang = cfg.lang;
  }
  populateLanguageSelect();
  applyTranslations();
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

document.getElementById('language').addEventListener('change', async (e) => {
  currentLang = e.target.value;
  await browser.storage.local.set({ lang: currentLang });
  applyTranslations();
});

document.getElementById('url').addEventListener('input', () => {
  parsedConfigs = null;
  document.getElementById('location-label').style.display = 'none';
});

document.getElementById('connect').addEventListener('click', async () => {
  const url = document.getElementById('url').value.trim();
  const status = document.getElementById('status');
  const locSelect = document.getElementById('location');
  status.textContent = getMessage(currentLang, 'statusStarting');
  try {
    if (parsedConfigs && Array.isArray(parsedConfigs)) {
      const chosen = parsedConfigs[parseInt(locSelect.value, 10)];
      const finalCfg = { ...chosen, localPort: 1080, accessUrl: url };
      browser.storage.local.set(finalCfg);
      browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
        if (response && response.success) {
          status.textContent = getMessage(currentLang, 'statusRunning');
        } else {
          status.textContent = getMessage(currentLang, 'statusError') + ' ' + (response && response.error);
        }
      });
      return;
    }

    const cfg = await parseAccessUrl(url);
    if (Array.isArray(cfg)) {
      parsedConfigs = cfg;
      showLocations(cfg);
      status.textContent = getMessage(currentLang, 'statusSelectLocation');
      return;
    }
    const finalCfg = { ...cfg, localPort: 1080, accessUrl: url };
    browser.storage.local.set(finalCfg);
    browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
      if (response && response.success) {
        status.textContent = getMessage(currentLang, 'statusRunning');
      } else {
        status.textContent = getMessage(currentLang, 'statusError') + ' ' + (response && response.error);
      }
    });
  } catch (e) {
    status.textContent = getMessage(currentLang, 'statusFailed');
  }
});

document.getElementById('disconnect').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = getMessage(currentLang, 'statusStopping');
  browser.runtime.sendMessage({ type: 'stop-proxy' }, () => {
    status.textContent = getMessage(currentLang, 'statusStopped');
  });
});

document.getElementById('add-domain').addEventListener('click', async () => {
  const input = document.getElementById('domain-input');
  await registry.addDomain(input.value);
  input.value = '';
  renderDomains();
});
