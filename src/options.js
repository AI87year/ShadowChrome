import { browser, isStub } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import Registry from './registry.js';
import ServerStore from './serverStore.js';
import { getTranslation, defaultLanguage, languageOptions } from './i18n.js';

const registry = new Registry();
const serverStore = new ServerStore();

let currentLang = defaultLanguage;
let cachedServers = [];
let cachedManagers = [];

const PREVIEW_ERROR = { success: false, error: 'preview-mode-unavailable' };

const elements = {
  settingsTitle: document.getElementById('settings-title'),
  languageSectionTitle: document.getElementById('language-section-title'),
  languageSectionDescription: document.getElementById('language-section-description'),
  languageLabel: document.getElementById('language-label'),
  languageSelect: document.getElementById('language-select'),
  languageHelpSummary: document.getElementById('language-help-summary'),
  languageHelpText: document.getElementById('language-help-text'),
  accessSectionTitle: document.getElementById('access-section-title'),
  accessSectionDescription: document.getElementById('access-section-description'),
  accessUrlLabel: document.getElementById('access-url-label'),
  accessUrlInput: document.getElementById('access-url'),
  importAccess: document.getElementById('import-access'),
  clearAccess: document.getElementById('clear-access'),
  accessStatus: document.getElementById('access-status'),
  accessHelpSummary: document.getElementById('access-help-summary'),
  accessHelpText: document.getElementById('access-help-text'),
  domainsTitle: document.getElementById('domains-title'),
  domainSectionDescription: document.getElementById('domain-section-description'),
  registryToggleLabel: document.getElementById('registry-enabled-label'),
  registryToggle: document.getElementById('registry-enabled'),
  registryMeta: document.getElementById('registry-meta'),
  domainInputLabel: document.getElementById('domain-input-label'),
  domainInput: document.getElementById('domain-input'),
  addDomain: document.getElementById('add-domain'),
  domainsEmpty: document.getElementById('domains-empty'),
  domainList: document.getElementById('domain-list'),
  domainsHelpSummary: document.getElementById('domains-help-summary'),
  domainsHelpText: document.getElementById('domains-help-text'),
  ignoredTitle: document.getElementById('ignored-title'),
  ignoredSectionDescription: document.getElementById('ignored-section-description'),
  ignoredInputLabel: document.getElementById('ignored-input-label'),
  ignoredInput: document.getElementById('ignored-input'),
  addIgnored: document.getElementById('add-ignored'),
  ignoredEmpty: document.getElementById('ignored-empty'),
  ignoredList: document.getElementById('ignored-list'),
  ignoredHelpSummary: document.getElementById('ignored-help-summary'),
  ignoredHelpText: document.getElementById('ignored-help-text'),
  serversTitle: document.getElementById('servers-title'),
  savedServersDescription: document.getElementById('saved-servers-description'),
  serversEmpty: document.getElementById('servers-empty'),
  serverList: document.getElementById('server-list'),
  serversHelpSummary: document.getElementById('servers-help-summary'),
  serversHelpText: document.getElementById('servers-help-text'),
  managersTitle: document.getElementById('managers-title'),
  managersDescription: document.getElementById('managers-section-description'),
  managerUrlLabel: document.getElementById('manager-url-label-text'),
  managerCertLabel: document.getElementById('manager-cert-label-text'),
  managerUrlInput: document.getElementById('manager-url'),
  managerCertInput: document.getElementById('manager-cert'),
  addManager: document.getElementById('add-manager'),
  managersNote: document.getElementById('managers-note'),
  managersEmpty: document.getElementById('managers-empty'),
  managerList: document.getElementById('manager-list'),
  managersHelpSummary: document.getElementById('managers-help-summary'),
  managersHelpText: document.getElementById('managers-help-text'),
  syncSectionTitle: document.getElementById('sync-section-title'),
  syncSectionDescription: document.getElementById('sync-section-description'),
  syncButton: document.getElementById('sync'),
  status: document.getElementById('status'),
  diagnosticsSectionTitle: document.getElementById('diagnostics-section-title'),
  diagnosticsDescription: document.getElementById('diagnostics-description'),
  diagnosticsButton: document.getElementById('diagnostics-btn'),
  diagnosticsOutput: document.getElementById('diagnostics-output'),
  diagnosticsHelpSummary: document.getElementById('diagnostics-help-summary'),
  diagnosticsHelpText: document.getElementById('diagnostics-help-text')
};

serverStore.onChange(() => {
  renderServers().catch(err => console.error('Failed to render servers', err));
});

