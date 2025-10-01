import logger from './logger.js';
import { fetchWithTimeout } from './utils/fetchWithTimeout.js';

const REMOTE_URL = 'https://raw.githubusercontent.com/censortracker/censortracker/stable/src/shared/data/domains.json';

let bundled = null;

export async function loadBundledDomains() {
  if (bundled) return bundled;
  try {
    const url = new URL('./censortracker-domains.json', import.meta.url);
    const res = await fetchWithTimeout(url, {
      timeout: 5000,
      message: 'Loading bundled CensorTracker domains timed out',
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const domains = Array.isArray(data) ? data : data.domains || [];
    bundled = domains.map(d => d.toLowerCase());
    return bundled;
  } catch (e) {
    logger.error('Failed to load bundled domains', e);
    bundled = [];
    return bundled;
  }
}

export async function fetchRemoteDomains() {
  try {
    const res = await fetchWithTimeout(REMOTE_URL, {
      timeout: 8000,
      message: 'Fetching remote CensorTracker domains timed out',
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const domains = Array.isArray(data) ? data : data.domains || [];
    return domains.map(d => d.toLowerCase());
  } catch (e) {
    logger.error('Failed to fetch CensorTracker domains', e);
    return [];
  }
}
// Updated: 2025-10-01
