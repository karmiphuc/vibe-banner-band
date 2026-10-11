# ADR 0002: Headless authoritative simulation

Status: accepted architecture, 2026-10-11; not implemented.

## Decision

Use explicit integer/quantized rules, fixed ticks, stable scheduling, commands and canonical checkpoints in a renderer-independent core. A single worker owns state initially. Engine physics, animation callbacks, wall clock, cosmetic randomness and GPU results do not drive outcomes.

## Alternatives and consequences

Using engine bodies/controllers would shorten an early prototype but would not establish cross-runtime determinism. Floating-point lockstep may work within restricted configurations but is not the proposed guarantee. Integer rules require careful range/rounding design, predictable contact behavior and versioned PRNG tests; they do not guarantee determinism automatically.

Single-owner execution simplifies correctness and transfer ownership. Multithreading and Wasm are later measured optimizations, each requiring unchanged replay results. Determinism supports debugging/replays and future networking but does not implement networking, anti-cheat or authority distribution.

## Gate/revisit

[M1 replay matrix](../ROADMAP.md) and [numeric contract](../architecture/DETERMINISM.md). Revisit numeric precision/rate before freezing v1 if movement/physics quality is inadequate; document compatibility changes. Never weaken the claimed guarantee silently.
