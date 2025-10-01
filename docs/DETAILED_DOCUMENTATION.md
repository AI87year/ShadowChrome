# ShadowChrome — Detailed Documentation

## Overview
ShadowChrome is a Chrome extension that runs a complete Shadowsocks client inside the browser. Users only provide an `ss://` or `ssconf://` URL and the extension takes care of parsing configuration, selecting servers, and setting Chrome’s proxy settings. The service worker implements the full protocol using the `chrome.sockets` API, so no native helper processes are required.

## Audience and Documentation Map

This document is written for developers, reviewers, and technically curious testers who want to understand how the project works under the hood. If you only need to connect to a server, begin with [`docs/USER_GUIDE.md`](USER_GUIDE.md).

Use the documentation set as layered references:

- **`USER_GUIDE.md`** — practical, task-driven walkthroughs and troubleshooting advice.
- **`DETAILED_DOCUMENTATION.md`** — conceptual overview, architectural context, and subsystem responsibilities.
- **`docs/architecture/`** — granular component inventories, workflow timing diagrams, and storage schemas.
- **`USAGE_POLICY.md`** — acceptable use guidance emphasising that ShadowChrome is an experimental, research-oriented project.

When onboarding, skim this file to understand the moving parts, then dive into the architecture subdirectory for deeper diagrams and code references.

## Philosophy and Motivation

The project started as an exploration of how far the modern browser platform can be pushed in service of privacy. Traditional proxy clients often require installing privileged binaries, which can be intimidating or impossible in locked-down environments. ShadowChrome seeks to lower that barrier by delivering an auditable, source-available client that lives entirely within Chrome’s security sandbox. By leveraging the distributed Shadowsocks network, the extension aspires to provide a portable tool for bypassing censorship and fostering free access to information.

ShadowChrome is also authored by artificial intelligence. The extension embodies a zero‑coding concept in which comprehensive technical descriptions are transformed directly into functioning software, showcasing the potential for complex programs to be produced without manual coding. Developers looking for a component-by-component breakdown can explore the dedicated architecture reference in [`docs/architecture/`](architecture/).

Beyond the technical challenge, ShadowChrome embodies a philosophy of openness: every component is written in JavaScript and HTML, allowing curious users to inspect, modify, and rebuild the project without specialized toolchains. Transparency is viewed as a prerequisite for trust.

### Design Tenets

A few guiding principles influence every engineering decision:

1. **Browser-native execution.** All logic lives inside the Manifest V3 sandbox. No native helper binaries or background daemons are required, simplifying deployment on constrained systems.
2. **Auditable code paths.** Modules are deliberately small and cohesive so that you can trace behaviour from a UI button to a service-worker action without guesswork.
3. **Accessibility and localisation by default.** Interfaces expose ARIA hooks, and the language selector keeps the popup and options page aligned for bilingual users.
4. **Research-first posture.** ShadowChrome is an experiment in browser capabilities, not a turnkey circumvention tool. The intent and limitations are restated in [`USAGE_POLICY.md`](USAGE_POLICY.md).

## Project Goals

- **Self-contained client.** Operate wholly within the MV3 environment so no native helpers or external daemons are needed, reducing attack surface and simplifying deployment.
- **Simple UX.** Users should only have to paste a URL and click connect; the extension performs all discovery and configuration internally.
- **Flexible configuration.** Accept both single-server links and subscription-style lists, allowing users to carry one link across devices and platforms.
- **Approachable documentation.** Provide layered guides so newcomers can progress from user-focused material to subsystem deep dives without reading source files line-by-line.

## Runtime Surfaces

ShadowChrome exposes three primary surfaces that collaborate to deliver the experience:

1. **Popup (`popup.html` / `popup.js`)** — the lightweight control panel for importing access keys, selecting servers, and toggling the connection state.
2. **Options page (`options.html` / `options.js`)** — the management console for registry controls, saved servers, Outline Manager synchronisation, diagnostics, and localisation.
3. **Background service worker (`background.js`)** — the long-lived runtime that hosts the Shadowsocks client, owns proxy configuration, orchestrates background sync jobs, and processes every message sent from the UI surfaces.

Each surface is intentionally stateless. UI documents fetch the latest data from `chrome.storage.local` when they load and communicate intent to the service worker through `chrome.runtime.sendMessage`. This keeps sensitive operations confined to the worker while ensuring the popup remains responsive.

