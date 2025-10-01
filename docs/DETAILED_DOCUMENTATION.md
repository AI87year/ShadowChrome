# ShadowChrome — Detailed Documentation

## Overview
ShadowChrome is a Chrome extension that runs a complete Shadowsocks client inside the browser. Users only provide an `ss://` or `ssconf://` URL and the extension takes care of parsing configuration, selecting servers, and setting Chrome’s proxy settings. The service worker implements the full protocol using the `chrome.sockets` API, so no native helper processes are required.

## Philosophy and Motivation
The project started as an exploration of how far the modern browser platform can be pushed in service of privacy. Traditional proxy clients often require installing privileged binaries, which can be intimidating or impossible in locked-down environments. ShadowChrome seeks to lower that barrier by delivering an auditable, source-available client that lives entirely within Chrome’s security sandbox. By leveraging the distributed Shadowsocks network, the extension aspires to provide a portable tool for bypassing censorship and fostering free access to information.

ShadowChrome is also authored by artificial intelligence. The extension embodies a zero‑coding concept in which comprehensive technical descriptions are transformed directly into functioning software, showcasing the potential for complex programs to be produced without manual coding. Developers looking for a component-by-component breakdown can explore the dedicated architecture reference in [`docs/architecture/`](architecture/).

Beyond the technical challenge, ShadowChrome embodies a philosophy of openness: every component is written in JavaScript and HTML, allowing curious users to inspect, modify, and rebuild the project without specialized toolchains. Transparency is viewed as a prerequisite for trust.

## Project Goals
- **Self-contained client.** Operate wholly within the MV3 environment so no native helpers or external daemons are needed, reducing attack surface and simplifying deployment.
- **Simple UX.** Users should only have to paste a URL and click connect; the extension performs all discovery and configuration internally.
- **Flexible configuration.** Accept both single-server links and subscription-style lists, allowing users to carry one link across devices and platforms.

## High-Level Workflow
1. **Popup initialization** – When the popup is opened, previously saved configuration is restored from `chrome.storage.local`.
2. **User input** – The user pastes an access key and presses **Import access key**. The popup persists every server returned by the subscription and collapses the input panel once data is available.
3. **Parsing** – `parseAccessUrl` determines whether the link is a direct `ss://` entry or a remote subscription (`ssconf://` or Base64/JSON). The function returns either a single configuration or an array of options.
4. **Location selection** – If multiple server options are returned, the popup shows a drop‑down for the user to select a location.
5. **Connecting** – The chosen configuration is augmented with a local SOCKS port (currently `1080`) and persisted to `chrome.storage.local`. The popup sends a `{type: 'start-proxy', config}` message to the background service worker.
6. **Fallback resolution** – If the connection attempt fails, the popup requests cached CensorTracker fallback servers (`{type: 'get-censortracker-fallback'}`) and retries each candidate before surfacing an error to the user.
7. **Proxy activation** – The service worker sets Chrome’s proxy settings to `socks5://127.0.0.1:<localPort>` and starts a local Shadowsocks client bound to that port.
8. **Disconnecting** – On request the service worker clears Chrome’s proxy settings and stops the client.

## Source Layout
```text
src/
├─ background.js              # Service worker controlling proxy, PAC and Shadowsocks client
├─ browser-api.js             # Cross-browser API wrapper with Promise helpers
├─ censortracker.js           # Load embedded CensorTracker domains and fetch updates
├─ censortrackerServer.js     # Periodic sync against upstream CensorTracker endpoints
├─ censortracker-domains.json # Bundled domain blocklist
├─ diagnostics.js             # Collect diagnostic info for troubleshooting
├─ logger.js                  # Minimal logging wrapper
├─ manifest.json              # MV3 manifest declaring permissions and background worker
├─ outlineManager.js          # Sync Outline Manager access keys into the store
├─ pac.js                     # Generate PAC scripts for domain-based routing
├─ popup.html                 # Minimal popup markup for importing keys and connecting
├─ popup.js                   # Popup logic focused on connection workflow
├─ options.html               # Options page markup with advanced controls
├─ options.js                 # Options page logic (languages, registry, managers, diagnostics)
├─ proxyManager.js            # Apply PAC script or proxy settings
├─ registry.js                # Persistent domain registry used by PAC
├─ serverClient.js            # Fetch remote configs and domain lists from mirrors
├─ serverStore.js             # Persist Shadowsocks server configurations
├─ ssConfig.js                # Parser for access URLs and remote subscriptions
├─ integrations/              # Shadowsocks cipher metadata and other helpers
├─ utils/fetchWithTimeout.js  # Abortable fetch helper with MV3-friendly timeouts
└─ utils/withTimeout.js       # Promise-based timeout guard for generic operations
```

## Module Details

### popup.html / popup.js
The popup is intentionally minimal and exists purely for connection control:
- **Language selector** mirrors the options page locale choice so users can switch translations without leaving the popup.
- **Access key panel** imports subscription links, persists every server, and hides itself once data is available.
- **Location selector** lists saved servers for quick switching and orders them by the lowest reported latency.
- **Connect** (`#connect`) and **Disconnect** (`#disconnect`) start and stop the embedded client.
- **Change access key** link reopens the import panel.
- **Settings gear** launches the options page in a new tab.
- **Status readout** (`#status`) reports live proxy state, fallback attempts, and errors via an `aria-live` region.

