export async function parseAccessUrl(url) {
  if (url.startsWith('ssconf://')) {
    const onlineUrl = url.replace(/^ssconf:\/\//, 'https://');
    const res = await fetch(onlineUrl);
    if (!res.ok) {
      throw new Error('Failed to fetch config');
    }
    let text = (await res.text()).trim();
    if (text.startsWith('ss://')) {
      return parseSsUrl(text);
    }
    const obj = JSON.parse(text);
    if (obj.accessUrl) {
      return parseSsUrl(obj.accessUrl);
    }
    throw new Error('Invalid config response');
  }
  return parseSsUrl(url);
}

export function parseSsUrl(url) {
  if (!url.startsWith('ss://')) {
    throw new Error('Invalid ss url');
  }
  let rest = url.slice(5);
  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    rest = rest.substring(0, hashIndex);
  }
  let decoded;
  try {
    decoded = atob(rest);
  } catch (e) {
    decoded = rest;
  }
  const [methodPwd, hostPort] = decoded.split('@');
  const [method, password] = methodPwd.split(':');
  const [host, port] = hostPort.split(':');
  return { method, password, host, port: parseInt(port, 10) };
}