## Runtime Lifecycle at a Glance

The operational loop can be summarised as follows:

1. **State restoration** — when the popup opens, it retrieves language preferences, previously saved servers, and the last known proxy status.
2. **Access key import** — any pasted key is forwarded to `ssConfig.js`, which normalises single links and subscriptions, persists deduplicated entries via `ServerStore`, and exposes them to the UI.
3. **Connection request** — choosing a server and clicking **Connect** dispatches a `{type: 'start-proxy', config}` message to the service worker.
4. **Proxy activation** — the worker spins up the embedded Shadowsocks client, binds it to `127.0.0.1:<port>`, applies Chrome’s proxy settings, and returns a summary to the popup.
5. **Monitoring and fallback** — failures trigger a fetch of cached CensorTracker fallback servers. Candidates are tried automatically until a connection succeeds or the pool is exhausted.
6. **Disconnect** — user intent or error handling leads to a `{type: 'stop-proxy'}` message. The worker stops the client, clears proxy settings, and updates stored status.

For sequence diagrams and timing details, consult [`docs/architecture/workflows.md`](architecture/workflows.md).

## Source Layout

Every module resides under `src/`. The tree below lists the most important entry points and their responsibilities:

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

Refer to [`docs/architecture/components.md`](architecture/components.md) for commentary on how these modules interconnect.

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

Wraps `fetch` with an `AbortController` so background sync tasks fail fast when mirrors stall. The helper is used by the mirror, Outline Manager, and CensorTracker modules to enforce resilient network timeouts without leaving hanging requests in MV3.

### utils/withTimeout.js

Races any promise against a timeout and rejects if the time is exceeded. Still available for legacy flows that need a generic timeout wrapper without abort semantics.

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

## Accessibility, Localisation, and UX Notes

- **ARIA and announcements.** The popup status banner uses `aria-live="polite"` so assistive technologies track connection changes without interrupting the user.
- **Keyboard flow.** Form elements in the popup and options page are linear and focusable, letting keyboard-only users import keys, choose servers, and trigger sync actions.
- **Localisation model.** Translations are stored in shared dictionaries consumed by both UI surfaces. The language toggle persists the choice in `chrome.storage.local` and re-renders the active document immediately.

## Security Boundaries and Limitations

- **Browser sandbox.** All network traffic is proxied through `chrome.sockets.tcp` inside the service worker. No privileged native code executes, so the project inherits Chrome’s sandbox guarantees.
- **Experimental status.** ShadowChrome is not audited to the standard required for hostile environments. Use it for experimentation, education, or controlled research, not for bypassing lawful corporate or governmental controls. The expectations are captured formally in [`USAGE_POLICY.md`](USAGE_POLICY.md).
- **No built-in auto-update.** Running from source means you must pull updates manually and reload the extension. Monitor the repository for patches that may address newly discovered issues.

## Development and Testing

The project uses ESLint for basic static checks. Run:

```bash
npm install   # once
npm run lint
```

All extension code lives under `src/` and follows ES module syntax. The lint configuration enforces stylistic consistency, but manual smoke-testing in Chrome is still recommended for UI changes.

## 2025 Platform Review

Chrome 129 (October 2025 stable) continues the Manifest V3 rollout without
introducing breaking API removals for networking extensions. During the annual
review we verified the following assumptions still hold:

- The background service worker uses only Manifest V3-compatible APIs (`chrome`
  namespace and event-driven listeners) and never relies on the removed
  persistent background pages.
- Proxy handling flows call `chrome.proxy.settings` and `chrome.sockets.tcp`,
  both of which remain supported behind the `proxy` and `sockets` permissions in
  2025 builds.
- Dynamic import usage in `background.js` and `options.js` lines up with the
  modern Chrome runtime that now supports top-level `await` and streaming
  modules.
- The Web Store policy update from July 2025 requires explicit lawful-use
  messaging; the new [usage policy](USAGE_POLICY.md) satisfies that audit.

## Future Work

- Implement certificate pinning for Outline Manager synchronisation.
- Support user-selectable local port and authentication methods.
- Add automated tests.
- Expand telemetry-free health checks so the popup can warn about outdated
  access keys.

## License

MIT – see [LICENSE](../LICENSE).
<!-- Updated: 2025-10-01 -->
