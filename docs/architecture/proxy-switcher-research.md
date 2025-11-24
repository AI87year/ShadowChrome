# Proxy switcher research

This note distills transferable ideas from mature proxy extensions to guide upcoming ShadowChrome work. All recommendations focus on MV3-compatible patterns and avoid code reuse from GPL-licensed projects.

## Shadowsocks Chrome App
- Legacy Chrome App that runs a full Shadowsocks client through `chrome.sockets` with many CFB/OFB/CTR ciphers.
- Strengths to mirror: minimal UI that saves a server entry and keeps running in the background; proven TCP/UDP socket plumbing for Shadowsocks.
- Constraints: Chrome Apps are deprecated and the CoffeeScript build targets MV2-era APIs, so only architecture ideas—not code—fit our MV3 service worker.

## ZeroOmega (SwitchyOmega MV3 fork)
- Modern MV3 port that preserves SwitchyOmega workflows: profiles, rule-based auto-switching, and PAC generation via `omega-pac`.
- Its `omega-target` abstraction cleanly separates browser API calls from profile logic, which is a reusable design pattern even though the GPL license prevents direct code reuse.
- Ideas to adapt:
  - Represent proxy setups as reusable profiles that can be toggled quickly from the popup.
  - Keep a dedicated PAC compiler pipeline to merge rule lists and emit deterministic scripts.
  - Maintain an options-side schema editor that edits profiles without touching runtime networking code.

## SwitchyOmega (AMO listing)
- Highlights proven UX expectations: quick switching from the toolbar, per-domain auto mode, and import/export of configuration files.
- The product positioning reinforces that backup/restore flows and human-readable rule editors are considered baseline proxy-switcher features.

## FoxyProxy Browser Extension
- Offers polished per-pattern routing with a built-in pattern tester, tab/container-specific proxy selection, and export/import powered by the downloads API.
- Includes optional privacy toggles (clear browsing data, limit WebRTC) that are gated behind optional permissions, keeping the default footprint small.
- The MV3 upgrade demonstrates workable permission and storage scopes for a large feature surface without remote code.

## Immediate opportunities for ShadowChrome
- **Profile-centric state model.** Introduce a profile layer on top of saved Shadowsocks endpoints so the popup can switch between "Direct", "CensorTracker fallback", and user-added profiles without reimporting keys each time.
- **Backup and sharing.** Add a downloads-backed export/import flow for server lists, registries, and language preferences to mirror SwitchyOmega/FoxyProxy backup practices while keeping sensitive fields encrypted at rest.
- **Rule and PAC tooling.** Extend `registry.js` with a deterministic PAC generator and a lightweight pattern tester to debug domain-matching, inspired by FoxyProxy and ZeroOmega's `omega-pac` pipeline.
- **Diagnostics surface.** Provide a popup-accessible log view for recent proxy decisions and connection errors so users can self-serve before filing issues, echoing FoxyProxy's log tab.
