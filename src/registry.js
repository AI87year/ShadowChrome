import { browser } from './browser-api.js';

// Registry mediates between bundled blocklists, custom overrides, and ignored
// hosts. It is the single source of truth for the PAC generator, so any future
// Sheldu Socks routing modes should plug into this class rather than writing
// directly to chrome.storage. All mutations trigger change listeners to keep
// the popup and service worker aligned.

const STATE_KEY = 'registryState';

function normaliseDomain(domain) {
  return domain.trim().toLowerCase();
}

export default class Registry {
  constructor() {
    this.key = 'domainRegistry';
    this.listeners = new Set();
  }

  async _loadState() {
    const data = await browser.storage.local.get({ [STATE_KEY]: {} });
    const state = data[STATE_KEY] && typeof data[STATE_KEY] === 'object' ? data[STATE_KEY] : {};
    return {
      useRegistry: state.useRegistry !== false,
      ignoredHosts: Array.isArray(state.ignoredHosts) ? state.ignoredHosts : [],
      customProxiedDomains: Array.isArray(state.customProxiedDomains)
        ? state.customProxiedDomains
        : [],
      disseminators: Array.isArray(state.disseminators) ? state.disseminators : [],
      lastRegistrySource: state.lastRegistrySource || null,
      lastRegistryEndpoint: state.lastRegistryEndpoint || null,
      lastRegistryCountry: state.lastRegistryCountry || null,
      lastRegistryAt: state.lastRegistryAt || 0
    };
  }

  async _saveState(next) {
    await browser.storage.local.set({ [STATE_KEY]: next });
    this.emit();
  }

  async _getBaseDomains() {
    const data = await browser.storage.local.get({ [this.key]: [] });
    const list = Array.isArray(data[this.key]) ? data[this.key] : [];
    return list;
  }

  async getDomainEntries() {
    const [base, state] = await Promise.all([this._getBaseDomains(), this._loadState()]);
    const entries = [];
    const ignored = new Set(state.ignoredHosts);
    if (state.useRegistry) {
      for (const domain of base) {
        if (!ignored.has(domain)) {
          entries.push({ domain, source: 'registry' });
        }
      }
    }
    for (const domain of state.customProxiedDomains) {
      if (!ignored.has(domain)) {
        entries.push({ domain, source: 'custom' });
      }
    }
    const seen = new Set();
    return entries.filter(entry => {
      if (seen.has(entry.domain)) {
        return false;
      }
      seen.add(entry.domain);
      return true;
    });
  }

  async getDomains() {
    const entries = await this.getDomainEntries();
    return entries.map(entry => entry.domain);
  }

  async getRegistryState() {
    const [entries, state] = await Promise.all([this.getDomainEntries(), this._loadState()]);
    return {
      useRegistry: state.useRegistry,
      ignoredHosts: [...state.ignoredHosts],
      customProxiedDomains: [...state.customProxiedDomains],
      disseminators: state.disseminators,
      lastRegistrySource: state.lastRegistrySource,
      lastRegistryEndpoint: state.lastRegistryEndpoint,
      lastRegistryCountry: state.lastRegistryCountry,
      lastRegistryAt: state.lastRegistryAt,
      domainCount: entries.length,
      entries
    };
  }

  async setDomains(domains, meta = {}) {
    const unique = Array.from(new Set(domains.map(normaliseDomain))).filter(Boolean);
    unique.sort();
    await browser.storage.local.set({ [this.key]: unique });
    const state = await this._loadState();
    const next = {
      ...state,
      lastRegistrySource: meta.source || state.lastRegistrySource,
      lastRegistryEndpoint: meta.endpoint || state.lastRegistryEndpoint,
      lastRegistryCountry: meta.countryCode || state.lastRegistryCountry,
      lastRegistryAt: Date.now()
    };
    await this._saveState(next);
  }

  async addDomain(domain) {
    const normalized = normaliseDomain(domain);
    if (!normalized) {
      return this.getDomains();
    }
    const state = await this._loadState();
    if (!state.customProxiedDomains.includes(normalized)) {
      state.customProxiedDomains.push(normalized);
      state.customProxiedDomains.sort();
      await this._saveState(state);
    }
    return this.getDomains();
  }

  async removeDomain(domain) {
    const normalized = normaliseDomain(domain);
    const state = await this._loadState();
    state.customProxiedDomains = state.customProxiedDomains.filter(d => d !== normalized);
    await this._saveState(state);
    return this.getDomains();
  }

  async setIgnoredHosts(hosts) {
    const state = await this._loadState();
    state.ignoredHosts = Array.from(new Set(hosts.map(normaliseDomain))).filter(Boolean);
    await this._saveState(state);
  }

  async mergeIgnoredHosts(hosts) {
    const state = await this._loadState();
    const merged = new Set(state.ignoredHosts);
    hosts.map(normaliseDomain).filter(Boolean).forEach(host => merged.add(host));
    state.ignoredHosts = Array.from(merged).sort();
    await this._saveState(state);
  }

  async removeIgnoredHost(domain) {
    const state = await this._loadState();
    const normalized = normaliseDomain(domain);
    state.ignoredHosts = state.ignoredHosts.filter(d => d !== normalized);
    await this._saveState(state);
  }

  async setDisseminators(list) {
    const state = await this._loadState();
    state.disseminators = Array.isArray(list) ? list : [];
    await this._saveState(state);
  }

  async getDisseminatorForDomain(domain) {
    const state = await this._loadState();
    const normalized = normaliseDomain(domain);
    return state.disseminators.find(item => item && normaliseDomain(item.url || '') === normalized) || null;
  }

  async toggleRegistry(enabled) {
    const state = await this._loadState();
    state.useRegistry = !!enabled;
    await this._saveState(state);
  }

  async clear() {
    await browser.storage.local.set({ [this.key]: [] });
    await this._saveState({
      useRegistry: true,
      ignoredHosts: [],
      customProxiedDomains: [],
      disseminators: [],
      lastRegistrySource: null,
      lastRegistryEndpoint: null,
      lastRegistryCountry: null,
      lastRegistryAt: 0
    });
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  offChange(fn) {
    this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (e) {
        console.error('Registry listener failed', e);
      }
    }
  }
}
// Updated: 2025-11-17
