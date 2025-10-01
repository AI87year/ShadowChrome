// Derived from shadowsocks-rust's src/password.rs
// Licensed under the Apache License, Version 2.0.

/**
 * Read server password from environment variable SS_SERVER_PASSWORD or prompt the user.
 * @param {string} serverName
 * @returns {Promise<string>}
 */
export async function readServerPassword(serverName) {
  const envPwd = typeof process !== 'undefined' ? process.env.SS_SERVER_PASSWORD : null;
  if (envPwd) {
    console.debug(`got server ${serverName} password from environment variable SS_SERVER_PASSWORD`);
    return envPwd;
  }
  const pwd = typeof window !== 'undefined' ? window.prompt(`(${serverName}) Password:`) : null;
  if (pwd !== null && pwd !== '') {
    console.debug(`got server ${serverName} password from prompt`);
    return pwd;
  }
  throw new Error('no server password found');
}
// Updated: 2025-10-01
