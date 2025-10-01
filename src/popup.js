import { browser, isStub } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import ServerStore from './serverStore.js';
import { getTranslation, defaultLanguage, languageOptions } from './i18n.js';

const serverStore = new ServerStore();

let currentLang = defaultLanguage;
let cachedServers = [];
let storedAccessUrl = '';
let accessFormOpen = true;

const PREVIEW_ERROR = { success: false, error: 'preview-mode-unavailable' };

const elements = {
  settingsLabel: document.getElementById('settings-label'),
  languageLabel: document.getElementById('language-label'),
  languageSelect: document.getElementById('language-select'),
  languageNote: document.getElementById('language-note'),
  accessSection: document.getElementById('access-section'),
  accessLabel: document.getElementById('access-label'),
  accessInput: document.getElementById('access-input'),
  saveAccess: document.getElementById('save-access'),
  locationSection: document.getElementById('location-section'),
  locationLabel: document.getElementById('location-label'),
  locationSelect: document.getElementById('location-select'),
  locationNote: document.getElementById('location-note'),
  connect: document.getElementById('connect'),
  disconnect: document.getElementById('disconnect'),
  changeAccess: document.getElementById('change-access'),
  openSettings: document.getElementById('open-settings'),
  status: document.getElementById('status')
};

serverStore.onChange(() => {
  refreshLocations().catch(err => console.error('Failed to refresh locations', err));
});

function t() {
  return getTranslation(currentLang);
}

function applyTranslations() {
  const tr = t();
  document.documentElement.lang = currentLang;
  elements.settingsLabel.textContent = tr.settingsButton || tr.openSettings || 'Settings';
  elements.languageLabel.textContent = tr.language;
  elements.languageNote.textContent = tr.languageSharedNote || '';
  elements.languageNote.style.display = elements.languageNote.textContent ? 'block' : 'none';
  elements.accessLabel.textContent = tr.accessUrl;
  elements.accessInput.placeholder = tr.accessUrlPlaceholder;
  elements.saveAccess.textContent = tr.accessSectionButton || tr.saveAccessKey || tr.sync;
  elements.locationLabel.textContent = tr.location;
  elements.locationNote.textContent = tr.locationNote || '';
  elements.locationNote.style.display = cachedServers.length ? 'block' : 'none';
  elements.connect.textContent = tr.connect;
  elements.disconnect.textContent = tr.disconnect;
  elements.changeAccess.textContent = tr.changeAccessKey || tr.accessUrl;
}

function initLanguageSelect(selected) {
  elements.languageSelect.innerHTML = '';
  languageOptions.forEach(({ code, label }) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    elements.languageSelect.appendChild(option);
  });
  if (languageOptions.some(option => option.code === selected)) {
    elements.languageSelect.value = selected;
  } else {
    elements.languageSelect.value = defaultLanguage;
  }
}

function setAccessFormOpen(open) {
  accessFormOpen = open;
  elements.accessSection.style.display = open ? 'block' : 'none';
  elements.changeAccess.style.display = !open && storedAccessUrl ? 'inline' : 'none';
  if (open) {
    elements.accessInput.value = storedAccessUrl || '';
    elements.accessInput.focus();
  }
}

function formatServerLabel(server) {
  const name = server.tag || server.name || server.locationName;
  const host = server.host;
  const port = server.port || server.server_port || server.serverPort;
  if (name && host) {
    return `${name} • ${host}:${port}`;
  }
  if (name) {
    return name;
  }
  if (host && port) {
    return `${host}:${port}`;
  }
  return server.id || 'Server';
}

function getLatencyValue(server) {
  if (!server) {
    return Number.POSITIVE_INFINITY;
  }
  const direct = typeof server.latencyMs === 'number' ? server.latencyMs : null;
  if (Number.isFinite(direct)) {
    return direct;
  }
  const metricsLatency = server.metrics && typeof server.metrics.latencyMs === 'number'
    ? server.metrics.latencyMs
    : null;
  if (Number.isFinite(metricsLatency)) {
    return metricsLatency;
  }
  return Number.POSITIVE_INFINITY;
}

