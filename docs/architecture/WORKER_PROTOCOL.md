# Worker and session protocol

Status: proposed v1 contract. One dedicated simulation worker; main thread owns DOM/input/renderer/audio. Transferable ArrayBuffers are the baseline. SharedArrayBuffer and multiple simulation writers are deferred.

## Ownership and handshake

Main sends `init { protocolVersion, simulationVersion, contentHash, sessionId, checkpointOrSeed, capacities }`. Worker validates compatibility and memory limits before allocating, then replies `ready { sessionId, tick, acceptedVersions }` or a structured fatal error. Only ready sessions accept commands. Each message includes session identity; ignore stale messages from disposed sessions.

Catalog data is immutable after initialization. The worker never owns Three.js objects. The renderer never mutates authoritative arrays. A transferred buffer is detached from its sender until explicitly returned.

## Command envelope

`{ sessionId, issuerId, sequence, targetTick, kind, payload }`. Allowlisted kinds and bounded payload schemas, no executable code. Main requests a tick using its latest acknowledged tick plus a small configured input lead. Worker acknowledges the **actual accepted tick**, which becomes the replay command; local late commands are assigned to the next admissible tick or rejected according to a single documented policy. Proposed local policy: reschedule to next admissible tick and acknowledge, never silently discard. Multiplayer will need a different ADR.

Deduplicate `(issuerId, sequence)`, preserve stable ordering, reject impossible/far-future ticks and queue floods, and re-check gameplay preconditions at execution time. Show movement/selection previews immediately but avoid presenting unconfirmed damage as authoritative.

## Snapshots

Versioned packed header: session, sequence, authoritative tick, counts, byte offsets/lengths, simulation status. Entity records include stable ID/generation, quantized position, heading, action/animation state, team/loadout IDs and visibility-relevant flags. Render catalogs supply static material/mesh references. Do not ship strings or nested per-soldier objects every tick.

Start with full snapshots at up to tick frequency; profile before introducing delta compression. Main retains two immutable snapshots for interpolation (approximately one tick visual delay). Prefer interpolating the past to extrapolating through walls. Player prediction is a separate optional feature requiring reconciliation tests.

A 32-byte illustrative soldier record × 2,000 units × 30 Hz is 1.92 MB/s of payload before projectiles/events. It is a sizing example, not the final layout or measured bandwidth.

## Buffer pool and backpressure

Use a small bounded pool (initial candidate: four buffers). Worker fills an available buffer; main returns buffers after they are no longer used by interpolation/upload. Do not detach a buffer still referenced by renderer code. If none is available, skip a visual snapshot and continue authoritative work; never allocate an unlimited backlog. Buffer size growth happens at a controlled boundary with an acknowledged capacity change.

Discrete gameplay events use sequence IDs and a bounded reliable delivery/ack mechanism or checkpointed event batches. Do not lose victory, damage confirmation, or save completion because a visual snapshot was dropped. Cosmetic particles can be coalesced/dropped. Overflow triggers an explicit resync/pause/error policy; mandatory outcomes are never silently overwritten.

## Time, lifecycle and failure

Worker owns tick scheduling; elapsed time requests stepping but is never read inside rule evaluation. Pause/resume and command acceptance boundaries are acknowledged. A save request captures a coherent tick boundary, not partially updated arrays. Worker crash/version failure pauses presentation and offers restore from a verified checkpoint. Termination releases buffers and listeners; a new session gets a new ID.

## Tests

Stale session messages; duplicate/late commands; wrong protocol/content hash; detached buffers; main-thread stalls; pool exhaustion; event overflow; pause during loading; save during active attack; worker termination/restart. Snapshot loss/reordering must not affect replay state. Include real transferable-buffer browser tests, not only mocked `postMessage`.

Reference: [MDN transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).

## Packed layout introduced in PoC protocol 5

The current experiment has a three-buffer pool. Packed Int32 header: tick, actor count, projectile count. Actor stride 29 preserves original 0–20 fields and appends mount HP, pace, mount corpse X/Z, mount death tick, engine ID, terrain height and target ID. Projectile stride 10 appends height, kind and vertical velocity to the previous seven fields. The projectile tail is followed by an engine count and 14 integers per engine: ID, X, Z, heading, HP, ammo, cooldown, shot serial, surviving crew count, team, deployment ticks, terrain height, aim X/Z. See [ADR 0008](../decisions/0008-combined-arms-and-terrain.md). Proposed envelopes above remain future work; the implemented schema is in `src/platform/protocol.ts`.

## Mounted tactics compatibility (0.6)

The current experiment uses protocol **6**, simulation **battle-lab-6**. Formation summaries include optional authoritative tactical phase state. Validated `tactic` orders select mounted behaviors or cancel them; incompatible role selections reject atomically. Packed soldier/projectile/engine strides remain unchanged. See [mounted tactics](../REFINEMENT_06.md).
