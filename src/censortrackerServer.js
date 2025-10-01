import { browser } from './browser-api.js';
import logger from './logger.js';
import { parseAccessUrl } from './ssConfig.js';

const CONFIG_ENDPOINTS = [
  {
    name: 'GitHub',
    url: 'https://raw.githubusercontent.com/censortracker/ctconf/main/config.json'
  },
  {
    name: 'jsDelivr',
    url: 'https://cdn.jsdelivr.net/gh/censortracker/ctconf/config.json'
  },
  {
    name: 'Google Cloud Storage',
    url: 'https://storage.googleapis.com/censortracker/config.json'
  }
];

const FALLBACK_COUNTRY_CODE = 'RU';
const ALARM_NAME = 'censortracker-sync';
const FALLBACK_STORAGE_KEY = 'censortrackerFallback';

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function inquireCountryCode(geoEndpoint, explicitRegion) {
  if (explicitRegion) {
    return explicitRegion;
  }
  if (!geoEndpoint) {
    return FALLBACK_COUNTRY_CODE;
  }
  try {
    const data = await fetchJson(geoEndpoint);
    if (data && data.countryCode) {
      return data.countryCode;
    }
  } catch (error) {
    logger.warn('GeoIP detection failed', error);
  }
  return FALLBACK_COUNTRY_CODE;
}

async function fetchCensortrackerConfig() {
  const { currentRegionCode = '' } = await browser.storage.local.get({ currentRegionCode: '' });
  for (const endpoint of CONFIG_ENDPOINTS) {
    try {
      const payload = await fetchJson(endpoint.url);
      const { meta = {}, data = [] } = payload || {};
      if (!Array.isArray(data) || data.length === 0) {
        logger.warn('Skipping config from %s: empty payload', endpoint.name);
        continue;
      }
      const countryCode = await inquireCountryCode(meta.geoIPServiceURL, currentRegionCode);
      const config = data.find(item => item && item.countryCode === countryCode) || data[0];
      if (!config) {
        logger.warn('No matching country config found for %s', endpoint.name);
        continue;
      }
      return {
        config,
        source: endpoint.name,
        endpoint: endpoint.url
      };
    } catch (error) {
      logger.warn('Failed to fetch CensorTracker config from %s', endpoint.name, error);
    }
  }
  return null;
}

async function fetchRegistryPayload(registryUrl, specifics = {}) {
  if (!registryUrl) {
    return { domains: [], disseminators: [] };
  }
  try {
    const domains = await fetchJson(registryUrl);
    let disseminators = [];
    if (specifics && specifics.cooperationRefusedORIUrl) {
      try {
        disseminators = await fetchJson(specifics.cooperationRefusedORIUrl);
      } catch (error) {
        logger.warn('Failed to fetch disseminator registry', error);
      }
    }
    return { domains, disseminators };
  } catch (error) {
    logger.error('Failed to fetch registry data', error);
    return { domains: [], disseminators: [] };
  }
}

async function fetchIgnoreList(ignoreUrl) {
  if (!ignoreUrl) {
    return [];
  }
  try {
    const ignore = await fetchJson(ignoreUrl);
    return Array.isArray(ignore) ? ignore : [];
  } catch (error) {
    logger.warn('Failed to fetch ignore list', error);
    return [];
  }
}

async function parseFallbackEntry(entry, defaultTag = 'CensorTracker') {
  if (!entry) {
    return [];
  }
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = await parseAccessUrl(trimmed);
      const configs = Array.isArray(parsed) ? parsed : [parsed];
      return configs.map(config => ({
        ...config,
        tag: config.tag || defaultTag
      }));
    } catch (error) {
      logger.warn('Failed to parse fallback entry URL', error);
      return [];
    }
  }
  const maybeUrl = entry.accessUrl || entry.url || entry.link;
  if (maybeUrl) {
    const overrideTag = entry.tag || entry.name || defaultTag;
    return parseFallbackEntry(maybeUrl, overrideTag);
  }
  const host = entry.host || entry.server || entry.hostname;
  const port = parseInt(entry.port || entry.server_port || entry.serverPort, 10);
  const method = entry.method || entry.cipher || entry.encryption;
  const password = entry.password || entry.pwd || entry.pass || entry.key;
  if (host && port && method && password) {
    const latency = typeof entry.latencyMs === 'number'
      ? entry.latencyMs
      : typeof entry.latency === 'number'
      ? entry.latency
      : null;
    const config = {
      method,
      password,
      host,
      port,
      tag: entry.tag || entry.name || defaultTag
    };
    if (Number.isFinite(latency)) {
      config.latencyMs = latency;
    }
    return [config];
  }
  return [];
}

