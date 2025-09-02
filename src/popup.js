import { browser } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import Registry from './registry.js';
import ServerStore from './serverStore.js';

const registry = new Registry();
const serverStore = new ServerStore();
serverStore.onChange(() => {
  renderServers();
});
let parsedConfigs = null;
let currentLang = 'en';

const translations = {
  en: {
    language: 'Language',
    accessUrl: 'Access URL',
    accessUrlPlaceholder: 'ss:// or ssconf://',
    location: 'Location',
    connect: 'Connect',
    disconnect: 'Disconnect',
    sync: 'Sync',
    proxyDomains: 'Proxy Domains',
    addDomain: 'Add Domain',

    proxyRunning: 'Proxy running on 127.0.0.1:1080',
    error: 'Error: ',
    selectLocation: 'Select location and press Connect',
    failedStart: 'Failed to start proxy',
    stopping: 'Stopping...',
    proxyStopped: 'Proxy stopped',
    syncing: 'Syncing...',
    syncComplete: 'Sync complete',
    diagnostics: 'Diagnostics',
    collectingDiagnostics: 'Collecting diagnostics...',
    diagnosticsFailed: 'Diagnostics failed'
  },
  lv: {
    language: 'Valoda',
    accessUrl: 'Piekļuves URL',
    accessUrlPlaceholder: 'ss:// vai ssconf://',
    location: 'Atrašanās vieta',
    connect: 'Pievienoties',
    disconnect: 'Atvienoties',
    sync: 'Sinhronizēt',
    proxyDomains: 'Starpniekservera domēni',
    addDomain: 'Pievienot domēnu',

    proxyRunning: 'Starpniekserveris darbojas uz 127.0.0.1:1080',
    error: 'Kļūda: ',
    selectLocation: "Izvēlieties atrašanās vietu un nospiediet 'Pievienoties'",
    failedStart: 'Neizdevās startēt starpniekserveri',
    stopping: 'Apstādināšana...',
    proxyStopped: 'Starpniekserveris apstādināts',
    syncing: 'Sinhronizācija...',
    syncComplete: 'Sinhronizācija pabeigta',
    diagnostics: 'Diagnostika',
    collectingDiagnostics: 'Vāc diagnostiku...',
    diagnosticsFailed: 'Diagnostika neizdevās'
  },
  be: {
    language: 'Мова',
    accessUrl: 'Адрас доступу',
    accessUrlPlaceholder: 'ss:// або ssconf://',
    location: 'Месцазнаходжанне',
    connect: 'Падключыць',
    disconnect: 'Адключыць',
    sync: 'Сінхранізаваць',
    proxyDomains: 'Дамены праксі',
    addDomain: 'Дадаць дамен',

    proxyRunning: 'Праксі працуе на 127.0.0.1:1080',
    error: 'Памылка: ',
    selectLocation: 'Выберыце месцазнаходжанне і націсніце "Падключыць"',
    failedStart: 'Не атрымалася запусціць праксі',
    stopping: 'Спыненне...',
    proxyStopped: 'Праксі спынены',
    syncing: 'Сінхранізацыя...',
    syncComplete: 'Сінхранізацыя завершана',
    diagnostics: 'Дыягностыка',
    collectingDiagnostics: 'Збор дыягностыкі...',
    diagnosticsFailed: 'Дыягностыка не ўдалася'
  },
  de: {
    language: 'Sprache',
    accessUrl: 'Zugriffs-URL',
    accessUrlPlaceholder: 'ss:// oder ssconf://',
    location: 'Standort',
    connect: 'Verbinden',
    disconnect: 'Trennen',
    sync: 'Synchronisieren',
    proxyDomains: 'Proxy-Domains',
    addDomain: 'Domain hinzufügen',

    proxyRunning: 'Proxy läuft auf 127.0.0.1:1080',
    error: 'Fehler: ',
    selectLocation: 'Standort wählen und auf "Verbinden" klicken',
    failedStart: 'Proxy konnte nicht gestartet werden',
    stopping: 'Wird gestoppt...',
    proxyStopped: 'Proxy gestoppt',
    syncing: 'Synchronisiere...',
    syncComplete: 'Synchronisierung abgeschlossen',
    diagnostics: 'Diagnose',
    collectingDiagnostics: 'Sammle Diagnose...',
    diagnosticsFailed: 'Diagnose fehlgeschlagen'
  },
  es: {
    language: 'Idioma',
    accessUrl: 'URL de acceso',
    accessUrlPlaceholder: 'ss:// o ssconf://',
    location: 'Ubicación',
    connect: 'Conectar',
    disconnect: 'Desconectar',
    sync: 'Sincronizar',
    proxyDomains: 'Dominios proxy',
    addDomain: 'Agregar dominio',

    proxyRunning: 'Proxy en ejecución en 127.0.0.1:1080',
    error: 'Error: ',
    selectLocation: 'Selecciona ubicación y pulsa Conectar',
    failedStart: 'No se pudo iniciar el proxy',
    stopping: 'Deteniendo...',
    proxyStopped: 'Proxy detenido',
    syncing: 'Sincronizando...',
    syncComplete: 'Sincronización completa',
    diagnostics: 'Diagnósticos',
    collectingDiagnostics: 'Recopilando diagnósticos...',
    diagnosticsFailed: 'Diagnósticos fallidos'
  },
  fr: {
    language: 'Langue',
    accessUrl: "URL d'accès",
    accessUrlPlaceholder: 'ss:// ou ssconf://',
    location: 'Emplacement',
    connect: 'Connecter',
    disconnect: 'Déconnecter',
    sync: 'Synchroniser',
    proxyDomains: 'Domaines proxy',
    addDomain: 'Ajouter domaine',

    proxyRunning: 'Proxy en cours sur 127.0.0.1:1080',
    error: 'Erreur: ',
    selectLocation: 'Choisissez un emplacement et cliquez sur Connecter',
    failedStart: 'Échec du démarrage du proxy',
    stopping: 'Arrêt...',
    proxyStopped: 'Proxy arrêté',
    syncing: 'Synchronisation...',
    syncComplete: 'Synchronisation terminée',
    diagnostics: 'Diagnostics',
    collectingDiagnostics: 'Collecte des diagnostics...',
    diagnosticsFailed: 'Échec des diagnostics'
  },
  ru: {
    language: 'Язык',
    accessUrl: 'URL доступа',
    accessUrlPlaceholder: 'ss:// или ssconf://',
    location: 'Расположение',
    connect: 'Подключить',
    disconnect: 'Отключить',
    sync: 'Синхронизировать',
    proxyDomains: 'Прокси домены',
    addDomain: 'Добавить домен',

    proxyRunning: 'Прокси работает на 127.0.0.1:1080',
    error: 'Ошибка: ',
    selectLocation: 'Выберите расположение и нажмите Подключить',
    failedStart: 'Не удалось запустить прокси',
    stopping: 'Остановка...',
    proxyStopped: 'Прокси остановлен',
    syncing: 'Синхронизация...',
    syncComplete: 'Синхронизация завершена',
    diagnostics: 'Диагностика',
    collectingDiagnostics: 'Сбор диагностики...',
    diagnosticsFailed: 'Сбой диагностики'
  }
};

