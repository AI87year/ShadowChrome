import { browser, isFirefox, isChrome } from './browser-api.js';
import { generatePac } from './pac.js';

export default class ProxyManager {
  constructor(registry) {
    this.registry = registry;
    this.currentPacUrl = null;
    this.enabled = false;
  }

  async enable(localPort) {
    const domains = await this.registry.getDomains();
    const pacScript = generatePac(domains, localPort);
    if (isFirefox && browser.proxy && browser.proxy.register) {
      await this._cleanupFirefoxPac();
      const blob = new Blob([pacScript], { type: 'application/x-ns-proxy-autoconfig' });
      const url = URL.createObjectURL(blob);
      await browser.proxy.register(url);
      this.currentPacUrl = url;
    } else if (isChrome) {
      await browser.proxy.settings.set({
        value: { mode: 'pac_script', pacScript: { data: pacScript } }
      });
    }
    this.enabled = true;
  }

  async disable() {
    if (isFirefox) {
      await this._cleanupFirefoxPac();
    } else if (isChrome) {
      await browser.proxy.settings.clear({});
    }
    this.enabled = false;
  }

  async refresh(localPort) {
    if (this.enabled) {
      await this.enable(localPort);
    }
  }

  async _cleanupFirefoxPac() {
    if (!isFirefox || !browser.proxy || !browser.proxy.unregister || !this.currentPacUrl) {
      return;
    }
    await browser.proxy.unregister(this.currentPacUrl);
    URL.revokeObjectURL(this.currentPacUrl);
    this.currentPacUrl = null;
  }
}
// Updated: 2025-11-17
