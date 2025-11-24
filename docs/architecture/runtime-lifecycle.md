# Runtime lifecycle and ownership map

This guide tracks how the extension bootstraps, responds to user intents, and keeps
network data synchronized. It is intended for developers extending Sheldu Socks
behaviour or auditing the existing Shadowsocks implementation.

## Startup sequence (Manifest V3 service worker)

1. [`src/background.js`](../../src/background.js) constructs singletons for
   `ProxyManager`, `Registry`, `ServerClient`, `ServerStore`, and
   `OutlineManager`.
2. The CensorTracker bootstrap loads bundled domains and triggers an async fetch
   for remote updates. This ensures the PAC registry is populated even after a
   cold start.
3. `ServerClient.scheduleUpdates()` installs an alarm to pull mirrored datasets
   hourly. `OutlineManager.scheduleSync()` performs a similar loop for
   registered Outline servers.
4. Change listeners on `browser.storage.onChanged` call
   `ProxyManager.refresh()` whenever registry or state keys mutate, keeping PAC
   rules aligned with the latest blocklists.

## UI message handling

All user-facing surfaces communicate with the worker through `runtime.sendMessage`:

- **`start-proxy` / `stop-proxy`** — Toggle the Shadowsocks client. The worker
  ensures only one client binds at a time and installs or clears PAC rules.
- **`sync`, `sync-outline`, `sync-censortracker`** — Trigger registry, Outline,
  or CensorTracker refreshes. Results are propagated through storage changes so
  the popup/options UIs redraw automatically.
- **`get-censortracker-fallback`** — Returns cached fallback servers when the
  primary connect attempt fails.
- **`diagnostics`** — Gathers the latest log entries, storage snapshot, and
  proxy status for export.

When adding a new Sheldu Socks capability, prefer extending this message surface
instead of introducing ad hoc storage keys. The background worker already owns
all side effects (network fetches, PAC rewrites, socket lifecycle), so keeping
communication centralized prevents race conditions.

## Shadowsocks socket pipeline

1. The UI requests a start via `start-proxy`. The worker normalizes the
   configuration and writes it through [`ServerStore`](../../src/serverStore.js)
   to persist the selection.
2. `ProxyManager.enable()` generates and installs a PAC script derived from the
   current registry and the client's local SOCKS port.
3. The worker binds a TCP server socket and begins relaying traffic. Connection
   metadata is keyed by client socket id (`connections` map) and by remote socket
   id (`remoteMap`).
4. Each relay chunk is AES-GCM encrypted/decrypted using the nonce helpers in
   `background.js`. The `TAG_LENGTH` constant must match the Shadowsocks AEAD
   tag length; changing it requires updating the handshake on both sides.
5. Shutdown (`stop-proxy` or socket errors) tears down the server socket, closes
   all tracked connections, and calls `ProxyManager.disable()` to revert to a
   direct connection.

## Registry and PAC lifecycle

- [`Registry`](../../src/registry.js) merges bundled domains, CensorTracker
  payloads, and user overrides. All mutations emit change events so PAC refreshes
  happen automatically.
- [`ProxyManager`](../../src/proxyManager.js) is the sole owner of PAC
  registration. Firefox requires explicit URL cleanup while Chrome relies on
  `proxy.settings`; the class abstracts those differences.
- [`pac.js`](../../src/pac.js) remains stateless; it simply receives a sorted
  domain list and emits a PAC script. Keeping that contract stable allows future
  Sheldu Socks routing modes to reuse the same generator.

## Data fetchers and schedules

- [`ServerClient`](../../src/serverClient.js) polls mirror endpoints for
  `domains.json` (registry) and `config.json` (remote feature flags). The helper
  annotates stored payloads with `_source` and `_endpoint` so diagnostics can
  attribute their origin.
- [`censortrackerServer`](../../src/censortrackerServer.js) handles CensorTracker
  specific downloads, parsing fallback server lists through `ssConfig.js` before
  persisting them.
- [`outlineManager`](../../src/outlineManager.js) iterates over configured
  Outline managers, performs certificate-pinned fetches, and feeds normalized
  results into `ServerStore`.

## Resilience and observability

- Every storage write goes through a dedicated module (`ServerStore`, `Registry`,
  `censortrackerServer`) to avoid schema drift.
- `logger.js` is loaded at startup and used by the worker and UI scripts for
  consistent timestamps and structured payloads.
- Diagnostics reports build on the same modules, so adding new Sheldu Socks
  capabilities should also include log entries and diagnostics fields here.

Use this lifecycle guide as the reference when extending the extension toward
future Sheldu Socks requirements. Keeping responsibilities anchored in these
modules minimizes surprises when MV3 restarts the worker or when mirror datasets
change format.