function sortServersByPreference(servers) {
  return [...servers].sort((a, b) => {
    const latencyA = getLatencyValue(a);
    const latencyB = getLatencyValue(b);
    if (latencyA !== latencyB) {
      return latencyA - latencyB;
    }
    const nameA = (a.tag || a.name || a.locationName || a.host || '').toLowerCase();
    const nameB = (b.tag || b.name || b.locationName || b.host || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

async function refreshLocations(preferredId) {
  cachedServers = await serverStore.list();
  const sorted = sortServersByPreference(cachedServers);
  const select = elements.locationSelect;
  select.innerHTML = '';

  sorted.forEach(server => {
    const option = document.createElement('option');
    option.value = server.id;
    option.textContent = formatServerLabel(server);
    select.appendChild(option);
  });

  if (preferredId && sorted.some(server => server.id === preferredId)) {
    select.value = preferredId;
  }
  if (select.selectedIndex === -1 && select.options.length > 0) {
    select.selectedIndex = 0;
  }

  cachedServers = sorted;

  const hasLocations = cachedServers.length > 0;
  elements.locationSection.style.display = hasLocations ? 'block' : 'none';
  elements.locationNote.style.display = hasLocations ? 'block' : 'none';
  if (!hasLocations) {
    setAccessFormOpen(true);
  } else if (!accessFormOpen && storedAccessUrl) {
    elements.changeAccess.style.display = 'inline';
  } else if (!storedAccessUrl) {
    setAccessFormOpen(true);
  }
}

function getPreviewResponse(message) {
  switch (message.type) {
    case 'get-proxy-status':
      return { success: true, running: false, summary: null };
    case 'get-censortracker-fallback':
      return { success: true, data: { servers: [] } };
    case 'stop-proxy':
    case 'start-proxy':
      return PREVIEW_ERROR;
    default:
      return PREVIEW_ERROR;
  }
}

async function sendMessage(message) {
  if (isStub) {
    return getPreviewResponse(message);
  }
  try {
    return await browser.runtime.sendMessage(message);
  } catch (error) {
    if (error && error.message && error.message.includes('Receiving end')) {
      return null;
    }
    if (error && error.message && error.message.includes('preview mode')) {
      return PREVIEW_ERROR;
    }
    throw error;
  }
}

function sanitiseConfig(config) {
  return {
    method: config.method,
    password: config.password,
    host: config.host,
    port: Number(config.port),
    tag: config.tag || config.name,
    localPort: Number(config.localPort || 1080),
    plugin: config.plugin || undefined
  };
}

async function connectToServer(serverConfig, urlForStorage = '', options = {}) {
  const { persist = true } = options;
  const status = elements.status;
  const tr = t();
  const prepared = sanitiseConfig(serverConfig);
  status.textContent = tr.startingProxy;
  try {
    const payload = { lastConfig: prepared };
    if (persist && urlForStorage) {
      payload.accessUrl = urlForStorage;
    }
    await browser.storage.local.set(payload);
    if (persist) {
      await serverStore.add({
        ...serverConfig,
        ...prepared,
        accessUrl: urlForStorage
      });
    }
    const response = await sendMessage({ type: 'start-proxy', config: prepared });
    if (response && response.success) {
      status.textContent = tr.proxyRunning.replace('{port}', prepared.localPort);
      return;
    }
    throw new Error(response && response.error ? response.error : 'Unknown error');
  } catch (error) {
    status.textContent = tr.error + (error && error.message ? error.message : '');
    throw error;
  }
}

async function attemptFallbackConnection(originalError) {
  if (isStub) {
    elements.status.textContent = t().previewModeNotice || '';
    return false;
  }
  const tr = t();
  elements.status.textContent = tr.attemptingFallback || tr.syncing || '';
  try {
    const response = await sendMessage({ type: 'get-censortracker-fallback' });
    const payload = response && response.success ? response.data || response.result || response : null;
    const servers = payload && Array.isArray(payload.servers) ? payload.servers : [];
    if (!servers.length) {
      const message = tr.fallbackUnavailable || tr.error;
      const suffix = originalError && originalError.message ? ` ${originalError.message}` : '';
      elements.status.textContent = message + suffix;
      return false;
    }
    const sorted = sortServersByPreference(servers);
    let lastError = null;
    for (const server of sorted) {
      try {
        await connectToServer(server, server.accessUrl || '', { persist: false });
        const provider = payload && (payload.provider || payload.source || payload.endpoint)
          ? (payload.provider || payload.source || payload.endpoint)
          : 'CensorTracker';
        const addon = tr.fallbackConnected
          ? tr.fallbackConnected.replace('{provider}', provider)
          : `Fallback connection active via ${provider}`;
        elements.status.textContent = `${elements.status.textContent}\n${addon}`.trim();
        await refreshStatus();
        return true;
      } catch (error) {
        lastError = error;
      }
    }
    const failure = tr.fallbackFailed || tr.error;
    const suffix = lastError && lastError.message ? ` ${lastError.message}` : '';
    elements.status.textContent = failure + suffix;
    return false;
  } catch (error) {
    const message = tr.fallbackUnavailable || tr.error;
    const suffix = error && error.message ? ` ${error.message}` : '';
    elements.status.textContent = message + suffix;
    return false;
  }
}

async function refreshStatus() {
  if (isStub) {
    elements.status.textContent = t().previewModeNotice || '';
    return;
  }
  try {
    const response = await sendMessage({ type: 'get-proxy-status' });
    const tr = t();
    if (response && response.success && response.running) {
      const port = response.summary && response.summary.localPort
        ? response.summary.localPort
        : 1080;
      elements.status.textContent = tr.proxyRunning.replace('{port}', port);
    } else if (response && response.success) {
      elements.status.textContent = tr.statusIdle;
    } else {
      throw new Error(response && response.error ? response.error : 'Unknown error');
    }
  } catch (error) {
    elements.status.textContent = t().error + (error && error.message ? error.message : '');
  }
}

function buildServerId(config) {
  if (config.id) {
    return config.id;
  }
  return `${config.method}:${config.password}@${config.host}:${config.port}`;
}

async function importAccessKey(url) {
  const parsed = await parseAccessUrl(url);
  const configs = Array.isArray(parsed) ? parsed : [parsed];
  const ids = [];
  const existing = await serverStore.list();
  const preserved = existing.filter(server => !server.accessUrl || server.accessUrl === url);
  await serverStore.save(preserved);
  for (const config of configs) {
    const id = buildServerId(config);
    ids.push(id);
    await serverStore.add({
      ...config,
      id,
      accessUrl: url,
      localPort: config.localPort || 1080
    });
  }
  storedAccessUrl = url;
  await browser.storage.local.set({ accessUrl: url });
  await refreshLocations(ids[0]);
  return ids;
}

async function handleSaveAccess() {
  const url = elements.accessInput.value.trim();
  const tr = t();
  if (!url) {
    elements.status.textContent = tr.error + tr.urlRequired;
    return;
  }
  elements.status.textContent = tr.syncing || '';
  try {
    await importAccessKey(url);
    setAccessFormOpen(false);
    elements.status.textContent = tr.accessKeySaved || tr.syncComplete || '';
  } catch (error) {
    elements.status.textContent = tr.error + (error && error.message ? error.message : '');
  }
}

async function handleConnect() {
  if (isStub) {
    elements.status.textContent = t().previewModeNotice || '';
    return;
  }
  const tr = t();
  const selectedId = elements.locationSelect.value;
  if (selectedId) {
    const server = cachedServers.find(item => item.id === selectedId);
    if (!server) {
      elements.status.textContent = tr.error + tr.selectLocation;
      return;
    }
    try {
      await connectToServer(server, server.accessUrl || storedAccessUrl || '');
      await refreshStatus();
    } catch (error) {
      console.error('Failed to connect', error);
      await attemptFallbackConnection(error);
    }
    return;
  }

  const url = elements.accessInput.value.trim() || storedAccessUrl;
  if (!url) {
    elements.status.textContent = tr.error + tr.urlRequired;
    return;
  }

  try {
    const ids = await importAccessKey(url);
    if (ids.length === 1) {
      const server = cachedServers.find(item => item.id === ids[0]);
      if (server) {
        try {
          await connectToServer(server, url);
          await refreshStatus();
        } catch (error) {
          console.error('Failed to connect', error);
          await attemptFallbackConnection(error);
        }
      }
    } else {
      elements.status.textContent = tr.selectLocation;
    }
    setAccessFormOpen(false);
  } catch (error) {
    elements.status.textContent = tr.error + (error && error.message ? error.message : '');
  }
}

async function handleDisconnect() {
  if (isStub) {
    elements.status.textContent = t().previewModeNotice || '';
    return;
  }
  const tr = t();
  elements.status.textContent = tr.stopping;
  try {
    const response = await sendMessage({ type: 'stop-proxy' });
    if (response && response.success) {
      elements.status.textContent = tr.proxyStopped;
    } else {
      throw new Error(response && response.error ? response.error : 'Unknown error');
    }
  } catch (error) {
    elements.status.textContent = tr.error + (error && error.message ? error.message : '');
  }
}

async function init() {
  const stored = await browser.storage.local.get(['language', 'accessUrl']);
  if (stored.language) {
    currentLang = stored.language;
  }
  if (stored.accessUrl) {
    storedAccessUrl = stored.accessUrl;
    accessFormOpen = false;
  } else {
    accessFormOpen = true;
  }
  initLanguageSelect(currentLang);
  applyTranslations();
  setAccessFormOpen(accessFormOpen);
  await refreshLocations();
  await refreshStatus();
}

elements.saveAccess.addEventListener('click', handleSaveAccess);
elements.accessInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSaveAccess().catch(err => console.error('Import failed', err));
  }
});
elements.connect.addEventListener('click', () => {
  handleConnect().catch(err => console.error('Connect failed', err));
});
elements.disconnect.addEventListener('click', () => {
  handleDisconnect().catch(err => console.error('Disconnect failed', err));
});
elements.changeAccess.addEventListener('click', () => {
  setAccessFormOpen(true);
});
elements.languageSelect.addEventListener('change', async event => {
  const value = event.target.value;
  currentLang = value;
  await browser.storage.local.set({ language: value });
  applyTranslations();
  await refreshLocations(elements.locationSelect.value);
  await refreshStatus();
});
elements.openSettings.addEventListener('click', () => {
  if (browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage();
  } else {
    browser.tabs.create({ url: browser.runtime.getURL('options.html') });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => console.error('Failed to initialise popup', err));
});
// Updated: 2025-10-01
