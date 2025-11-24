import { browser } from './browser-api.js';

// ServerStore is the canonical writer for chrome.storage.local.servers and
// related selectors. It normalizes identifiers and ports so the background
// worker can rely on consistent shapes regardless of whether entries were
// imported from Outline, Sheldu Socks mirrors, or manual forms.

export default class ServerStore {
  constructor() {
    this.key = 'servers';
    this.listeners = new Set();
  }

  async _getList() {
    const data = await browser.storage.local.get({ [this.key]: [] });
    return Array.isArray(data[this.key]) ? data[this.key] : [];
  }

  async list() {
    const list = await this._getList();
    return list.map(item => ({ ...item }));
  }

  async save(list) {
    const plain = list.map(item => ({ ...item }));
    await browser.storage.local.set({ [this.key]: plain });
    this.emit();
  }

  _makeId(server) {
    return `${server.method}:${server.password}@${server.host}:${server.port}`;
  }

  async add(server) {
    const list = await this._getList();
    const id = server.id || this._makeId(server);
    const entry = {
      ...server,
      id,
      port: Number(server.port),
      localPort: Number(server.localPort || 1080)
    };
    if (entry.accessUrl === undefined) {
      entry.accessUrl = '';
    }
    const existingIndex = list.findIndex(s => s.id === id);
    if (existingIndex === -1) {
      list.push(entry);
    } else {
      list[existingIndex] = { ...list[existingIndex], ...entry };
    }
    await this.save(list);
    return list;
  }

  async remove(id) {
    const list = await this._getList();
    const filtered = list.filter(s => s.id !== id);
    await this.save(filtered);
    return filtered;
  }

  async removeByManager(managerUrl) {
    if (!managerUrl) {
      return this.list();
    }
    const list = await this._getList();
    const filtered = list.filter(s => s.manager !== managerUrl);
    await this.save(filtered);
    return filtered;
  }

  async clear() {
    await this.save([]);
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
        console.error('ServerStore listener failed', e);
      }
    }
  }
}

// Updated: 2025-11-17