function t() {
  return getTranslation(currentLang);
}

function applyTranslations() {
  const tr = t();
  elements.settingsTitle.textContent = tr.settingsTitle || 'ShadowChrome settings';
  elements.languageSectionTitle.textContent = tr.languageSectionTitle || tr.language;
  elements.languageSectionDescription.textContent = tr.languageSectionDescription || '';
  elements.languageLabel.textContent = tr.language;
  elements.accessSectionTitle.textContent = tr.accessSectionTitle || tr.accessUrl;
  elements.accessSectionDescription.textContent = tr.accessSectionDescription || '';
  elements.accessUrlLabel.textContent = tr.accessUrl;
  elements.accessUrlInput.placeholder = tr.accessUrlPlaceholder;
  elements.importAccess.textContent = tr.accessSectionButton || tr.saveAccessKey || tr.sync;
  elements.clearAccess.textContent = tr.resetAccessData || 'Remove saved servers';
  elements.domainsTitle.textContent = tr.proxyDomains;
  elements.domainSectionDescription.textContent = tr.domainSectionDescription || '';
  elements.registryToggleLabel.textContent = tr.registryEnabled;
  elements.domainInputLabel.textContent = tr.domainLabel;
  elements.domainInput.placeholder = tr.domainPlaceholder;
  elements.addDomain.textContent = tr.addDomain;
  elements.domainsEmpty.textContent = tr.noDomains;
  elements.ignoredTitle.textContent = tr.ignoredTitle;
  elements.ignoredSectionDescription.textContent = tr.ignoredSectionDescription || '';
  elements.ignoredInputLabel.textContent = tr.ignoredLabel;
  elements.ignoredInput.placeholder = tr.ignoredPlaceholder;
  elements.addIgnored.textContent = tr.addIgnored;
  elements.ignoredEmpty.textContent = tr.noIgnored;
  elements.serversTitle.textContent = tr.savedServers;
  elements.savedServersDescription.textContent = tr.savedServersDescription || '';
  elements.serversEmpty.textContent = tr.noServers;
  elements.managersTitle.textContent = tr.outlineManagers;
  elements.managersDescription.textContent = tr.managersSectionDescription || '';
  elements.managerUrlLabel.textContent = tr.managerUrlLabel;
  elements.managerCertLabel.textContent = tr.managerCertLabel;
  elements.managerUrlInput.placeholder = tr.managerUrlPlaceholder;
  elements.managerCertInput.placeholder = tr.managerCertPlaceholder;
  elements.addManager.textContent = tr.addManager;
  elements.managersNote.textContent = tr.managersNote;
  elements.managersEmpty.textContent = tr.noManagers;
  elements.syncSectionTitle.textContent = tr.syncSectionTitle || tr.sync;
  elements.syncSectionDescription.textContent = tr.syncSectionDescription || '';
  elements.syncButton.textContent = tr.sync;
  elements.diagnosticsSectionTitle.textContent = tr.diagnosticsSectionTitle || tr.diagnostics;
  elements.diagnosticsDescription.textContent = tr.diagnosticsDescription || '';
  elements.diagnosticsButton.textContent = tr.diagnostics;

  const learnMore = tr.learnMore || 'Learn more';
  const setHelp = (summaryEl, textEl, content) => {
    if (!summaryEl || !textEl) {
      return;
    }
    const details = summaryEl.parentElement;
    if (content) {
      summaryEl.textContent = learnMore;
      textEl.textContent = content;
      if (details) {
        details.style.display = 'block';
      }
    } else if (details) {
      details.style.display = 'none';
    }
  };

  setHelp(elements.languageHelpSummary, elements.languageHelpText, tr.languageHelp);
  setHelp(elements.accessHelpSummary, elements.accessHelpText, tr.accessHelp);
  setHelp(elements.domainsHelpSummary, elements.domainsHelpText, tr.domainsHelp);
  setHelp(elements.ignoredHelpSummary, elements.ignoredHelpText, tr.ignoredHelp);
  setHelp(elements.serversHelpSummary, elements.serversHelpText, tr.savedServersHelp);
  setHelp(elements.managersHelpSummary, elements.managersHelpText, tr.outlineManagersHelp);
  setHelp(elements.diagnosticsHelpSummary, elements.diagnosticsHelpText, tr.diagnosticsHelp);
}

