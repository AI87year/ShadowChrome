import { browser } from './browser-api.js';

export default class Registry {
  constructor() {
    this.key = 'domainRegistry';
    this.listeners = new Set();
  }

  async getDomains() {
    const data = await browser.storage.local.get({ [this.key]: [] });
    const list = Array.isArray(data[this.key]) ? data[this.key] : [];
    return list;
  }

  async setDomains(domains) {
    await browser.storage.local.set({ [this.key]: domains });
    this.emit();
  }

  async addDomain(domain) {
    const normalized = domain.trim().toLowerCase();
    if (!normalized) return this.getDomains();
    const list = await this.getDomains();
    if (!list.includes(normalized)) {
      list.push(normalized);
      list.sort();
      await this.setDomains(list);
    }
    return list;
  }

  async removeDomain(domain) {
    const list = await this.getDomains();
    const filtered = list.filter(d => d !== domain);
    await this.setDomains(filtered);
    return filtered;
  }

  async clear() {
    await this.setDomains([]);
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
