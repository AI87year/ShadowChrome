import { browser } from './browser-api.js';
import Registry from './registry.js';
import logger from './logger.js';

const startTime = Date.now();
const registry = new Registry();

export async function collectDiagnostics() {
  const domains = await registry.getDomains();
  const { accessUrl } = await browser.storage.local.get('accessUrl');
  return {
    time: new Date().toISOString(),
    uptimeMs: Date.now() - startTime,
    accessUrl: accessUrl || null,
    domainCount: domains.length,
    logCount: logger.getLogs().length
  };
}
// Updated: 2025-11-17
