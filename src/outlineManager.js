import { browser } from './browser-api.js';
import { parseAccessUrl } from './ssConfig.js';
import { fetchWithTimeout } from './utils/fetchWithTimeout.js';

export default class OutlineManager {
  constructor(store) {
    this.store = store;
    this.key = 'outlineManagers';
    this.alarm = 'outline-sync';
  }

  async listManagers() {
    const data = await browser.storage.local.get({ [this.key]: [] });
    const list = Array.isArray(data[this.key]) ? data[this.key] : [];
    return list;
  }

  async saveManagers(list) {
    await browser.storage.local.set({ [this.key]: list });
  }

  async addManager(apiUrl, certSha256 = '') {
    const list = await this.listManagers();
    if (!list.find(m => m.apiUrl === apiUrl)) {
      list.push({ apiUrl, certSha256 });
      await this.saveManagers(list);
    }
    return list;
  }

  async removeManager(apiUrl) {
    let list = await this.listManagers();
    list = list.filter(m => m.apiUrl !== apiUrl);
    await this.saveManagers(list);
    return list;
  }

  async fetchAccessKeys(manager, timeoutMs = 5000) {
    const url = manager.apiUrl.replace(/\/$/, '') + '/access-keys/';
    const resp = await fetchWithTimeout(url, {
      timeout: timeoutMs,
      message: `Outline manager at ${manager.apiUrl} timed out`,
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('Failed to fetch access keys');
    const json = await resp.json();
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.accessKeys)) return json.accessKeys;
    return [];
  }

  async syncManager(manager) {
    const keys = await this.fetchAccessKeys(manager);
    for (const key of keys) {
      const accessUrl = key.accessUrl || key.accessKey || key.url;
      if (!accessUrl) continue;
      try {
        const parsed = await parseAccessUrl(accessUrl);
        const configs = Array.isArray(parsed) ? parsed : [parsed];
        for (const cfg of configs) {
          const server = {
            ...cfg,
            tag: key.name || cfg.tag,
            accessUrl,
            manager: manager.apiUrl
          };
          await this.store.add(server);
        }
      } catch (e) {
        console.warn('Failed to parse Outline key', e);
      }
    }
  }

  async syncAll() {
    const managers = await this.listManagers();
    for (const m of managers) {
      try {
        await this.syncManager(m);
      } catch (e) {
        console.warn('Outline manager sync failed', e);
      }
    }
  }

  scheduleSync() {
    browser.alarms.create(this.alarm, { periodInMinutes: 30 });
    browser.alarms.onAlarm.addListener(alarm => {
      if (alarm.name === this.alarm) {
        this.syncAll();
      }
    });
    this.syncAll();
  }
}

// Updated: 2025-11-13