Key event handlers in `popup.js`:
- `DOMContentLoaded` → restores language and last access key, applies translations, loads saved servers, and refreshes connection status.
- **Import access key** → parses the access URL, saves every configuration to `ServerStore`, and collapses the input panel.
- **Connect** → starts the proxy for the selected server, adding it to storage if necessary.
- **Disconnect** → sends `stop-proxy` to the service worker.
- **Change access key** → reopens the form so users can paste a new subscription.
- **Open settings** → calls `browser.runtime.openOptionsPage()` so advanced configuration happens on the options page.

The popup never holds long‑running connections; all network operations occur in the background worker.

### options.html / options.js
The options page centralises every advanced feature:
- **Language selector** persists translation choice across popup and options interfaces.
- **Access key tools** import subscriptions outside the popup and provide a "remove saved servers" action.
- **Proxy domain editor** exposes the CensorTracker toggle, custom domain list, and ignore list with inline removal controls.
- **Saved server catalog** lists every stored configuration with **Use** and **Remove** actions.
- **Outline manager form** registers endpoints, triggers immediate syncs, and allows removal of managers.
- **Sync** button chains mirror refresh, Outline sync, and CensorTracker updates, reporting progress via the status line.
- **Diagnostics** button fetches troubleshooting JSON for support cases.
- **Contextual help panels** accompany every card through `<details class="help">` elements labelled “Learn more”, providing plain-language explanations for non-technical users.

`options.js` reuses the same translation map as the popup, listens for `ServerStore` changes to keep the saved list current, and calls the background worker through `browser.runtime.sendMessage` for Outline and synchronization actions.

### ssConfig.js
Translates Outline and Shadowsocks access keys into runtime configuration objects.

#### parseAccessUrl(url)
- Uses the upstream Outline `parseAccessKey` implementation (ported to `third_party/jigsaw-code/outlineAccessKey.js`) to distinguish between static `ss://` keys and dynamic `ssconf://`/`https://` subscriptions.
- Static keys are parsed through `parseSsUrl` and automatically tagged with the Outline-provided server name when available.
- Dynamic keys resolve to remote JSON/text documents via `fetchConfig`, preserving Outline metadata such as the service name.
- URLs that fail Outline parsing but start with `http`/`https` fall back to subscription parsing, matching legacy behaviour.

#### parseSsUrl(url, defaultTag?)
1. Removes the `ss://` prefix and optional fragment `#tag`.
2. Base64-decodes the remainder, or treats the string as already decoded on failure.
3. Nested URLs (`http`, `https`, `ssconf://`) are treated as subscriptions and forwarded to `fetchConfig`.
4. Splits `<method>:<password>@<host>:<port>` and resolves missing passwords via the password helper.
5. Applies the Outline-sourced `defaultTag` when the URL lacks its own label and records a warning when the cipher is outside the canonical AEAD set described in `integrations/shadowsocksCiphers.js`.

#### fetchConfig(onlineUrl, defaultTag?)
1. Downloads the remote document and attempts Base64 decoding when appropriate.
2. Supports both newline-separated `ss://` payloads and JSON documents containing arrays/objects with `servers`, `configs`, or nested `accessUrl` entries.
3. Recursively resolves nested access keys, propagating Outline tags through the returned configurations.
4. Returns an array of normalized configuration objects suitable for storage and connection attempts.

### background.js
- Maintains `proxyConfig` for the currently active server.
- `setChromeProxy(config, sendResponse)` wraps `chrome.proxy.settings.set` and reports errors back to the popup.
- `chrome.runtime.onMessage.addListener` handles:
  - `start-proxy` → saves config, starts the local client, and calls `setChromeProxy`.
  - `stop-proxy` → stops the client, clears proxy settings and resets `proxyConfig`.
  - `sync` → runs the mirror synchronizer.
  - `sync-censortracker` → refreshes the upstream CensorTracker configuration, registry, and ignore list.
  - `sync-outline` → calls `OutlineManager.syncAll()`.
  - `add-outline-manager` → stores metadata and attempts an immediate sync, returning a warning if the sync fails.
  - `list-outline-managers` / `remove-outline-manager` → expose and prune Outline manager entries. Removing a manager also drops its servers via `ServerStore.removeByManager`.
  - `list-servers` / `remove-server` → manage the saved server catalog.
  - `get-registry-state` / `set-registry-enabled` → expose and toggle registry metadata used by the popup.
  - `add-ignored-domain` / `remove-ignored-domain` → manipulate the ignore list shared with the PAC generator.
  - `get-diagnostics` → assembles diagnostic payloads.
  - `get-proxy-status` → returns `{running, summary}` so the popup can display the current state without exposing secrets.
- A full Shadowsocks client uses `chrome.sockets.tcp` with AES‑256‑GCM to provide encrypted traffic forwarding directly within the service worker.

