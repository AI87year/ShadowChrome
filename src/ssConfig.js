import { parseAccessKey, ServiceConfigType } from '../third_party/jigsaw-code/outlineAccessKey.js';
import { isSupportedCipher } from './integrations/shadowsocksCiphers.js';
import logger from './logger.js';
import { readServerPassword } from './utils/readPassword.js';

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
    tag = decodeURIComponent(rest.substring(hashIndex + 1));
    rest = rest.substring(0, hashIndex);
  }
  let decoded;
  try {
    decoded = atob(rest);
  } catch {
    decoded = rest;
  }
  if (/^(https?:\/\/|ssconf:\/\/)/.test(decoded)) {
    const onlineUrl = decoded.startsWith('ssconf://')
      ? decoded.replace(/^ssconf:\/\//, 'https://')
      : decoded;
    return fetchConfig(onlineUrl);
  }
  const [methodPwd, hostPort] = decoded.split('@');
  const [method, password] = methodPwd.split(':');
  const [host, port] = hostPort.split(':');
  let pwd = password;
  if (!pwd) {
    pwd = await readServerPassword(host);
  }
  const cfg = {
    method,
    password: pwd,
    host,
    port: parseInt(port, 10),
    tag: tag || defaultTag || undefined
  };
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
  const res = await fetch(onlineUrl);
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
