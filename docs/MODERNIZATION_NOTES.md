# Modernization notes

This round of work refines the service worker message pipeline to align with current MV3 recommendations for robust, resumable background logic.

## Rationale
- **Promise-first routing.** Converting `runtime.onMessage` handlers to async/await eliminates nested callback trees and ensures unhandled errors surface in one place. This mirrors patterns documented in recent Chrome extension guides, where message listeners are expected to return promises instead of chaining callbacks.
- **Deterministic lifecycle.** Promisified start/stop helpers make proxy lifecycle operations idempotent and easier to reason about when the worker is restarted or reused.
- **Structured fallbacks.** The dispatch helper now logs handler failures and returns consistent error envelopes, matching modern error-reporting practices for background scripts.

## Implementation highlights
- Added Promise wrappers around the Shadowsocks client start/stop callbacks.
- Centralized all message handlers into a single map for maintainable feature growth.
- Introduced a shared async responder that handles logging and consistent error payloads.

These patterns should be followed for future commands added to the service worker so that platform restarts and transient network issues remain observable and recoverable.
