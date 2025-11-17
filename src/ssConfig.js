import { parseAccessKey, ServiceConfigType } from '../third_party/jigsaw-code/outlineAccessKey.js';
import { isSupportedCipher } from './integrations/shadowsocksCiphers.js';
import logger from './logger.js';
import { readServerPassword } from './utils/readPassword.js';
import { fetchWithTimeout } from './utils/fetchWithTimeout.js';

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normaliseBase64(value) {
  const replaced = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = replaced.length % 4 === 0 ? '' : '='.repeat(4 - (replaced.length % 4));
  return replaced + padding;
}

function tryDecodeBase64(value) {
  try {
    return atob(normaliseBase64(value));
  } catch {
    return null;
  }
}

function extractPlugin(query) {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams(query);
  const plugin = params.get('plugin');
  return plugin ? safeDecodeURIComponent(plugin.trim()) : '';
}

function parseHostPort(segment) {
  const trimmed = segment.trim();
  if (!trimmed) {
    throw new Error('Invalid ss url: missing host');
  }
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    if (end === -1) {
      throw new Error('Invalid ss url: malformed IPv6 address');
    }
    const host = trimmed.slice(1, end);
    const after = trimmed.slice(end + 1);
    const portPart = after.startsWith(':') ? after.slice(1) : after;
    const port = parseInt(portPart, 10);
    if (!Number.isFinite(port)) {
      throw new Error('Invalid ss url: missing port');
    }
    return { host: safeDecodeURIComponent(host), port };
  }
  const lastColon = trimmed.lastIndexOf(':');
  if (lastColon === -1) {
    throw new Error('Invalid ss url: missing port');
  }
  const host = trimmed.slice(0, lastColon);
  const port = parseInt(trimmed.slice(lastColon + 1), 10);
  if (!Number.isFinite(port)) {
    throw new Error('Invalid ss url: missing port');
  }
  return { host: safeDecodeURIComponent(host), port };
}

export async function parseAccessUrl(url) {
  let parsedKey;
  try {
    parsedKey = parseAccessKey(url);
  } catch (error) {
    if (url.startsWith('ssconf://')) {
      const onlineUrl = url.replace(/^ssconf:\/\//, 'https://');
      return fetchConfig(onlineUrl);
    }
    if (/^https?:\/\//.test(url)) {
      return fetchConfig(url);
    }
    throw error;
  }

  if (parsedKey.type === ServiceConfigType.STATIC) {
    return parseSsUrl(parsedKey.accessUrl, parsedKey.name || undefined);
  }
  if (parsedKey.type === ServiceConfigType.DYNAMIC) {
    return fetchConfig(parsedKey.transportConfigLocation.toString(), parsedKey.name || undefined);
  }
  throw new Error('Unsupported access url');
}

export async function parseSsUrl(url, defaultTag) {
  if (!url.startsWith('ss://')) {
    throw new Error('Invalid ss url');
  }
  let rest = url.slice(5);
  let tag;
  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    tag = safeDecodeURIComponent(rest.substring(hashIndex + 1));
    rest = rest.substring(0, hashIndex);
  }

  let plugin = '';
  const queryIndex = rest.indexOf('?');
  if (queryIndex !== -1) {
    plugin = extractPlugin(rest.substring(queryIndex + 1));
    rest = rest.substring(0, queryIndex);
  }

  const maybeDecoded = tryDecodeBase64(rest);
  if (maybeDecoded !== null) {
    rest = maybeDecoded;
  } else {
    rest = safeDecodeURIComponent(rest);
  }

  if (/^(https?:\/\/|ssconf:\/\/)/.test(rest)) {
    const onlineUrl = rest.startsWith('ssconf://')
      ? rest.replace(/^ssconf:\/\//, 'https://')
      : rest;
    return fetchConfig(onlineUrl);
  }

  const decodedQueryIndex = rest.indexOf('?');
  if (decodedQueryIndex !== -1) {
    const innerQuery = rest.substring(decodedQueryIndex + 1);
    rest = rest.substring(0, decodedQueryIndex);
    const innerPlugin = extractPlugin(innerQuery);
    if (innerPlugin) {
      plugin = innerPlugin;
    }
  }

  const atIndex = rest.lastIndexOf('@');
  if (atIndex === -1) {
    throw new Error('Invalid ss url: missing credentials separator');
  }
  const credentials = rest.substring(0, atIndex);
  const serverPart = rest.substring(atIndex + 1);
  const methodIndex = credentials.indexOf(':');
  if (methodIndex === -1) {
    throw new Error('Invalid ss url: missing cipher or password');
  }
  const method = safeDecodeURIComponent(credentials.substring(0, methodIndex).trim());
  let password = credentials.substring(methodIndex + 1);
  password = safeDecodeURIComponent(password);

  const { host, port } = parseHostPort(serverPart);

  if (!password) {
    password = await readServerPassword(host);
  }

  const cfg = {
    method,
    password,
    host,
    port,
    tag: tag || defaultTag || undefined
  };

  if (plugin) {
    cfg.plugin = plugin;
  }

  if (cfg.method && !isSupportedCipher(cfg.method)) {
    logger.warn('Parsed Shadowsocks cipher is not part of the canonical AEAD set', {
      method: cfg.method
    });
  }

  return cfg;
}

function applyDefaultTag(server, defaultTag) {
  if (!defaultTag || server.tag) {
    return server;
  }
  return { ...server, tag: defaultTag };
}

async function fetchConfig(onlineUrl, defaultTag) {
  const res = await fetchWithTimeout(onlineUrl, {
    timeout: 10000,
    message: `Fetching Shadowsocks config from ${onlineUrl} timed out`,
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Failed to fetch config');
  }
  let text = (await res.text()).trim();
  try {
    const maybe = atob(text);
    if (maybe.includes('ss://') || maybe.trim().startsWith('{') || maybe.trim().startsWith('[')) {
      text = maybe.trim();
    }
  } catch {
    // not base64, ignore
  }
  if (text.startsWith('ss://') || text.includes('ss://')) {
    const urls = text.split(/\s+/).filter(u => u.startsWith('ss://'));
    const results = [];
    for (const u of urls) {
      const parsed = await parseSsUrl(u, defaultTag);
      if (Array.isArray(parsed)) {
        results.push(...parsed.map(server => applyDefaultTag(server, defaultTag)));
      } else {
        results.push(applyDefaultTag(parsed, defaultTag));
      }
    }
    return results;
  }
  const obj = JSON.parse(text);
  const list = Array.isArray(obj) ? obj : obj.servers || obj.configs;
  if (Array.isArray(list)) {
    const results = [];
    for (const entry of list) {
      if (entry.accessUrl) {
        const parsed = await parseAccessUrl(entry.accessUrl);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (entry.tag || entry.name) {
              p.tag = entry.tag || entry.name;
            }
            results.push(applyDefaultTag(p, defaultTag));
          });
        } else {
          if (entry.tag || entry.name) {
            parsed.tag = entry.tag || entry.name;
          }
          results.push(applyDefaultTag(parsed, defaultTag));
        }
      } else {
        const parsed = {
          method: entry.method,
          password: entry.password,
          host: entry.host,
          port: parseInt(entry.port, 10)
        };
        if (entry.tag || entry.name) {
          parsed.tag = entry.tag || entry.name;
        }
        results.push(applyDefaultTag(parsed, defaultTag));
      }
    }
    return results;
  }
  if (obj.accessUrl) {
    return parseAccessUrl(obj.accessUrl);
  }
  throw new Error('Invalid config response');
}
// Updated: 2025-11-13
