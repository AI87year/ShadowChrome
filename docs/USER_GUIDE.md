# ShadowChrome User Guide

This guide walks through every screen and workflow available in the ShadowChrome browser extension. It is intended for testers, translators, and engineers who need a precise understanding of how the current MV3 implementation behaves.

## 1. Getting Started

### Prerequisites
- Google Chrome, Chromium, or a Chromium-based browser with Manifest V3 support.
- Node.js 18+ if you plan to lint or modify the source code.
- A valid `ss://` or `ssconf://` access link, or an Outline Manager deployment with an API endpoint.

### Installing the Extension
1. Clone the repository and run `npm install` once to pull dependencies required for linting.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Choose **Load unpacked** and point the file picker at the `src/` directory. Chrome registers the extension immediately.

## 2. Popup Overview

Opening the action button reveals the streamlined connection surface. The popup now contains:

1. **Language selector** – mirrors the options page selection so you can switch translations without leaving the popup.
2. **Access key panel** – paste an `ss://` or `ssconf://` link and press **Import access key** to store every server advertised by the subscription. Once imported, the panel collapses so the popup focuses on location selection.
3. **Location picker** – appears whenever saved servers exist. Entries are sorted by the lowest reported latency so the fastest options rise to the top.
4. **Connect / Disconnect** – primary actions to start or stop the embedded Shadowsocks client.
5. **Change access key** – reopens the input panel so you can paste a different subscription.
6. **Settings gear** – jumps straight to the dedicated options page for advanced configuration.
7. **Status readout** – displays live connection state, errors, fallback attempts, and sync progress messages with `aria-live="polite"` for assistive technologies.

## 3. Connecting to a Server

1. Paste a valid `ss://` or `ssconf://` link into the **Access key** panel and press **Import access key**. The popup hides the input once servers are available.
2. If multiple servers are returned, choose a **Location** from the picker; the fastest entries are listed first when latency data is present.
3. Press **Connect**. ShadowChrome stores the configuration, starts a local listener on `127.0.0.1:<port>` (default `1080`), and activates the PAC proxy. A successful connection updates the status line to "Proxy running on 127.0.0.1:{port}".
4. Disconnect at any time with the **Disconnect** button. The proxy settings revert to their previous state and the status changes to "Proxy stopped".

### CensorTracker fallback

- If the direct connection attempt fails, the popup displays "Attempting CensorTracker fallback..." while the background worker fetches fallback servers from the CensorTracker network.
- Any successfully parsed fallback servers are sorted by latency and tried automatically. When one succeeds, the status readout appends "Fallback connection active via {provider}."
- If no fallback host is available or every attempt fails, the status changes to "CensorTracker fallback is unavailable" followed by the original error message.

### Saved Servers
- Every server imported or launched appears in the popup's location picker and in the **Saved servers** section on the options page.
- Use **Use** on the options page to reconnect instantly without re-entering a URL.
- Use **Remove** to delete the entry. Removing an Outline manager automatically prunes its imported servers.

## 4. Options Page

Click the **Settings** gear in the popup to launch the dedicated management console. Each card now exposes a collapsible **Learn more** panel that expands on the terminology for non‑technical readers. The console organises advanced features into the following sections:

### Language and localization
- Choose one of the bundled translations. The selection is stored in `chrome.storage.local` and applied across the popup and options UI. The **Learn more** summary explains how localisation propagates.

### Proxy domains and PAC routing
- Toggle **Use CensorTracker registry** to enable or disable the upstream blocklist. The status line beneath the toggle reports the last sync source, country, and timestamp.
- Add custom domains to force routing through the tunnel. Custom entries can be removed individually.
- Maintain an **Ignored domains** list to exclude specific hosts from proxying even when the registry contains them.
- If every list is empty, ShadowChrome falls back to routing `.onion` and `.i2p` domains through the tunnel while letting other traffic flow directly.
- The **Learn more** panels in this card summarise how registry data, custom entries, and ignore rules interact.

### Saved servers management
- Review every configuration imported from subscriptions or Outline managers.
- Press **Use** to reconnect instantly without pasting a key.
- Press **Remove** to delete the entry. Removing an Outline manager automatically prunes its imported servers.
- The help panel describes how pruning affects the popup's location picker.

### Outline managers
- Enter the Outline Manager API endpoint and optional SHA-256 certificate fingerprint, then press **Add Manager**. The background worker stores the manager, synchronizes its access keys immediately, and schedules automatic refreshes every 30 minutes.
- Managers appear in the list with their URL and fingerprint. Press **Remove** to unregister them and delete any servers they added.
- The help panel explains when to provide a certificate fingerprint and how automatic sync behaves.

### Synchronization
- The **Sync** button performs three asynchronous tasks: refreshing remote configuration mirrors, updating the CensorTracker registry, and triggering an Outline Manager synchronization cycle. Status messages appear beneath the button.

### Diagnostics
- The **Diagnostics** button collects timestamp information, the last access URL, registry statistics, and buffered log entries. The JSON output is rendered inline for easy copy/paste into support requests.
- The collapsible help block clarifies exactly which data is captured and how to share it safely.

## 8. Storage Notes

- `chrome.storage.local` keys:
  - `accessUrl` – the most recently used access link.
  - `lastConfig` – sanitized copy of the configuration handed to the proxy.
- `servers` – saved Shadowsocks servers (manual and Outline).
- `domainRegistry` – domain list powering the PAC generator.
- `registryState` – metadata, custom domains, ignore list, sync information, and cached CensorTracker fallback servers.
- `censortrackerFallback` – latest fallback servers, provider metadata, and timestamp for the CensorTracker network hand-off.
- `outlineManagers` – registered Outline Manager endpoints.
  - `logs` – buffered log entries from the background worker.
- No secrets are written outside the browser profile. Removing the extension clears every stored value.

## 9. Troubleshooting Checklist

1. **Status shows an error immediately after connecting** – confirm the URL is valid and uses a supported cipher. The popup reports the exact error returned by the background worker.
2. **Outline servers are missing** – use **Sync** to force a refresh and ensure the API endpoint is reachable from the browser environment.
3. **PAC routing is incorrect** – inspect the domain list; entries are matched by suffix and applied automatically on change.
4. **Diagnostics output is empty** – verify the service worker is running. Opening the popup restarts it if the browser has suspended the worker.

For architectural details and module-level documentation see [`docs/DETAILED_DOCUMENTATION.md`](DETAILED_DOCUMENTATION.md).