function formatRegistryMeta(state) {
  const tr = t();
  if (!state.useRegistry) {
    return tr.registryDisabled;
  }
  const parts = [];
  if (state.lastRegistrySource) {
    parts.push(`${tr.registrySource} ${state.lastRegistrySource}`);
  }
  if (state.lastRegistryCountry) {
    parts.push(`${tr.registryCountry} ${state.lastRegistryCountry}`);
  }
  if (state.lastRegistryAt) {
    parts.push(new Date(state.lastRegistryAt).toLocaleString());
  }
  if (!parts.length) {
    return tr.registryMetaNever;
  }
  return parts.join(' • ');
}

async function renderDomains() {
  const state = await registry.getRegistryState();
  const tr = t();
  elements.registryToggle.checked = !!state.useRegistry;
  elements.registryMeta.textContent = formatRegistryMeta(state);

  const entries = state.entries || [];
  elements.domainList.innerHTML = '';
  if (!entries.length) {
    elements.domainsEmpty.style.display = 'block';
  } else {
    elements.domainsEmpty.style.display = 'none';
    entries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'item';
      const text = document.createElement('div');
      text.className = 'item-text';
      const title = document.createElement('strong');
      title.textContent = entry.domain;
      const source = document.createElement('span');
      source.textContent = entry.source === 'registry'
        ? tr.domainSourceRegistry
        : tr.domainSourceCustom;
      text.appendChild(title);
      text.appendChild(source);
      li.appendChild(text);
      if (entry.source === 'custom') {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'secondary small';
        removeBtn.textContent = tr.remove;
        removeBtn.addEventListener('click', async () => {
          await registry.removeDomain(entry.domain);
          await renderDomains();
        });
        li.appendChild(removeBtn);
      }
      elements.domainList.appendChild(li);
    });
  }

  const ignored = state.ignoredHosts || [];
  elements.ignoredList.innerHTML = '';
  if (!ignored.length) {
    elements.ignoredEmpty.style.display = 'block';
  } else {
    elements.ignoredEmpty.style.display = 'none';
    ignored.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'item';
      const text = document.createElement('div');
      text.className = 'item-text';
      const strong = document.createElement('strong');
      strong.textContent = domain;
      text.appendChild(strong);
      li.appendChild(text);
      const removeBtn = document.createElement('button');
      removeBtn.className = 'secondary small';
      removeBtn.textContent = tr.remove;
      removeBtn.addEventListener('click', async () => {
        await registry.removeIgnoredHost(domain);
        await renderDomains();
      });
      li.appendChild(removeBtn);
      elements.ignoredList.appendChild(li);
    });
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

async function renderServers() {
  cachedServers = await serverStore.list();
  elements.serverList.innerHTML = '';
  if (!cachedServers.length) {
    elements.serversEmpty.style.display = 'block';
    return;
  }
  elements.serversEmpty.style.display = 'none';
  const tr = t();
  cachedServers.forEach(server => {
    const li = document.createElement('li');
    const text = document.createElement('div');
    text.className = 'item-text';
    const title = document.createElement('strong');
    title.textContent = formatServerLabel(server);
    text.appendChild(title);
    if (server.manager) {
      const meta = document.createElement('span');
      meta.className = 'muted';
      meta.textContent = server.manager;
      text.appendChild(meta);
    }
    li.appendChild(text);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const useBtn = document.createElement('button');
    useBtn.className = 'small';
    useBtn.textContent = tr.use;
    useBtn.addEventListener('click', async () => {
      if (isStub) {
        elements.status.textContent = tr.previewModeNotice || '';
        return;
      }
      try {
        await connectToServer(server, server.accessUrl || '');
        elements.status.textContent = tr.proxyRunning.replace('{port}', server.localPort || 1080);
      } catch (error) {
        elements.status.textContent = tr.error + (error && error.message ? error.message : '');
      }
    });
    actions.appendChild(useBtn);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'secondary small';
    removeBtn.textContent = tr.remove;
    removeBtn.addEventListener('click', async () => {
      if (isStub) {
        elements.status.textContent = tr.previewModeNotice || '';
        return;
      }
      await serverStore.remove(server.id);
      await renderServers();
    });
    actions.appendChild(removeBtn);
    li.appendChild(actions);
    elements.serverList.appendChild(li);
  });
}

async function listManagers() {
  try {
    const response = await sendMessage({ type: 'list-outline-managers' });
    if (response && response.success) {
      cachedManagers = Array.isArray(response.list) ? response.list : [];
    } else {
      cachedManagers = [];
    }
  } catch (error) {
    console.error('Failed to list managers', error);
    cachedManagers = [];
  }
}

