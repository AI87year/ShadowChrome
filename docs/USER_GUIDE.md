# ShadowChrome User Guide

ShadowChrome packages a full Shadowsocks client inside a Chrome extension. This guide expands every surface of the extension so that first-time testers, translators, and contributors can move from installation to confident daily use without needing to read source code first. Treat it as the companion to the high-level project overview in [`docs/DETAILED_DOCUMENTATION.md`](DETAILED_DOCUMENTATION.md).

## 1. How to Use this Guide

- **You are in the right place if…** you have an access key and want to connect, you have never worked with MV3 extensions, or you need a refresher on the ShadowChrome workflows.
- **Skim the concepts first** if Shadowsocks vocabulary is unfamiliar. Each section links back to practical steps, so you can learn gradually.
- **Refer to the [Usage Policy](USAGE_POLICY.md)** for expectations around lawful, research-oriented use of the project.

## 2. Key Concepts

Understanding a few recurring terms makes the interface easier to grasp:

- **Access key** — a string that begins with `ss://` or `ssconf://`. It encodes the server address, encryption method, and optional metadata such as a label. Some providers distribute subscription links that expand to multiple servers.
- **Outline Manager** — an external service that can host and rotate Shadowsocks keys. When paired with ShadowChrome it automatically populates the Saved servers list.
- **CensorTracker** — an upstream dataset containing domain blocklists and emergency fallback servers. ShadowChrome fetches the data to keep the PAC routing list current and to recover from failed connections.
- **PAC script** — a small JavaScript file that instructs Chrome which domains should use the proxy and which should go out directly. ShadowChrome maintains this for you.

If any term is unclear, hover over the **Learn more** panels on the options page; the explanations mirror the definitions in this section.

## 3. Getting Started

### Prerequisites

- Google Chrome, Chromium, or another Chromium-based browser that supports Manifest V3 extensions.
- Node.js 18+ if you plan to lint or modify the source code. (Casual users can skip this.)
- At least one valid `ss://` or `ssconf://` link, or an Outline Manager deployment that you can access.

### Install ShadowChrome from source

1. Clone the repository.
2. Run `npm install` once to download the linting dependencies. This does not build the extension; it simply prepares the development environment.
3. Open `chrome://extensions/`, enable **Developer mode**, and click **Load unpacked**.
4. Select the `src/` directory. Chrome registers the extension immediately and pins the icon to the toolbar.

Tip: keep the repository cloned. Future updates only require reloading the extension from the extensions page.

## 4. A Guided Tour of the Popup

The action button opens the popup, which acts as the control centre for quick connections. Each numbered feature below matches a visible element in the UI:

1. **Language selector** — mirrors the options page language choice so both surfaces stay in sync. Pick the language you are most comfortable with before proceeding.
2. **Access key panel** — paste your `ss://` or `ssconf://` string and press **Import access key**. ShadowChrome parses the key, stores every advertised server, and automatically hides the panel once data is saved.
3. **Location picker** — appears whenever servers are available. Entries are sorted by reported latency so fast choices surface at the top. When latency information is missing, alphabetical order is used.
4. **Connect / Disconnect buttons** — start or stop the built-in Shadowsocks client. The button label always reflects the current state.
5. **Change access key** — reopens the input form if you need to paste a different subscription link.
6. **Settings gear** — launches the options page for advanced management without leaving the popup context.
7. **Status readout** — a live banner that describes connection progress, fallback attempts, and error messages. It uses `aria-live="polite"` so screen readers can follow along.

Spend a minute clicking through each element before connecting. Familiarity with the layout makes troubleshooting easier later.

## 5. First Connection Walkthrough

1. Paste a valid access key into the **Access key** panel and press **Import access key**. If the link points to a subscription, ShadowChrome downloads the full list of servers and stores them locally.
2. Choose a **Location** if multiple servers exist. ShadowChrome marks the last selected entry so you can quickly reconnect.
3. Press **Connect**. The background worker starts a local listener on `127.0.0.1:<port>` (default `1080`), activates the PAC proxy, and updates the status line to `Proxy running on 127.0.0.1:{port}` once everything is ready.
4. Browse as usual. Traffic that matches the PAC rules now flows through the encrypted tunnel. You can close the popup; the connection continues until you disconnect or the browser suspends the service worker.
5. Press **Disconnect** when finished. Chrome reverts to its previous proxy settings and the status changes to `Proxy stopped`.

### What the status messages mean

