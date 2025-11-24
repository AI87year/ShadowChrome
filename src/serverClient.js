import { browser } from './browser-api.js';
import { fetchWithTimeout } from './utils/fetchWithTimeout.js';

// ServerClient fetches mirrored datasets (domains, configs) on a schedule. It
// encapsulates retry behaviour and metadata tagging so background.js can stay
// focused on the Shadowsocks client. Adjust mirror lists or Sheldu Socks
// backends here to keep network policy changes isolated from UI code.

export default class ServerClient {
  constructor(registry, mirrors = []) {
    this.registry = registry;
    this.mirrors = mirrors;
    this.alarmName = 'shadowchrome-sync';
  }

  async fetchFromMirrors(path, timeoutMs = 5000) {
    for (const base of this.mirrors) {
      const url = base + path;
      try {
        const resp = await fetchWithTimeout(url, {
          timeout: timeoutMs,
          message: `Request to ${base} timed out`,
          cache: 'no-store'
        });
        if (resp.ok) {
          const data = await resp.json();
          return { data, url, source: base };
        }
      } catch {
        // ignore and continue
      }
    }
    throw new Error('All mirrors failed');
  }

  async updateRegistry() {
    try {
      const payload = await this.fetchFromMirrors('/domains.json');
      if (payload && Array.isArray(payload.data)) {
        await this.registry.setDomains(payload.data, {
          source: payload.source,
          endpoint: payload.url
        });
      }
    } catch (e) {
      console.warn('Registry update failed', e);
    }
  }

  async updateConfig() {
    try {
      const payload = await this.fetchFromMirrors('/config.json');
      if (payload && payload.data && typeof payload.data === 'object') {
        await browser.storage.local.set({
          remoteConfig: {
            ...payload.data,
            _source: payload.source,
            _endpoint: payload.url
          }
        });
      }
    } catch (e) {
      console.warn('Config update failed', e);
    }
  }

  async syncAll() {
    await Promise.all([this.updateRegistry(), this.updateConfig()]);
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
// Updated: 2025-11-17
