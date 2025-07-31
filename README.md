# ShadowChrome

This repository contains a Chrome extension and companion native messaging host implementing a Shadowsocks proxy for browser-only traffic. The extension allows importing Shadowsocks configuration keys, selecting available servers, and managing the connection from the popup UI.

## Structure

- `manifest.json` – Chrome extension manifest (Manifest V3).
- `popup.html`, `popup.js`, `popup.css` – Popup UI resources.
- `background.js` – Background service worker handling communication with the native host and proxy configuration.
- `native_host/` – Example Python implementation of the Chrome native messaging host.

## Native Host Setup

The Python host expects the `ss-local` executable from a Shadowsocks client to be installed and available in `PATH`. Register the host using the provided `shadowchrome_host.json` file and Chrome's native messaging manifest procedure.

When a connection is established the extension configures Chrome to use a local SOCKS5 proxy on `127.0.0.1:1080`. Disconnecting or logging out restores the previous proxy settings.

## Example Configuration Keys

```
ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:8388#ExampleServer
{"servers":[{"name":"Test","server":"example.com","port":8388,"method":"aes-256-gcm","password":"password"}]}
```

These are placeholders; replace them with real server information.

## Development

1. Load the extension unpacked in Chrome via **chrome://extensions**.
2. Register the native host (see `native_host/README.md`).
3. Open the extension popup, import a configuration key (supports `ss://`, `sconf://`, `ssconf://`, or `outline://`), and connect.

