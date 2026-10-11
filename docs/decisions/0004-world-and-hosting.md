# ADR 0004: World scope and static hosting

Status: accepted initial scope, 2026-10-11.

## Decision

Single-player campaign map with local tactical encounters, local save/export, all computation in the browser, GitHub Pages-compatible static delivery. Coarse parties/economy exist in campaign; individual soldier simulation exists in battle. Initial campaign time pauses during tactical play. Worker transfer buffers avoid mandatory cross-origin isolation.

## Alternatives and consequences

Seamless world streaming and persistent multiplayer multiply scope before battle correctness and content production are proven. Backend storage/accounts conflict with the initial all-static operational model unless separately hosted. The chosen scope makes battle capacity and a complete loop testable early, but includes encounter transitions and no cloud synchronization.

## Gate/revisit

Campaign encounter transactions conserve roster/resources and recover from interrupted saves; Pages base-path deployment works. Revisit seamless streaming or multiplayer only with a new product/architecture ADR, measured core capacity and an explicit operations/networking plan. Static hosting of client files alone cannot provide an authoritative server.
