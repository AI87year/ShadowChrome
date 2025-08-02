import { readServerPassword } from './utils/readPassword.js';

export async function parseAccessUrl(url) {
  if (url.startsWith('ssconf://')) {
    const onlineUrl = url.replace(/^ssconf:\/\//, 'https://');
    return fetchConfig(onlineUrl);
  }
  if (url.startsWith('ss://')) {
    return parseSsUrl(url);
  }
  throw new Error('Unsupported access url');
}

export async function parseSsUrl(url) {
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
  } catch (e) {
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
  const cfg = { method, password: pwd, host, port: parseInt(port, 10) };
  if (tag) {
    cfg.tag = tag;
  }
  return cfg;
}

async function fetchConfig(onlineUrl) {
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
  } catch (e) {
    // not base64, ignore
  }
  if (text.startsWith('ss://') || text.includes('ss://')) {
    const urls = text.split(/\s+/).filter((u) => u.startsWith('ss://'));
    const results = [];
    for (const u of urls) {
      const parsed = await parseSsUrl(u);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
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
            results.push(p);
          });
        } else {
          if (entry.tag || entry.name) {
            parsed.tag = entry.tag || entry.name;
          }
          results.push(parsed);
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
        results.push(parsed);
      }
    }
    return results;
  }
  if (obj.accessUrl) {
    return parseAccessUrl(obj.accessUrl);
  }
  throw new Error('Invalid config response');
}