function applyTranslations() {
  const t = translations[currentLang];
  document.getElementById('language-label-text').textContent = t.language;
  document.getElementById('url-label-text').textContent = t.accessUrl;
  document.getElementById('url').placeholder = t.accessUrlPlaceholder;
  document.getElementById('location-label-text').textContent = t.location;
  document.getElementById('connect').textContent = t.connect;
  document.getElementById('disconnect').textContent = t.disconnect;
  document.getElementById('sync').textContent = t.sync;
  document.getElementById('diagnostics-btn').textContent = t.diagnostics;
  document.getElementById('domains-title').textContent = t.proxyDomains;
  document.getElementById('add-domain').textContent = t.addDomain;
  document.getElementById('domain-input').placeholder = t.domainPlaceholder;
  document.getElementById('servers-title').textContent = t.savedServers;

}

async function loadConfig() {
  const cfg = await browser.storage.local.get(['accessUrl', 'language']);
  if (cfg.accessUrl) {
    document.getElementById('url').value = cfg.accessUrl;
  }
  if (cfg.language && translations[cfg.language]) {
    currentLang = cfg.language;
    document.getElementById('language').value = currentLang;
  }
  applyTranslations();
  renderDomains();
  renderServers();

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

async function renderServers() {
  const list = await serverStore.list();
  const ul = document.getElementById('server-list');
  ul.innerHTML = '';
  list.forEach(s => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = s.tag || `${s.host}:${s.port}`;
    const useBtn = document.createElement('button');
    useBtn.textContent = translations[currentLang].use;
    useBtn.addEventListener('click', () => {
      connectToServer(s);
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', async () => {
      await serverStore.remove(s.id);
      renderServers();
    });
    li.appendChild(name);
    li.appendChild(useBtn);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });
}

