export function generatePac(domains, port) {
  const sorted = [...domains].sort();
  const lines = [];
  lines.push('function FindProxyForURL(url, host) {');
  lines.push('  host = host.toLowerCase();');
  lines.push('  var list = [' + sorted.map(d => `'${d}'`).join(',') + '];');
  lines.push('  var left = 0;');
  lines.push('  var right = list.length - 1;');
  lines.push('  while (left <= right) {');
  lines.push('    var mid = (left + right) >> 1;');
  lines.push('    var d = list[mid];');
  lines.push('    if (host === d || host.slice(-d.length-1) === "." + d) {');
  lines.push(`      return "SOCKS5 127.0.0.1:${port}";`);
  lines.push('    }');
  lines.push('    if (host > d) left = mid + 1; else right = mid - 1;');
  lines.push('  }');
  lines.push('  if (shExpMatch(host, "*.onion") || shExpMatch(host, "*.i2p")) {');
  lines.push(`    return "SOCKS5 127.0.0.1:${port}";`);
  lines.push('  }');
  lines.push('  return "DIRECT";');
  lines.push('}');
  return lines.join('\n');
}
// Updated: 2025-10-01
