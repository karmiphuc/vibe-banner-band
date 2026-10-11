# Mounted formation tactics 0.6

Implemented experiment, 2026-10-11. These are original, Bannerlord-inspired tactical controllers, not a recreation of its private AI implementation.

## Try it

Open the [battle laboratory](https://karmiphuc.github.io/vibe-banner-band/?v=0.6). The combined-arms encounter starts paused with five formations per army. Select Roman or Gallic **formation 3 (cavalry)** and choose **Flank left + charge**, **Flank right + charge**, or **Skein charge**. Select **formation 4 (horse archers)** and choose **Circle left**, **Circle right**, or **Feint & evade**. Start the battle. Each army can use different tactics simultaneously.

The selected formation's banner and command status show its actual phase. The ground outline marks its ordered layout and the route line joins its current center to its destination. Cavalry automatically uses a filled wedge; horse archers use loose ranks. A manual movement, placement, facing, frontage or formation order cancels the controller. **Cancel tactic** holds at the group's current center. Fire discipline remains independent.

## Behavior

| Tactic | Executed behavior |
| --- | --- |
| Cavalry flank left/right | Form up; move to a side approach with clearance based on both formations' footprints; aim toward the target; commit through it; withdraw along the charge direction; regroup and repeat. |
| Skein charge | Form a filled wedge and charge through the selected enemy formation; withdraw and regroup before another charge. The charge destination is fixed at commitment, so riders do not continuously chase a moving centroid. |
| Circle left/right | Move the formation around successive octagonal waypoints around a live enemy formation, retaining mounted shooting and turning limits. Radius includes formation size. Nearby threats trigger an outward escape before resuming. |
| Feint & evade | Approach into bow range, then pull back on proximity, nearby threat or approach timeout; resume after completing or timing out the withdrawal. |

Target acquisition uses nearest standing enemy formation, with stable ties and a persistent lock until that group disappears. It does not infer enemy intentions or choose exposed archers strategically. Loss of a majority of mounts, exhausted horse-archer ammunition, or no remaining targets ends the maneuver in a visible `spent` hold. An explicit new order can restart it. Individual morale, attacks, equipment, horse loss, collisions, acceleration, fire arcs and brace impacts still apply.

## Determinism and extension points

[`src/sim/tactics.ts`](../src/sim/tactics.ts) owns the small pure controller. It runs every 12 simulation ticks using the existing formation census, with no DOM, renderer, timers or random choices. Its cost is bounded by formation count, currently ten. Each formation stores kind, phase, phase-start tick, target index, side, cycle counter, orbit waypoint, destination and charge direction. These fields participate in the authoritative hash and are independently copied into summaries and checkpoints. Public replays reconstruct them from validated tactical orders.

Skein is restricted to cavalry, preserving siege crew stations. Its layout fills ranks 1, 3, 5 and so on, then caps width at the selected frontage and adds trailing ranks. Stable member ordinals determine slots. Slots are centered on the formation's mean, rotate with its eight-way heading and respect existing battlefield fitting. Formation identity remains independent of role.

`battle-lab-6` and worker protocol 6 intentionally reject incompatible older replays/clients; unit content and packed soldier records are unchanged. Invalid mixed-role tactic orders are rejected before any formation is mutated. `none` is valid for any role. Infantry, foot ranged and siege formations keep their existing advance, hold, brace, charge, placement and fire commands; this release adds autonomous phase controllers specifically for mounted roles.

## Limits and next work

This is tactical behavior, not a new navigation or strategic AI system. The existing local rock avoidance and explicit ford routing remain. Fixed phase deadlines prevent permanent waits for perfect cohesion, but a timeout can commit an imperfectly assembled cavalry group. Enemy collision and crowded river crossings can disrupt a maneuver. Circling uses eight waypoints and a size-adjusted group radius, not individual smooth orbit lanes or a guaranteed firing solution. Very large mounted groups can exceed useful bow range around a large enemy block. No automatic search for unbraced flanks, coordinated infantry pinning, morale-aware target scoring or terrain-aware escape planning is claimed.

Follow-up work should measure these failure cases, then add threat/terrain-scored approach lanes and role-specific target selection without changing per-soldier authority or rendering dependencies.

## Verification

Tests cover wedge slots, flank commitment and repeated phases, circling direction, threat-triggered feints, ammunition exhaustion, atomic role rejection, cancellation, independent checkpoint state and full replay continuation. Chromium exercises role-sensitive controls and verifies an active 720-tick mounted-tactics replay against the headless hash. The benchmark runner [`tools/bench/mounted-tactics.ts`](../tools/bench/mounted-tactics.ts) records orders, phase traces, hashes and headless timing with runtime/hardware context; headless timings do not qualify browser FPS.

### Recorded scale run

[Raw timings and phase traces](evidence/battle-lab-v6-mounted-tactics.json): one 1,800-tick highlands run per size, seed/config/orders included, first 30 ticks excluded from timings; Node v24.19.0 via tsx, Linux, shared Intel Xeon Platinum 8370C CPU at 2.80 GHz. Browser automation was stopped during measurement. This measures headless source execution, not release-renderer frame time.

| Total soldiers | p50 tick | p95 tick | p99 tick |
| --- | --- | --- | --- |
| 600 | 3.409 ms | 7.064 ms | 9.693 ms |
| 2,000 | 11.802 ms | 17.273 ms | 24.846 ms |
| 5,000 | 33.796 ms | 53.736 ms | 77.916 ms |

The 5,000-soldier case exceeds the 33.3 ms simulation budget and remains a capacity experiment. The traces show repeated mounted phases, but many flank/charge legs hit their deadline; they do not establish consistently successful flank arrival or charge-through cohesion. Distance/terrain-aware deadlines and approach planning need further tuning before treating this as polished battle AI.

[Validation record](evidence/validation-v6.json): 53 headless/model tests, all 11 Chromium scenarios, and a final targeted mounted-tactics rerun after the last controller/role-validation refinements.
