import { browser } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import Registry from './registry.js';
import { LANGUAGES, loadLanguage, setLanguage } from './i18n.js';

const registry = new Registry();
let parsedConfigs = null;
let currentLang = 'en';

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

function applyTranslations(lang) {
  currentLang = lang;
  const strings = LANGUAGES[lang].strings;
  document.getElementById('language-label').childNodes[0].nodeValue = strings.language + ' ';
  document.getElementById('url-label').childNodes[0].nodeValue = strings.accessUrl + ' ';
  document.getElementById('location-label').childNodes[0].nodeValue = strings.location + ' ';
  document.getElementById('connect').textContent = strings.connect;
  document.getElementById('disconnect').textContent = strings.disconnect;
  document.getElementById('domains-title').textContent = strings.proxyDomains;
  document.getElementById('add-domain').textContent = strings.addDomain;
}

function setupLanguageSelect(lang) {
  const select = document.getElementById('language');
  select.innerHTML = '';
  Object.entries(LANGUAGES).forEach(([code, data]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = data.label;
    if (code === lang) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  select.addEventListener('change', async () => {
    const newLang = select.value;
    await setLanguage(newLang);
    applyTranslations(newLang);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  const lang = await loadLanguage();
  setupLanguageSelect(lang);
  applyTranslations(lang);
});

document.getElementById('url').addEventListener('input', () => {
  parsedConfigs = null;
  document.getElementById('location-label').style.display = 'none';
});

document.getElementById('connect').addEventListener('click', async () => {
  const url = document.getElementById('url').value.trim();
  const status = document.getElementById('status');
  const locSelect = document.getElementById('location');
  const strings = LANGUAGES[currentLang].strings;
  status.textContent = strings.starting;
  try {
    if (parsedConfigs && Array.isArray(parsedConfigs)) {
      const chosen = parsedConfigs[parseInt(locSelect.value, 10)];
      const finalCfg = { ...chosen, localPort: 1080, accessUrl: url };
      browser.storage.local.set(finalCfg);
      browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
        if (response && response.success) {
          status.textContent = strings.running;
        } else {
          status.textContent = strings.error + (response && response.error);
        }
      });
      return;
    }

    const cfg = await parseAccessUrl(url);
    if (Array.isArray(cfg)) {
      parsedConfigs = cfg;
      showLocations(cfg);
      status.textContent = strings.selectLocation;
      return;
    }
    const finalCfg = { ...cfg, localPort: 1080, accessUrl: url };
    browser.storage.local.set(finalCfg);
    browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
      if (response && response.success) {
        status.textContent = strings.running;
      } else {
        status.textContent = strings.error + (response && response.error);
      }
    });
  } catch (e) {
    status.textContent = strings.failed;
  }
});

document.getElementById('disconnect').addEventListener('click', () => {
  const status = document.getElementById('status');
  const strings = LANGUAGES[currentLang].strings;
  status.textContent = strings.stopping;
  browser.runtime.sendMessage({ type: 'stop-proxy' }, () => {
    status.textContent = strings.stopped;
  });
});

document.getElementById('add-domain').addEventListener('click', async () => {
  const input = document.getElementById('domain-input');
  await registry.addDomain(input.value);
  input.value = '';
  renderDomains();
});
