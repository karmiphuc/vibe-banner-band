# Combined-arms proof of concept 0.5

The default encounter now fields 300 Romans against 300 Gauls in five formations per army: infantry, javelineers, cavalry, mounted archers and ballista crews. **The two river crossings** adds a divided valley; **Five thousand** enables 2,500 soldiers per army. The 640 × 640 m map is 5.16 times the previous arena width and 26.6 times its area.

## Try it

1. Begin **Eagles on the highlands**. Select cavalry formation 3, choose **Charge**, then use **Place line** and **Flank left/right** to reposition it. Cavalry needs room to accelerate and turn.
2. Select infantry formation 1 and **Brace**, facing the approaching cavalry. Test the same approach with **Hold here** and ordinary line spacing.
3. Mounted archers in formation 4 start in **Skirmish**. They move while shooting, use finite arrows, and dismount if their horse is lost.
4. Select siege formation 5 and **Hold here** to deploy its engines. Two surviving crew are needed to fire. Moving resets deployment; **Hold fire** preserves bolts.
5. In the river encounter, route forces through either ford. Woods slow mounted troops more strongly than infantry; ridges obstruct low shots. Terrain is more than decoration, although navigation remains explicitly limited to ford routing and local rock avoidance.
6. Select a cavalry or engineer design, then **Open model workshop** to inspect equipment. Enable **Sound on** for optional synthesized hoofbeats, impacts and artillery sound. Sound is cosmetic and initially muted.
7. Export/import a replay to verify the recorded commands and outcome. Version 4 replays remain incompatible by design.

## Assets and implementation

Twelve unit designs use original deterministic runtime recipes. Horses have separate body and four leg parts, tack, bridles, reins and saddles; mounted kits add spears or bows. Ballistae include torsion bundles, frame, bolt trough, transport wheels, crank and spare bolts. Riders and crew reuse the original humanoid joint conventions. The workshop assembles the corresponding mount or engine beside the soldier.

These are experimental rigid-part models. They are not production skinned/IK characters, historical reconstructions or a complete asset-generation pipeline. Gallic horse archers and captured engines are fictional testing contingents. No third-party art or TaleWorlds assets are included. See [asset recipes](assets/ROMAN_GAUL_RECIPES.md) and [ADR 0008](decisions/0008-combined-arms-and-terrain.md).

Rendering uses troop-sized instance batches, shared materials, near/crowd humanoid detail, ground-height placement and snapshot-only animation. The worker still owns three recyclable snapshot buffers. At 5,000 soldiers the maximum buffer is 755,056 bytes (including 4,096 projectile and 200 engine slots), approximately 2.16 MiB for the worker pool before main-thread copies and GPU storage.

## Verification and remaining limits

Validation includes 47 headless/model tests, ten Chromium integration tests, the production build, authoritative dependency checks and local documentation links. The browser matrix includes an active 300-tick combined-arms Node/worker replay, formation orders, equipment workshop views and 5,000-soldier deployment/stepping. Chromium uses SwiftShader in this environment; this is not a hardware GPU qualification. Reproducible model geometry does not prove animation quality or device performance.

This is still a custom battle observer, not Bannerlord parity or the intended open-world game. Campaign, direct hero control, player combat, production animation, formation-aware global navigation, siege walls/gates, engine capture, remounting and full device qualification remain open. The larger terrain exposes navigation and ranged targeting limits; the 5,000 option must be treated as experimental.

Raw evidence: [headless combined-arms timings](evidence/battle-lab-v5-headless.json), [model recipes and geometry digests](evidence/model-recipes-v5.json). The benchmark records exact scenario configuration, seed, CPU, Node version, tick count, casualties, artillery volleys and final fingerprint. Timings are one run on a shared cloud CPU, not an isolated performance gate.

| Soldiers total | Tick p50 | Tick p95 | Tick p99 | Ballista shots over 1,500 ticks |
| --- | --- | --- | --- | --- |
| 600 | 2.531 ms | 5.034 ms | 7.081 ms | 87 |
| 2,000 | 9.424 ms | 14.144 ms | 20.968 ms | 305 |
| 5,000 | 27.282 ms | 33.197 ms | 45.726 ms | 446 |

The maximum setting is approximately at the 33.3 ms tick budget at p95, with p99 spikes above it. This leaves little headroom for a steady 30-tick simulation on this machine. The scheduler does not skip authoritative ticks to disguise that slowdown. These figures measure simulation only; rendered FPS remains unqualified.

[Validation environment and coverage](evidence/validation-v5.json) distinguish test passes and visual review from the remaining production gates.
