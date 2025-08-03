import { browser } from './browser-api.js';

export default class ServerClient {
  constructor(registry, mirrors = []) {
    this.registry = registry;
    this.mirrors = mirrors;
    this.alarmName = 'shadowchrome-sync';
  }

  async fetchFromMirrors(path) {
    for (const base of this.mirrors) {
      try {
        const resp = await fetch(base + path, { cache: 'no-store' });
        if (resp.ok) {
          return await resp.json();
        }
      } catch (e) {
        // ignore and continue
      }
    }
    throw new Error('All mirrors failed');
  }

  async updateRegistry() {
    try {
      const data = await this.fetchFromMirrors('/domains.json');
      if (Array.isArray(data)) {
        await this.registry.setDomains(data);
      }
    } catch (e) {
      console.warn('Registry update failed', e);
    }
  }

  async updateConfig() {
    try {
      const cfg = await this.fetchFromMirrors('/config.json');
      if (cfg && typeof cfg === 'object') {
        await browser.storage.local.set({ remoteConfig: cfg });
      }
    } catch (e) {
      console.warn('Config update failed', e);
    }
  }

  scheduleUpdates() {
    browser.alarms.create(this.alarmName, { periodInMinutes: 60 });
    browser.alarms.onAlarm.addListener(alarm => {
      if (alarm.name === this.alarmName) {
        this.updateRegistry();
        this.updateConfig();
      }
    });
  }
}
