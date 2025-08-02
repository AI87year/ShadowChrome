# ShadowChrome

ShadowChrome is a Chrome extension that aims to provide a fully self-contained Shadowsocks client. Users supply an `ss://` or `ssconf://` key and the extension fetches available server locations from the Shadowsocks network before handling the rest inside the browser.

> **Status:** The legacy Node.js helper server has been removed. The service worker parses configuration links and configures Chrome's proxy settings. Running the Shadowsocks client via `chrome.sockets` is still a TODO.

## Installation
1. Navigate to `chrome://extensions/` and enable **Developer mode**.
2. Click **Load unpacked** and choose the `src` directory.

## Usage
1. Click the ShadowChrome icon.
2. Paste an `ss://` or `ssconf://` access key. The extension will retrieve any advertised servers from the Shadowsocks network.
3. If multiple servers are returned, choose a location.
4. Press **Connect** to save the settings and set Chrome's proxy to `127.0.0.1:1080`.
5. Press **Disconnect** to clear the proxy configuration.

## Development
- All extension code resides in `src/`.
- Run `npm install` once to set up linting.
- Execute `npm run lint` to check code style.

## Architecture
- `popup.html` / `popup.js` provide a small HTML/CSS interface with optional location selection.
- `ssConfig.js` parses `ss://` and `ssconf://` URLs.
- `background.js` (service worker) applies proxy settings and will host the Shadowsocks client using `chrome.sockets`.

Detailed documentation is available in [`docs/DETAILED_DOCUMENTATION.md`](docs/DETAILED_DOCUMENTATION.md).

## License
[MIT](LICENSE).