async function normaliseFallbackServers(payload, defaultTag = 'CensorTracker') {
  if (!payload) {
    return [];
  }
  const results = [];
  const queue = [];
  if (Array.isArray(payload)) {
    queue.push(...payload);
  } else if (typeof payload === 'object') {
    if (Array.isArray(payload.accessKeys)) {
      queue.push(...payload.accessKeys);
    }
    if (Array.isArray(payload.servers)) {
      queue.push(...payload.servers);
    }
    if (payload.server || payload.accessUrl || payload.url) {
      queue.push(payload);
    }
  } else if (typeof payload === 'string') {
    queue.push(payload);
  }

  for (const item of queue) {
    try {
      const parsed = await parseFallbackEntry(item, defaultTag);
      results.push(...parsed);
    } catch (error) {
      logger.warn('Failed to convert fallback entry', error);
    }
  }

  const seen = new Set();
  return results.filter(server => {
    const key = `${server.method}:${server.password}@${server.host}:${server.port}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchFallbackServers(proxyUrl) {
  if (!proxyUrl) {
    return { servers: [], provider: null };
  }
  try {
    const payload = await fetchJson(proxyUrl);
    const provider = payload && typeof payload === 'object' && (payload.provider || payload.name)
      ? payload.provider || payload.name
      : null;
    const servers = await normaliseFallbackServers(payload, provider || 'CensorTracker');
    return { servers, provider };
  } catch (error) {
    logger.warn('Failed to fetch fallback proxy configuration', error);
    return { servers: [], provider: null };
  }
}

export async function getStoredCensorTrackerFallback() {
  const data = await browser.storage.local.get({ [FALLBACK_STORAGE_KEY]: null });
  return data[FALLBACK_STORAGE_KEY] || null;
}

export async function syncCensorTracker(registry) {
  const fetched = await fetchCensortrackerConfig();
  if (!fetched) {
    return { success: false };
  }
  const { config, source, endpoint } = fetched;
  const [registryPayload, ignoreList, fallback] = await Promise.all([
    fetchRegistryPayload(config.registryUrl, config.specifics || {}),
    fetchIgnoreList(config.ignoreUrl),
    fetchFallbackServers(config.proxyUrl)
  ]);

  const { domains = [], disseminators = [] } = registryPayload;
  const normalizedDomains = Array.isArray(domains) ? domains : [];
  await registry.setDomains(normalizedDomains, {
    source,
    endpoint,
    countryCode: config.countryCode || null
  });
  await registry.setDisseminators(Array.isArray(disseminators) ? disseminators : []);
  if (ignoreList.length) {
    await registry.mergeIgnoredHosts(ignoreList);
  }
  const fallbackRecord = {
    servers: fallback.servers || [],
    provider: fallback.provider || null,
    source,
    endpoint: config.proxyUrl || null,
    updatedAt: Date.now()
  };
  await browser.storage.local.set({ [FALLBACK_STORAGE_KEY]: fallbackRecord });
  return {
    success: true,
    source,
    endpoint,
    domainCount: normalizedDomains.length,
    fallbackServers: fallbackRecord.servers.length,
    fallbackProvider: fallbackRecord.provider
  };
}

export function scheduleCensorTrackerSync(registry) {
  browser.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === ALARM_NAME) {
      syncCensorTracker(registry).catch(error => {
        logger.warn('CensorTracker sync failed', error);
      });
    }
  });
  syncCensorTracker(registry).catch(error => {
    logger.warn('Initial CensorTracker sync failed', error);
  });
}

export { CONFIG_ENDPOINTS };
