# ShadowChrome — Detailed Documentation

## Overview
ShadowChrome is a Chrome extension that runs a complete Shadowsocks client inside the browser. Users only provide an `ss://` or `ssconf://` URL and the extension takes care of parsing configuration, selecting servers, and setting Chrome’s proxy settings. The service worker implements the full protocol using the `chrome.sockets` API, so no native helper processes are required.

## Philosophy and Motivation
The project started as an exploration of how far the modern browser platform can be pushed in service of privacy. Traditional proxy clients often require installing privileged binaries, which can be intimidating or impossible in locked-down environments. ShadowChrome seeks to lower that barrier by delivering an auditable, source-available client that lives entirely within Chrome’s security sandbox. By leveraging the distributed Shadowsocks network, the extension aspires to provide a portable tool for bypassing censorship and fostering free access to information.

ShadowChrome is also authored by artificial intelligence. The extension embodies a zero‑coding concept in which comprehensive technical descriptions are transformed directly into functioning software, showcasing the potential for complex programs to be produced without manual coding.

Beyond the technical challenge, ShadowChrome embodies a philosophy of openness: every component is written in JavaScript and HTML, allowing curious users to inspect, modify, and rebuild the project without specialized toolchains. Transparency is viewed as a prerequisite for trust.

## Project Goals
- **Self-contained client.** Operate wholly within the MV3 environment so no native helpers or external daemons are needed, reducing attack surface and simplifying deployment.
- **Simple UX.** Users should only have to paste a URL and click connect; the extension performs all discovery and configuration internally.
- **Flexible configuration.** Accept both single-server links and subscription-style lists, allowing users to carry one link across devices and platforms.

## High-Level Workflow
1. **Popup initialization** – When the popup is opened, previously saved configuration is restored from `chrome.storage.local`.
2. **User input** – The user enters an access URL.
3. **Parsing** – `parseAccessUrl` determines whether the link is a direct `ss://` entry or a remote subscription (`ssconf://` or Base64/JSON). The function returns either a single configuration or an array of options.
4. **Location selection** – If multiple server options are returned, the popup shows a drop‑down for the user to select a location.
5. **Connecting** – The chosen configuration is augmented with a local SOCKS port (currently `1080`) and persisted to `chrome.storage.local`. The popup sends a `{type: 'start-proxy', config}` message to the background service worker.
6. **Proxy activation** – The service worker sets Chrome’s proxy settings to `socks5://127.0.0.1:<localPort>` and starts a local Shadowsocks client bound to that port.
7. **Disconnecting** – On request the service worker clears Chrome’s proxy settings and stops the client.

## Source Layout
```text
src/
├─ background.js      # Service worker controlling proxy settings and sockets client
├─ manifest.json      # MV3 manifest declaring permissions and background worker
├─ popup.html         # User interface markup
├─ popup.js           # UI logic and messaging with the worker
└─ ssConfig.js        # Parser for access URLs and remote subscriptions
```

## Module Details

### popup.html / popup.js
The popup contains:
- **URL input** (`#url`)
- **Location selector** (`#location`) hidden until multiple servers are available
- **Connect** (`#connect`) and **Disconnect** (`#disconnect`) buttons
- **Status label** (`#status`)

Key event handlers in `popup.js`:
- `DOMContentLoaded` → calls `loadConfig()` to prefill the URL box.
- `#url input` → resets cached results and hides the location selector.
- `#connect click` → orchestrates parsing and proxy start:
  - Calls `parseAccessUrl`.
  - Displays location selector if multiple configs.
  - Sends `start-proxy` message with chosen config.
- `#disconnect click` → sends `stop-proxy` message and updates status.

The popup never holds long‑running connections; all network operations occur in the background worker.

### ssConfig.js
Responsible for translating access URLs into internal configuration objects:

#### parseAccessUrl(url)
```text
if url starts with ssconf://
    replace scheme with https:// and call fetchConfig
else if url starts with ss://
    return parseSsUrl(url)
else
    throw "Unsupported access url"
```

#### parseSsUrl(url)
1. Remove the `ss://` prefix and optional `#tag`.
2. Base64‑decode the remaining portion. If decoding fails, treat the text as already decoded.
3. If the decoded text is another URL (`http`, `https`, or `ssconf://`), treat it as a subscription and pass to `fetchConfig`.
4. Split the decoded string into `<method>:<password>@<host>:<port>`.
5. Return `{method, password, host, port, tag?}`.

#### fetchConfig(onlineUrl)
1. Retrieve the remote document via `fetch`.
2. If the response looks like Base64, decode it.
3. Two broad formats are supported:
   - **Plain text** containing multiple `ss://` lines.
   - **JSON** with either an array or an object with `servers`/`configs`.
4. Each entry is parsed either by calling `parseSsUrl` or by translating explicit fields. Nested `accessUrl` properties are resolved recursively.
5. Returns an array of normalized configuration objects.

Each configuration object has:
```json
{
  "method": "aes-256-gcm",
  "password": "...",
  "host": "1.2.3.4",
  "port": 8388,
  "tag": "optional label"
}
```

### background.js
- Maintains `proxyConfig` for the currently active server.
- `setChromeProxy(config, sendResponse)` wraps `chrome.proxy.settings.set` and reports errors back to the popup.
- `chrome.runtime.onMessage.addListener` handles:
- `start-proxy` → saves config, starts the local client, and calls `setChromeProxy`.
- `stop-proxy` → stops the client, clears proxy settings and resets `proxyConfig`.
- A full Shadowsocks client uses `chrome.sockets.tcp` with AES‑256‑GCM to provide encrypted traffic forwarding directly within the service worker.

### manifest.json
Declares MV3 background service worker and required permissions:
- `proxy` to modify Chrome's proxy configuration.
- `storage` for saving settings.
- `sockets` for the TCP client.
- `host_permissions: <all_urls>` to allow fetching remote subscription files.

## Data Flow and Storage
`chrome.storage.local` keeps the last used access URL and the expanded configuration, enabling the popup to restore state on next launch. The chosen configuration is also sent to the service worker on every connection attempt. No other persistent data is stored. This minimal approach ensures that sensitive secrets remain in memory only as long as necessary and can be cleared simply by removing the extension.

Messages between popup and background use `chrome.runtime.sendMessage`:
```json
{ "type": "start-proxy", "config": { ... } }
{ "type": "stop-proxy" }
```
Responses follow `{success: boolean, error?: string}`.

## Proxy Mechanics
The proxy is set to `fixed_servers` mode with a single SOCKS5 entry pointing to `127.0.0.1:<localPort>`. This tells Chrome to forward all requests through the local Shadowsocks client while bypassing system-wide proxy settings. The embedded client handles encryption and traffic relaying entirely within the browser, keeping the trust chain contained.

## Development and Testing
The project uses ESLint for basic static checks. Run:

```bash
npm install   # once
npm run lint
```

All extension code lives under `src/` and follows ES module syntax.

## Future Work
- Expose connection status and errors in the popup.
- Support user‑selectable local port and authentication methods.
- Add automated tests.

## License
MIT – see [LICENSE](../LICENSE).