### manifest.json
Declares MV3 background service worker and required permissions:
- `proxy` to modify Chrome's proxy configuration.
- `storage` for saving settings.
- `sockets` for the TCP client.
- `host_permissions: <all_urls>` to allow fetching remote subscription files.

### registry.js
Manages the composite domain registry used by the PAC generator. The module merges three sources:
- Upstream CensorTracker domains stored in `domainRegistry`.
- User-added overrides stored as `customProxiedDomains`.
- An ignore list that excludes specific hosts from proxying.

Public methods expose CRUD helpers for custom and ignored domains, toggle whether the upstream registry should be applied, and surface metadata (source, country, last sync time) for the popup. Any update triggers change listeners so the PAC script is regenerated automatically.

### proxyManager.js
Generates and applies PAC scripts based on the registry contents. In Firefox it registers a PAC file URL; in Chrome it sets the `pac_script` proxy mode.

### pac.js
Helper that creates a PAC script string performing a binary search over the domain list and falling back to SOCKS5 for `.onion` and `.i2p` hosts.

### serverStore.js
Normalizes and stores Shadowsocks configurations in `chrome.storage.local`, deduplicating entries by method/password/host/port. The store updates existing records, exposes `removeByManager` so Outline removals clean up dependent servers, and notifies listeners whenever the list changes.

### outlineManager.js
Synchronizes Outline Manager instances. Each manager is defined by an API URL and optional certificate hash. The module periodically fetches access keys, normalizes them (even when a subscription expands into multiple configs), and relies on `ServerStore` to persist the results. Adding a manager triggers an immediate sync; removing one prunes its servers via `ServerStore.removeByManager`.

### serverClient.js
Fetches remote configuration files and domain lists from a set of mirror URLs. Each successful request records the mirror source and endpoint so downstream code (and diagnostics) know where data originated. Updates the registry and remote configuration on a scheduled basis using alarms.

### censortrackerServer.js
Wraps the CensorTracker update logic: it discovers an appropriate country profile, downloads registry/ignore/disseminator data from redundant endpoints, and stores metadata for the popup while merging the ignore list into `registryState`. The module also fetches Shadowsocks fallback endpoints from the CensorTracker `proxyUrl` and caches them in `chrome.storage.local` so the popup can retry failed connections automatically.

### censortracker.js
Provides `loadBundledDomains` to read the embedded CensorTracker blocklist and `fetchRemoteDomains` to refresh it from the upstream repository when online.

### browser-api.js
Wraps the `chrome`/`browser` objects and exposes promise-based helpers for messaging and storage, enabling the codebase to run on both Chrome and Firefox.

### diagnostics.js
Collects basic diagnostic data such as stored configuration and environment info, allowing users to copy troubleshooting details from the popup.

### logger.js
Lightweight logging utility with in-memory buffering and persistence to `storage.local` so logs survive extension restarts.

### utils/fetchWithTimeout.js
Wraps `fetch` with an `AbortController` so background sync tasks fail fast when mirrors stall. The helper is used by the mirror,
Outline Manager, and CensorTracker modules to enforce resilient network timeouts without leaving hanging requests in MV3.

### utils/withTimeout.js
Races any promise against a timeout and rejects if the time is exceeded. Still available for legacy flows that need a generic
timeout wrapper without abort semantics.

## Data Flow and Storage
`chrome.storage.local` now holds:
- `accessUrl` – the most recently used access link.
- `lastConfig` – sanitized configuration handed to the proxy worker.
- `servers` – deduplicated list of saved and Outline-provided servers.
- `domainRegistry` – domains that must traverse the proxy.
- `registryState` – metadata, ignore list, custom domain overrides, and the last CensorTracker sync details.
- `censortrackerFallback` – Shadowsocks fallback servers supplied by the CensorTracker network, including provider metadata and timestamps.
- `outlineManagers` – Outline Manager descriptors.
- `logs` – buffered background logs.

Messages between popup and background use `chrome.runtime.sendMessage` with the following types:
```json
{ "type": "start-proxy", "config": { ... } }
{ "type": "stop-proxy" }
{ "type": "sync" }
{ "type": "sync-outline" }
{ "type": "sync-censortracker" }
{ "type": "list-outline-managers" }
{ "type": "add-outline-manager", "apiUrl": "...", "certSha256": "..." }
{ "type": "remove-outline-manager", "apiUrl": "..." }
{ "type": "list-servers" }
{ "type": "remove-server", "id": "..." }
{ "type": "get-registry-state" }
{ "type": "set-registry-enabled", "enabled": true }
{ "type": "add-ignored-domain", "domain": "example.com" }
{ "type": "remove-ignored-domain", "domain": "example.com" }
{ "type": "get-proxy-status" }
{ "type": "get-censortracker-fallback" }
{ "type": "get-diagnostics" }
```
Responses follow `{success: boolean, error?: string, ...}` with extra fields depending on the request.

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
- Implement certificate pinning for Outline Manager synchronisation.
- Support user‑selectable local port and authentication methods.
- Add automated tests.

## License
MIT – see [LICENSE](../LICENSE).