- **Attempting CensorTracker fallback…** — the first connection failed, so ShadowChrome is requesting backup servers from the CensorTracker network. This is automatic; no extra action is required.
- **Fallback connection active via {provider}.** — the connection recovered using one of the fallback servers. You can continue browsing, but consider syncing later to refresh your primary access key.
- **CensorTracker fallback is unavailable.** — neither the primary server nor the fallback pool succeeded. Verify the access key, run **Sync**, or import a different subscription.
- **Proxy stopped / Proxy running** — the normal idle and connected states.

## 6. Managing Servers and Access Keys

- **Saved servers** — every server you import appears in the location picker and on the options page. Use the **Use** button on the options page to reconnect instantly, or **Remove** to delete outdated entries.
- **Changing subscriptions** — click **Change access key** in the popup or use the access key tools on the options page. New imports merge with existing entries; duplicates are automatically deduplicated by `serverStore.js`.
- **Outline Manager integration** — add your Outline Manager API endpoint on the options page along with the optional certificate fingerprint. The background worker stores the manager, synchronises immediately, and refreshes it every 30 minutes so the saved list stays current. Removing a manager also removes the servers it contributed.

## 7. Options Page Deep Dive

Open the options page through the settings gear or by visiting `chrome-extension://<id>/options.html` directly. The page is organised into cards, each with a collapsible **Learn more** summary that translates technical jargon into plain language.

### Language and localisation

- Choose your preferred language. The selection persists across popup sessions and synchronises across devices if browser sync is enabled.

### Proxy domains and PAC routing

- Toggle **Use CensorTracker registry** to apply the upstream domain list. The status line under the toggle reports the last sync source, country, and timestamp so you can confirm fresh data.
- Add custom domains to force routing through the tunnel. Remove entries individually when they are no longer required.
- Maintain an **Ignored domains** list to bypass the proxy for specific hosts (for example, banking portals that block VPNs).
- When every list is empty, ShadowChrome still proxies `.onion` and `.i2p` traffic for safety while letting other requests travel directly.

### Saved servers

- Review every configuration imported manually or via Outline. **Use** reconnects instantly; **Remove** deletes the entry across the popup and options page.

### Outline managers

- Add or remove Outline endpoints, see the last sync time, and provide a SHA-256 certificate fingerprint when your manager uses a self-signed certificate. The help text explains how to capture that fingerprint.

### Synchronisation tools

- The **Sync** button chains three tasks: refreshing remote configuration mirrors, updating the CensorTracker registry, and triggering Outline Manager synchronisation. Watch the status line beneath the button for progress and error messages.

### Diagnostics and support

- The **Diagnostics** button gathers the last access URL, registry statistics, timestamp information, and buffered log entries. The JSON output appears inline so you can copy it into support tickets without exposing credentials.
- When contacting the project maintainers, include diagnostics and a summary of recent actions (for example, "imported new subscription, sync failed with timeout").

## 8. Storage Reference

ShadowChrome stores its state exclusively inside `chrome.storage.local` within your browser profile:

- `accessUrl` — the most recently used access link.
- `lastConfig` — sanitized copy of the configuration handed to the proxy worker.
- `servers` — deduplicated list of Shadowsocks servers from manual imports and Outline managers.
- `domainRegistry` — domain list powering the PAC generator.
- `registryState` — metadata, custom domains, ignore list, sync information, and cached CensorTracker fallback servers.
- `censortrackerFallback` — most recent fallback servers, provider metadata, and timestamps.
- `outlineManagers` — registered Outline Manager descriptors.
- `logs` — buffered background logs that persist across popup reloads.

Removing the extension from Chrome clears every stored value. No data is written outside the browser profile.

## 9. Troubleshooting Checklist

1. **Status shows an error immediately after connecting** — confirm the access key is valid and uses a supported cipher. The popup reports the exact error returned by the background worker.
2. **Outline servers are missing** — press **Sync** to force a refresh and ensure the Outline API endpoint is reachable.
3. **PAC routing behaves unexpectedly** — inspect the domain lists. Entries are matched by suffix and applied automatically after edits.
4. **Diagnostics output is empty** — the service worker may have been suspended. Opening the popup restarts it.
5. **Fallback repeatedly activates** — your primary access key might be outdated. Import a fresh subscription or contact the provider to confirm server status.

## 10. Continue Exploring

- Read the architectural breakdown in [`docs/DETAILED_DOCUMENTATION.md`](DETAILED_DOCUMENTATION.md) for module-level insights.
- Dive into [`docs/architecture/`](architecture/) for sequence diagrams and deeper component discussions.
- Review the [Usage Policy](USAGE_POLICY.md) before distributing ShadowChrome to colleagues or testers.
<!-- Updated: 2025-10-01 -->
