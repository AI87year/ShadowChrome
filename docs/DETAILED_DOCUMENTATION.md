# ShadowChrome — Detailed Documentation

## Goal
Create a Chrome extension that connects to a Shadowsocks proxy using only an `ss://` or `ssconf://` access key. All logic must live inside the extension; users should not run separate servers or binaries.

## Current Status
- The legacy Node.js helper has been removed.
- The popup UI stores user input and asks the background service worker to start or stop the proxy.
- The service worker configures Chrome's proxy settings but the actual Shadowsocks client implementation is still pending. It will eventually run through the `chrome.sockets` API.

## Code Layout
```
src/
├─ background.js      # Service worker controlling proxy settings
├─ manifest.json      # Extension manifest (MV3)
├─ popup.html         # User interface (HTML + CSS)
├─ popup.js           # Popup logic and messaging with the worker
└─ ssConfig.js        # Parser for ss:// and ssconf:// URLs
third_party/
├─ encryptsocks       # Prebuilt Shadowsocks tools (not yet integrated)
└─ outline-shadowsocksconfig # URL parsing helpers
```

### `popup.html` / `popup.js`
Provides a small HTML interface styled entirely with CSS. Users paste an access URL and, if multiple servers are offered, select a location. When **Connect** is pressed the popup calls `parseAccessUrl()` and sends the resulting configuration to the background script.

### `ssConfig.js`
Exports two helpers:
- `parseAccessUrl(url)` – accepts both `ss://` and `ssconf://` schemes. If the link points to an online subscription the remote document is fetched (via HTTPS) and parsed, returning every advertised server and its tag.
- `parseSsUrl(url)` – decodes an `ss://` link into `{method, password, host, port}` and preserves the optional `#tag` suffix as `tag`.

### `background.js`
Listens for messages from the popup. On `start-proxy` it stores the configuration and sets Chrome's proxy settings to `socks5://127.0.0.1:<localPort>`. On `stop-proxy` it clears the proxy configuration. The TODO section is where the Shadowsocks client will be started and stopped using `chrome.sockets`.

## Running the Extension
1. Enable Developer mode at `chrome://extensions/`.
2. Load the `src` directory as an unpacked extension.
3. Open the popup, enter your access key, pick a location if prompted, and click **Connect**.
4. Chrome's proxy settings will point to `127.0.0.1:1080`.

## Future Work
- Implement the Shadowsocks client inside `background.js` using JavaScript or WebAssembly and `chrome.sockets`.
- Improve error handling and status reporting in the UI.
- Add unit tests and integrate third_party components.

## License
See [LICENSE](../LICENSE).
