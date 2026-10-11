# Deterministic simulation

Status: required design contract; implementation and cross-runtime proof are M1 work. A fixed timestep, seeded random generator, or Wasm binary alone is not proof of determinism.

## Identity and scope

Same initial checkpoint + simulation version + compiled content hash + command log must produce the same authoritative state at tick T on every declared supported runtime. Pixel output, audio scheduling and frame rate need not match. Version mismatches are rejected unless an explicit migration exists; replays are tied to their original simulation/content versions.

Target 30 simulation ticks per second initially, independent of render frequency. Combat durations are integer tick counts with half-open intervals. An increased tick rate is a rules change, requiring new fixtures and performance evidence.

## Numeric contract to implement in M1

- Battle coordinates: signed integer local positions, initially 1,024 units/metre, with a proposed maximum local extent of ±2,048 metres per axis. Region coordinates are separate integers; do not represent a whole continent in one local vector.
- Headings: unsigned 16-bit turns. Versioned integer lookup tables or deterministic integer vector tests replace authoritative runtime trigonometry.
- HP, stamina, morale and cooldowns: integers with declared saturation/range behavior. Do not silently wrap gameplay counters.
- TypeScript arithmetic may use exact integer-valued Numbers only when all intermediates are proven within ±(2^53−1). Do not assume that storing to Int32Array makes intermediate multiplication safe. Wider operations use a specified implementation and tests; BigInt is allowed where justified, not assumed free in hot loops.
- Division rounds toward zero unless a named operation explicitly requires floor; negatives have golden tests. Square root/normalization and distance comparisons use specified integer algorithms and bounded operands. PRNG uses explicit unsigned-32 operations, including `Math.imul` where appropriate.
- Arithmetic overflow is a development assertion and controlled session error in production; define intended saturating operations separately. Never rely on undefined native overflow when introducing Wasm.
- Authoritative navigation and collision use quantized ground-plane geometry. Godot/third-party rigid bodies can be visual effects, not authoritative inputs.

The proposed spatial range permits common local squared-distance comparisons within exact Number integer range; every compound expression still requires its own bound analysis. Profile precision versus cost before freezing numeric-format v1.

## Ordered tick phases

1. Consume commands ordered by `(targetTick, issuerId, sequence)`; validate current preconditions.
2. Advance bounded strategic/formation AI work and deterministic navigation queues.
3. Build movement intentions from the tick-start state.
4. Resolve terrain/local contact with a fixed iteration count and stable pair order; commit positions.
5. Advance actions; collect hits against the post-movement, pre-damage state.
6. Resolve blocks and simultaneous damage batches; apply wounds, deaths and interruptions using explicit priorities.
7. Apply ordered morale/supply effects, routing and cleanup.
8. Commit deferred spawns/despawns, increment tick, emit state hash/snapshot if scheduled.

Initial policy: actors eligible at phase 5 may trade lethal hits in the same tick. Damage is accumulated before death cleanup. Reservation conflicts use stable IDs and explicit priority rules. If design changes this, update the combat contract and golden fixtures together.

## Randomness

Choose and pin one specified PRNG algorithm in M1 with published test vectors. Persist full state. Separate combat, AI, campaign and generation streams; cosmetic randomness never consumes those streams. A counter-based scheme keyed by seed/entity/event is an alternative, not a simultaneous second convention. Specify zero seeds, stream derivation, bounded-integer sampling and consumption order. Never use `Math.random`, current time or unordered collection traversal.

## Scheduling and bounded work

- Stable entity and formation IDs; explicit tie-breaks in target ranking, A* queues, flow-field queues, and contact pairs.
- AI cadence is tick-based and ID-staggered. Work budgets count operations/expansions, not milliseconds.
- Async navigation or asset jobs cannot change the tick when authoritative data becomes usable based on completion time. Initially run navigation within the simulation owner. Later parallelization must use deterministic barriers/fallback semantics.
- Do not skip authoritative ticks under load. Limit catch-up work, expose slow simulation, and pause or let game time progress more slowly. Snapshots may be dropped; commands and outcomes may not.
- Hidden tabs pause the local single-player session via a recorded lifecycle event; resumption does not fast-forward minutes of battle.

## Serialization and hashes

Define a canonical binary format: explicit byte order, stable field and entity order, no padding/uninitialized bytes, fixed type widths, length bounds, and schema/version header. Include tick, pending commands, action hit registries, PRNG states, deterministic scheduler cursors and queues. Exclude camera, render interpolants, audio, transient caches that can be rebuilt identically, and wall-clock diagnostics.

Use a versioned fast state hash for regular comparisons and SHA-256 content/artifact digests for identity. Hash equality is evidence, not a cryptographic anti-cheat mechanism. Compare full state around the first divergence. A replay stores initial checkpoint, commands, periodic checkpoint/hash records, simulation/content versions and event sequence metadata.

## Proof gate

Run the same log in headless mode and supported browsers at 30/60/144 render FPS; perturb snapshot delivery and worker scheduling; disable graphics and particles; save/reload mid-action; compare every scheduled authoritative hash. Include simultaneous kills, negative coordinates, PRNG edge cases, equal-cost paths, congested cells, slot reuse, and canceled commands. No strict-determinism claim until the matrix passes. See [testing](../engineering/TESTING.md).

Reference: [Godot physics documentation](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html) explicitly does not guarantee deterministic physics.