async function renderManagers() {
  await listManagers();
  elements.managerList.innerHTML = '';
  if (!cachedManagers.length) {
    elements.managersEmpty.style.display = 'block';
    return;
  }
  elements.managersEmpty.style.display = 'none';
  const tr = t();
  cachedManagers.forEach(manager => {
    const li = document.createElement('li');
    const text = document.createElement('div');
    text.className = 'item-text';
    const title = document.createElement('strong');
    title.textContent = manager.apiUrl;
    text.appendChild(title);
    if (manager.certSha256) {
      const meta = document.createElement('span');
      meta.className = 'muted';
      meta.textContent = manager.certSha256;
      text.appendChild(meta);
    }
    li.appendChild(text);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'secondary small';
    removeBtn.textContent = tr.remove;
    removeBtn.addEventListener('click', async () => {
      if (isStub) {
        elements.status.textContent = tr.previewModeNotice || '';
        return;
      }
      const resp = await sendMessage({ type: 'remove-outline-manager', apiUrl: manager.apiUrl });
      if (!resp || !resp.success) {
        elements.status.textContent = tr.error + (resp && resp.error ? resp.error : '');
        return;
      }
      await renderManagers();
      await renderServers();
    });
    li.appendChild(removeBtn);
    elements.managerList.appendChild(li);
  });
}

function getPreviewResponse(message) {
  switch (message.type) {
    case 'list-outline-managers':
      return { success: true, list: [] };
    case 'start-proxy':
    case 'remove-outline-manager':
    case 'add-outline-manager':
    case 'sync':
    case 'sync-outline':
    case 'sync-censortracker':
    case 'get-diagnostics':
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
    localPort: Number(config.localPort || 1080)
  };
}

async function connectToServer(serverConfig, urlForStorage = '') {
  const tr = t();
  if (isStub) {
    elements.status.textContent = tr.previewModeNotice || '';
    return;
  }
  const prepared = sanitiseConfig(serverConfig);
  elements.status.textContent = tr.startingProxy;
  try {
    await browser.storage.local.set({
      accessUrl: urlForStorage,
      lastConfig: prepared
    });
    await serverStore.add({
      ...serverConfig,
      ...prepared,
      accessUrl: urlForStorage
    });
    const response = await sendMessage({ type: 'start-proxy', config: prepared });
    if (response && response.success) {
      elements.status.textContent = tr.proxyRunning.replace('{port}', prepared.localPort);
      return;
    }
    throw new Error(response && response.error ? response.error : 'Unknown error');
  } catch (error) {
    elements.status.textContent = tr.error + (error && error.message ? error.message : '');
    throw error;
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
  const existing = await serverStore.list();
  const preserved = existing.filter(server => !server.accessUrl || server.accessUrl === url);
  await serverStore.save(preserved);
  for (const config of configs) {
    const id = buildServerId(config);
    await serverStore.add({
      ...config,
      id,
      accessUrl: url,
      localPort: config.localPort || 1080
    });
  }
  await browser.storage.local.set({ accessUrl: url });
  await renderServers();
}

async function handleImportAccess() {
  const url = elements.accessUrlInput.value.trim();
  const tr = t();
  if (!url) {
    elements.accessStatus.textContent = tr.error + tr.urlRequired;
    return;
  }
  elements.accessStatus.textContent = tr.syncing || '';
  try {
    await importAccessKey(url);
    elements.accessStatus.textContent = tr.accessKeySaved || tr.syncComplete || '';
  } catch (error) {
    elements.accessStatus.textContent = tr.error + (error && error.message ? error.message : '');
  }
}

async function handleClearAccess() {
  const servers = await serverStore.list();
  const preserved = servers.filter(server => !server.accessUrl);
  await serverStore.save(preserved);
  await browser.storage.local.remove('accessUrl');
  elements.accessStatus.textContent = t().accessKeyCleared || '';
  elements.accessUrlInput.value = '';
  await renderServers();
}

async function handleSync() {
  const tr = t();
  elements.status.textContent = tr.syncing;
  if (isStub) {
    elements.status.textContent = tr.previewModeNotice || '';
    return;
  }
  try {
    const syncResp = await sendMessage({ type: 'sync' });
    if (!syncResp || !syncResp.success) {
      throw new Error(syncResp && syncResp.error ? syncResp.error : 'Unknown error');
    }
    const outlineResp = await sendMessage({ type: 'sync-outline' });
    if (!outlineResp || !outlineResp.success) {
      throw new Error(outlineResp && outlineResp.error ? outlineResp.error : 'Unknown error');
    }
    const censorResp = await sendMessage({ type: 'sync-censortracker' });
    if (!censorResp || !censorResp.success) {
      throw new Error(censorResp && censorResp.error ? censorResp.error : 'Unknown error');
    }
    elements.status.textContent = tr.syncComplete;
    await renderDomains();
    await renderServers();
  } catch (error) {
    elements.status.textContent = tr.error + (error && error.message ? error.message : '');
  }
}

async function handleDiagnostics() {
  const tr = t();
  elements.diagnosticsOutput.textContent = tr.collectingDiagnostics;
  if (isStub) {
    elements.diagnosticsOutput.textContent = tr.previewModeNotice || '';
    return;
  }
  try {
    const response = await sendMessage({ type: 'get-diagnostics' });
    if (response && response.success) {
      elements.diagnosticsOutput.textContent = JSON.stringify(response.data, null, 2);
    } else {
      throw new Error(response && response.error ? response.error : 'Unknown error');
    }
  } catch (error) {
    console.error('Diagnostics request failed', error);
    elements.diagnosticsOutput.textContent = tr.diagnosticsFailed;
  }
}

function initLanguageSelect(selected) {
  elements.languageSelect.innerHTML = '';
  languageOptions.forEach(({ code, label }) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    elements.languageSelect.appendChild(option);
  });
  elements.languageSelect.value = selected;
}

