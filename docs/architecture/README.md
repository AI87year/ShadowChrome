# ShadowChrome Architecture Guide

ShadowChrome operates entirely inside the Manifest V3 environment. This guide collects the
architectural notes that developers need when auditing, extending, or embedding the
extension. Each chapter drills into a different facet of the codebase and cross-references
the concrete source files in `src/`.

- [`components.md`](components.md) — inventory of every significant module with
  responsibility notes and entry points for further reading.
- [`workflows.md`](workflows.md) — walkthroughs of the main runtime flows: importing
  keys, connecting to proxies, mirroring registries, and reconciling storage.

All documents assume familiarity with the high-level overview in [`docs/DETAILED_DOCUMENTATION.md`](../DETAILED_DOCUMENTATION.md)
and the user-facing instructions in [`docs/USER_GUIDE.md`](../USER_GUIDE.md).

## Design pillars

ShadowChrome's implementation is anchored around a few architectural choices:

1. **Service-worker core.** `background.js` acts as the sole long-lived execution
   environment. The worker hosts the Shadowsocks client, orchestrates network fetches,
   and mediates state changes through `chrome.runtime` messages.
2. **Stateless UI surfaces.** `popup.js` and `options.js` only render the current state
   retrieved from storage and dispatch intent messages. They never persist sensitive
   data beyond the lifetime of their document.
3. **Explicit storage model.** Persisted configuration lives in `chrome.storage.local`
   and flows through `serverStore.js`, `registry.js`, and related helpers. The state
   schema is documented in [`components.md`](components.md#data-and-storage).
4. **Deterministic networking.** All fetches run through [`utils/fetchWithTimeout.js`](../../src/utils/fetchWithTimeout.js)
   to provide repeatable failure behaviour inside the constrained MV3 environment.
5. **Extensibility through composition.** Each feature—Outline integration, CensorTracker
   mirroring, diagnostics—lives in an isolated module with a thin messaging interface so
   contributors can understand and modify behaviour without touching unrelated code.

Use this directory as the canonical reference for how those pillars translate into code.
<!-- Updated: 2025-10-01 -->
