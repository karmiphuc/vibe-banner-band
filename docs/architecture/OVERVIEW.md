# Engine architecture

Status: accepted planning boundaries; TypeScript/Three.js toolchain is a proposed baseline under [ADR 0001](../decisions/0001-browser-engine.md).

## Principles

Build a game-specific engine around a pure headless simulation, not a universal engine framework. Rendering, persistence, transport, content tools, and browser APIs are adapters. A stable content contract provides most extensibility; avoid per-unit object hierarchies and unrestricted event/plugin systems in hot loops.

Authoritative outputs depend on initial state, rules/content version, and recorded commands. Rendering and machine performance do not determine outcomes.

## Proposed workspace

```text
apps/web/                   composition root, browser lifecycle, UI/input
packages/sim-core/          integer math, IDs, PRNG, tick/command primitives
packages/battle/            units, formations, navigation, combat, morale
packages/campaign/          travel, parties, economy, encounters
packages/content/           schema validation, catalog compilation and IDs
packages/protocol/          versioned messages and render snapshot layouts
packages/render-three/     camera, instancing, animation, picking and VFX
packages/platform-web/     worker transport, IndexedDB, loading and audio
packages/replay/            canonical serialization, checkpoint/hash tooling
tools/assets/              Blender build and validation tools
tools/bench/                headless/browser scenarios and report export
content/source/            editable catalogs and recipes
content/compiled/          reproducibly generated catalogs (policy set in M0)
tests/fixtures/            small reviewed deterministic scenarios
```

These paths describe future code; do not scaffold empty packages merely to match this tree. Start with the modules needed by M0/M1 and split when there is a real dependency boundary. Pin the selected Node/package manager/compiler versions and a single lockfile in M0.

## Allowed dependencies

| Module | May depend on | Must not depend on |
| --- | --- | --- |
| sim-core | audited deterministic utilities | DOM, renderer, engine physics, browser/storage APIs |
| battle | sim-core, compiled content types | presentation, platform, campaign implementation |
| campaign | sim-core, compiled content types | battle internals, presentation |
| content compiler | schemas, asset manifests, offline file adapters | running game state |
| protocol | transport-neutral value types | Three.js objects, mutable simulation internals |
| render-three | protocol, render catalogs, Three.js | direct authoritative state mutation |
| platform-web | protocol and adapter interfaces | battle rules |
| apps/web | all composition-facing interfaces | bypasses of ownership contracts |

Battle and campaign exchange a versioned encounter input/result via the application/session layer. Never let them mutate each other's collections. Enforce boundaries with import rules once runtime tooling exists.

## Data ownership

- One simulation owner writes authoritative state. Typed arrays hold frequently iterated components; stable numeric IDs map to slots.
- Generation/version fields on handles prevent stale references when slots are reused. Do not expose dense-array indexes as save identities.
- Immutable compiled catalogs are shared logically; transfer/copy according to runtime capability.
- Commands enter a validated queue. Domain events are bounded, ordered facts used by UI/audio/replay; avoid synchronous callbacks that mutate state during iteration.
- Reusable scratch memory, spatial buffers and event pools have declared capacities and overflow behavior. A full buffer cannot silently delete combat events.

## Tick systems

Use an explicit ordered system list and staged writes. The [determinism contract](DETERMINISM.md) owns ordering. Resolve simultaneous effects according to documented phase rules; do not let array traversal accidentally choose combat winners. Unit archetypes are data, not subclasses.

## Core interfaces (illustrative, not implemented)

```ts
interface SessionCore {
  enqueue(command: ValidatedCommand): EnqueueResult;
  step(): TickSummary; // exactly one authoritative tick
  writeRenderSnapshot(target: ArrayBuffer): SnapshotInfo;
  checkpoint(): CanonicalCheckpoint;
  restore(checkpoint: CanonicalCheckpoint): void;
}
interface EncounterBoundary {
  prepare(input: EncounterInput): EncounterSession;
  reconcile(result: EncounterResult): CampaignTransaction;
}
```

Definitions belong to protocol/content modules, not to a renderer. Explicitly version formats before creating fixtures. Do not expose arbitrary `any` payloads, engine nodes, promises, or wall-clock delta inside the deterministic step.

## Lifecycle and failure

Loading → validating catalogs → initializing session → running/paused → finishing → reconciling → saving → disposed. Each transition has one owner. On worker failure, pause and offer the last verified checkpoint; do not silently reinitialize a different battle. On graphics-context loss, retain simulation state, pause local play, rebuild presentation resources, and resume deliberately.

Asset loading cannot block halfway through an authoritative tick. Preload encounter-required catalogs/assets or use declared visual placeholders without changing mechanics. Missing authoritative content is a hard load failure. Dispose workers, subscriptions, textures and audio handles on session exit.

## Extensibility without framework creep

Add equipment/units through validated catalogs, new abilities through a bounded set of supported effect types, and new biomes through terrain/content rules. A new authoritative effect type requires implementation, versioning and replay tests. Third-party executable plugins and hot-reloading mechanics during an encounter are deferred. Future Wasm kernels sit behind measured subsystem interfaces and must pass identical golden vectors; there is no planned second simulation implementation.