async function init() {
  const stored = await browser.storage.local.get(['language', 'accessUrl']);
  currentLang = stored.language || defaultLanguage;
  applyTranslations();
  initLanguageSelect(currentLang);
  if (stored.accessUrl) {
    elements.accessUrlInput.value = stored.accessUrl;
  }
  await renderDomains();
  await renderServers();
  await renderManagers();
  if (isStub) {
    const tr = t();
    elements.status.textContent = tr.previewModeNotice || '';
    elements.diagnosticsOutput.textContent = tr.previewModeNotice || '';
  }
}

elements.languageSelect.addEventListener('change', async event => {
  const value = event.target.value;
  currentLang = value;
  await browser.storage.local.set({ language: value });
  applyTranslations();
  await renderDomains();
  await renderServers();
  await renderManagers();
});

elements.importAccess.addEventListener('click', () => {
  handleImportAccess().catch(err => console.error('Failed to import access key', err));
});

elements.clearAccess.addEventListener('click', () => {
  handleClearAccess().catch(err => console.error('Failed to clear access data', err));
});

elements.registryToggle.addEventListener('change', async event => {
  await registry.toggleRegistry(event.target.checked);
  await renderDomains();
});

elements.addDomain.addEventListener('click', async () => {
  const value = elements.domainInput.value.trim();
  if (!value) {
    return;
  }
  await registry.addDomain(value);
  elements.domainInput.value = '';
  await renderDomains();
});

elements.domainInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    elements.addDomain.click();
  }
});

elements.addIgnored.addEventListener('click', async () => {
  const value = elements.ignoredInput.value.trim();
  if (!value) {
    return;
  }
  await registry.mergeIgnoredHosts([value]);
  elements.ignoredInput.value = '';
  await renderDomains();
});

elements.ignoredInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    elements.addIgnored.click();
  }
});

elements.addManager.addEventListener('click', async () => {
  const url = elements.managerUrlInput.value.trim();
  const cert = elements.managerCertInput.value.trim();
  if (!url) {
    return;
  }
  const tr = t();
  elements.status.textContent = tr.syncing;
  if (isStub) {
    elements.status.textContent = tr.previewModeNotice || '';
    return;
  }
  try {
    const response = await sendMessage({
      type: 'add-outline-manager',
      apiUrl: url,
      certSha256: cert
    });
    if (!response || !response.success) {
      throw new Error(response && response.error ? response.error : 'Unknown error');
    }
    elements.managerUrlInput.value = '';
    elements.managerCertInput.value = '';
    elements.status.textContent = tr.syncComplete;
    await renderManagers();
    await renderServers();
  } catch (error) {
    elements.status.textContent = tr.error + (error && error.message ? error.message : '');
  }
});

elements.syncButton.addEventListener('click', () => {
  handleSync().catch(err => console.error('Sync failed', err));
});

elements.diagnosticsButton.addEventListener('click', () => {
  handleDiagnostics().catch(err => console.error('Diagnostics failed', err));
});

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => console.error('Failed to initialise options page', err));
});
// Updated: 2025-11-13
