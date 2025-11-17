# Runtime workflows

This chapter describes how the main pieces of ShadowChrome cooperate while the extension
is running. Each workflow links back to the source files that own individual steps.

## Access key import

1. **User action.** The popup or options page captures the access key from the import form
   (`popup.js`, `options.js`).
2. **Parsing.** The string is passed to [`parseAccessUrl`](../../src/ssConfig.js) which
   distinguishes between direct `ss://` links, subscription URLs, Outline JSON payloads,
   and nested references. Subscription documents are fetched through
   [`fetchConfig`](../../src/ssConfig.js) using [`fetchWithTimeout`](../../src/utils/fetchWithTimeout.js).
3. **Normalization.** Parsed entries are converted into canonical configuration objects
   containing the cipher, host, port, password, optional plugin metadata, and Outline tags.
4. **Persistence.** [`ServerStore.saveServers`](../../src/serverStore.js) persists the
   merged list and updates `activeServerId` to the new entry when appropriate.
5. **UI refresh.** Change listeners registered in `popup.js` and `options.js` redraw the
   location list to include the imported servers.

## Connection lifecycle

1. **Start request.** The popup dispatches `{type: 'start-proxy', config}` to the
   background worker via `browser.runtime.sendMessage`.
2. **Proxy preparation.** [`background.js`](../../src/background.js) normalizes the
   payload, saves it to `ServerStore`, and calls
   [`proxyManager.applyProxy`](../../src/proxyManager.js) to install the PAC script or
   direct SOCKS proxy.
3. **Client startup.** The service worker boots the embedded Shadowsocks client, binding
   to `127.0.0.1:1080` using the chosen cipher and password. Connection state is tracked in
   memory for quick status updates.
4. **Error handling.** Failures raise structured errors that are forwarded back to the
   popup. If the error indicates a network failure, the popup requests fallback servers
   with `{type: 'get-censortracker-fallback'}` and retries each candidate sequentially.
5. **Stop request.** `{type: 'stop-proxy'}` tears down the client and invokes
   [`proxyManager.clearProxy`](../../src/proxyManager.js) to revert Chrome to a direct
   connection.

## Outline Manager synchronization

1. **Configuration.** Users register managers through the options page, which stores
   descriptors in `chrome.storage.local.outlineManagers` via `outlineManager.js`.
2. **Sync trigger.** The options page sends `{type: 'sync-outline'}` or includes Outline in
   the combined `{type: 'sync'}` action.
3. **Fetch loop.** [`OutlineManager.syncAll`](../../src/outlineManager.js) iterates over
   saved managers, performs certificate-pinned fetches using `serverClient.js`, and parses
   the returned configuration objects with `ssConfig.js`.
4. **Merge.** New servers are deduplicated by ID before being stored through
   `ServerStore.saveServers`, ensuring previously selected entries are preserved.
5. **Status reporting.** Progress messages are streamed back to the options page via
   resolved Promises so users can observe successes and failures per manager.

## CensorTracker updates and fallbacks

1. **Baseline data.** [`censortracker.js`](../../src/censortracker.js) loads the bundled
   domain list (`censortracker-domains.json`) during startup.
2. **Scheduled refresh.** The service worker triggers `censortrackerServer.js` based on
   stored timestamps or explicit `{type: 'sync-censortracker'}` requests.
3. **Remote fetch.** `censortrackerServer.js` downloads the latest blocklists and fallback
   server catalog from upstream APIs via `serverClient.js` with timeout protection.
4. **Registry rebuild.** New domains merge into `registry.js`, which recalculates the PAC
   routing map and stores it in `chrome.storage.local.censortrackerRegistry`.
5. **Fallback cache.** Any Shadowsocks endpoints supplied by CensorTracker are normalized
   through `ssConfig.js` and cached under `fallbackServers` for popup retries.

## Diagnostics export

1. **User action.** The options page button emits `{type: 'diagnostics'}`.
2. **Snapshot.** [`diagnostics.js`](../../src/diagnostics.js) pulls current server lists,
   Outline manager descriptors, proxy state, and recent log entries.
3. **Packaging.** The module returns a JSON payload that the UI offers for download,
   redacting secrets while retaining enough context for debugging.

Following these workflows should help newcomers reason about the lifecycle of data and the
coordination between UI surfaces and the service-worker core.
<!-- Updated: 2025-11-13 -->
