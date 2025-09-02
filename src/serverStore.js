import { browser } from './browser-api.js';

export default class ServerStore {
  constructor() {
    this.key = 'servers';
    this.listeners = new Set();
  }

  async list() {
    const data = await browser.storage.local.get({ [this.key]: [] });
    const list = Array.isArray(data[this.key]) ? data[this.key] : [];
    return list;
  }

  async save(list) {
    await browser.storage.local.set({ [this.key]: list });
    this.emit();
  }

  _makeId(server) {
    return `${server.method}:${server.password}@${server.host}:${server.port}`;
  }

  async add(server) {
    const list = await this.list();
    const id = server.id || this._makeId(server);
    server.id = id;
    if (!list.find(s => s.id === id)) {
      list.push(server);
      await this.save(list);
    }
    return list;
  }

  async remove(id) {
    const list = await this.list();
    const filtered = list.filter(s => s.id !== id);
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