function connectToServer(server) {
  const status = document.getElementById('status');
  status.textContent = translations[currentLang].startingProxy;
  const finalCfg = { ...server, localPort: 1080 };
  browser.storage.local.set({ ...finalCfg, accessUrl: server.accessUrl || '' });
  browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, response => {
    if (response && response.success) {
      status.textContent = translations[currentLang].proxyRunning;
    } else {
      status.textContent = translations[currentLang].error + (response && response.error);
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

document.getElementById('language').addEventListener('change', (e) => {
  const lang = e.target.value;
  if (translations[lang]) {
    currentLang = lang;
    browser.storage.local.set({ language: lang });
    applyTranslations();
    renderServers();

  }
});

document.getElementById('connect').addEventListener('click', async () => {
  const url = document.getElementById('url').value.trim();
  const status = document.getElementById('status');
  const locSelect = document.getElementById('location');
  status.textContent = translations[currentLang].startingProxy;
  try {
    if (parsedConfigs && Array.isArray(parsedConfigs)) {
      const chosen = parsedConfigs[parseInt(locSelect.value, 10)];
      const finalCfg = { ...chosen, localPort: 1080, accessUrl: url };
      browser.storage.local.set(finalCfg);
      await serverStore.add(finalCfg);
      renderServers();
      browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
        if (response && response.success) {
          status.textContent = translations[currentLang].proxyRunning;
        } else {
          status.textContent = translations[currentLang].error + (response && response.error);
        }
      });
      return;
    }

    const cfg = await parseAccessUrl(url);
    if (Array.isArray(cfg)) {
      parsedConfigs = cfg;
      showLocations(cfg);
      status.textContent = translations[currentLang].selectLocation;
      return;
    }
    const finalCfg = { ...cfg, localPort: 1080, accessUrl: url };
    browser.storage.local.set(finalCfg);
    await serverStore.add(finalCfg);
    renderServers();
    browser.runtime.sendMessage({ type: 'start-proxy', config: finalCfg }, (response) => {
      if (response && response.success) {
        status.textContent = translations[currentLang].proxyRunning;
      } else {
        status.textContent = translations[currentLang].error + (response && response.error);
      }
    });
  } catch {
    status.textContent = translations[currentLang].failedStart;
  }
});

document.getElementById('disconnect').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = translations[currentLang].stopping;
  browser.runtime.sendMessage({ type: 'stop-proxy' }, () => {
    status.textContent = translations[currentLang].proxyStopped;
  });
});

document.getElementById('sync').addEventListener('click', () => {
  const status = document.getElementById('status');
  status.textContent = translations[currentLang].syncing;
  browser.runtime.sendMessage({ type: 'sync' }, response => {
    if (!response || !response.success) {
      status.textContent =
        translations[currentLang].error + (response && response.error);
      return;
    }
    browser.runtime.sendMessage({ type: 'sync-outline' }, resp2 => {
      if (resp2 && resp2.success) {
        status.textContent = translations[currentLang].syncComplete;
        renderServers();
      } else {
        status.textContent =
          translations[currentLang].error + (resp2 && resp2.error);
      }
    });
  });
});

document.getElementById('diagnostics-btn').addEventListener('click', () => {
  const output = document.getElementById('diagnostics-output');
  output.textContent = translations[currentLang].collectingDiagnostics;
  browser.runtime.sendMessage({ type: 'get-diagnostics' }, response => {
    if (response && response.success) {
      output.textContent = JSON.stringify(response.data, null, 2);
    } else {
      output.textContent = translations[currentLang].diagnosticsFailed;
    }
  });
});

document.getElementById('add-domain').addEventListener('click', async () => {
  const input = document.getElementById('domain-input');
  await registry.addDomain(input.value);
  input.value = '';
  renderDomains();
});

document.getElementById('add-manager').addEventListener('click', async () => {
  const url = document.getElementById('manager-url').value.trim();
  const cert = document.getElementById('manager-cert').value.trim();
  if (url) {
    await browser.runtime.sendMessage({
      type: 'add-outline-manager',
      apiUrl: url,
      certSha256: cert
    });
    document.getElementById('manager-url').value = '';
    document.getElementById('manager-cert').value = '';
    await browser.runtime.sendMessage({ type: 'sync-outline' });
    renderManagers();
    renderServers();
  }
});
