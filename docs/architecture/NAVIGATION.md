# Navigation, formations and crowds

Status: formation anchors, ranked slots, eight-way facing, frontage, rank refill and two-leg flank approaches exist in [PoC 0.4](../REFINEMENT_04.md). The hierarchy and general pathfinding below remain planned. The difficult target is mixed-arms combat at density and chokepoints, not merely moving 2,000 dots on open ground.

## Hierarchy

Campaign parties use a coarse region/road graph. Tactical formations use a sector/portal graph and shared local flow fields. Soldiers follow stable formation slots and use local terrain/contact steering. A formation contains membership, anchor, facing, width/depth, spacing, movement class, order, and navigation request state.

Initial commander decisions: 1–2 Hz; formation decisions: 5–10 Hz; movement/contact and active combat: 30 Hz. These are provisional tick-based cadences, not camera-distance rules. Stagger by stable ID; changes to AI cadence are versioned simulation changes.

## Terrain data

Versioned quantized height/passability/cost fields and movement classes (foot, mounted; more later). Inflate static obstacles for class clearance. Static walkability, dynamic unit contact, and formation occupancy are separate layers; do not stamp every moving soldier into a global path-cost rebuild. Connectivity/island IDs reject unreachable goals early.

Sector and cell sizes are benchmark parameters. An initial 1–2 metre navigation cell is a trial, not a collision-body resolution or final scale. Fine collision geometry remains separate. Prevent diagonal corner cutting and invalid portal transitions.

## Path requests

1. Resolve a reachable formation destination and facing.
2. A* over sectors/portals with stable tie-breaks.
3. Build integration and direction fields for required sectors.
4. Cache by goal/portal, movement class, terrain revision and integration settings.
5. Allocate a deterministic number of expansions per tick across ordered requests.
6. While pending, retain a still-valid route or hold safely. Do not walk through a newly closed gate.

Start with a correct weighted integration method and bounded cache; introduce sophisticated smoothing after correctness. Local terrain edits invalidate only affected fields, while a terrain revision prevents stale use. Cap cache memory with deterministic eviction metadata if eviction can influence authoritative scheduling.

## Formation movement

Assign slots with stable IDs, retain assignments through ordinary movement, and reassign only on explicit formation changes or casualties using deterministic local matching. Avoid solving a global optimal assignment every tick. Compress at narrow passages, queue through, then reform with defined hysteresis. Charge releases some slot constraints; hold prioritizes facing and ground retention; retreat selects reachable escape regions.

## Spatial queries/contact

Use a uniform grid/spatial hash for nearby unit and projectile candidates. Rebuild/update in canonical order; track bucket density and candidate counts. Separate broad phase from exact range/shape tests. Cache valid targets and stagger reacquisition. Projectiles query swept cells, not only the destination cell.

Resolve local contact with bounded iterations, fixed pair ordering, and movement-class/formation priorities. Units cannot become arbitrarily overlapped because a neighbor budget was exceeded. Candidate caps may apply to optional awareness/target selection; mandatory collision contacts require a correctness-preserving fallback (cell subpartitioning, deterministic queues, or controlled density handling).

A grid is not a worst-case complexity guarantee: one packed cell can still create quadratic work. Dense bridge and cavalry contact tests are mandatory. ORCA is an optional evaluated steering approach, not the default combat-contact model; cooperative avoidance can undermine intentional shield-wall pressure.

## Congestion and recovery

Deterministic right-of-way, passage reservations at formation level, minimum forward progress thresholds, stuck-state counters, local detours, and eventually alternate formation routes. Avoid reciprocal repath oscillation through cooldown/hysteresis. Detect physically impossible orders and display a reason. Never teleport or disable collision silently to make a benchmark pass.

## Instrumentation and gate

Record expansions/tick, cache hit rate/memory, queue latency in ticks, max cell occupancy, candidates/unit, contact iterations, stuck duration, formation cohesion error, and rejected destinations. Test opposing bridge traffic, gates opening/closing, island goals, mass retreat, crossing cavalry, and repeated order spam with replay equality.

Primary reference: [Emerson's flow-field tiles chapter](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter23_Crowd_Pathfinding_and_Steering_Using_Flow_Field_Tiles.pdf); [ORCA research](https://gamma.cs.unc.edu/ORCA/). Neither source proves this game's browser performance.
