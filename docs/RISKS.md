# Risks and unresolved decisions

Updated 2026-10-11. Owners are responsibility roles, not assigned maintainers. Use evidence gates to resolve decisions; do not ask for blanket approval of unspecified future systems.

| Risk | Impact | Mitigation / trigger | Owner / gate |
| --- | --- | --- | --- |
| Independent animated equipment destroys batching | Upper battle size fails despite cheap static meshes | Benchmark real rigs, grips, weapons and transitions; evaluate GPU clip path | Rendering / M0–M4 |
| Dense spatial buckets remain quadratic | Chokepoints stall or contacts become incorrect | Density metrics, subdivision/queue fallback, bridge stress fixtures | Simulation / M3 |
| Float/order/async drift | Replays disagree across browsers | Numeric contract, stable ties, deterministic budgets and hash matrix | Simulation / M1 onward |
| Armor/weapon clipping | Detailed models are unusable in motion | Approved fits, pose suites, socket tolerances and manual review | Technical art / M2 |
| Worker backlog or detached buffers | Stalls, corrupt views, lost outcomes | Bounded pool, explicit ownership and reliable event channel | Platform / M3 |
| Asset variety creates huge memory/downloads | Browser crashes or poor load time | Bounded loadout cache, shared atlases, measured decoded memory, chunk loading | Rendering/art / M2–M4 |
| No named target hardware access | Unsupported performance claims | Record access gap; withhold device qualification until measured | QA / M0–M4 |
| Campaign results applied twice | Duplicated troops/rewards | Encounter IDs, transactional reconciliation and conservation checks | Gameplay / M5 |
| Browser save eviction/failed migration | Campaign loss | Export/import, backups, safe migrations, explicit storage errors | Platform / M5 |
| Asset license incompatible with distribution | Cannot publish intended content | Exact source/license records before import; retain existing repo license | Maintainer / every asset import |
| Dual-engine effort | Fragmented implementation and testing | One baseline, short evidence-driven alternative evaluation | Engine / M0 |
| Engine abstraction overgrowth | Months spent before playable loop | Narrow interfaces, build only required modules, dependency-ordered roadmap | Maintainer / every milestone |
| Misleading generation claims | Primitive output mistaken for production art | Qualification status and explicit missing checks | Tools/art / M2 |
| Siege or seamless world added too early | Navigation/streaming scope explosion | Deferred ADR and independent fixture suite | Design / M7 |

## Open decisions and current defaults

| Decision | Current working default | Resolve by |
| --- | --- | --- |
| Production engine | TypeScript + Three.js; Godot comparison if needed | M0 engine evidence |
| Exact dependency/tool versions | Not yet selected; pin one tested set | ENG-001 |
| Crowd animation representation | Evaluate bone-palette/clip textures against baseline skinning | PERF-001 / RENDER-001 |
| Numeric profile and PRNG algorithm | Integer local space, 30 Hz; explicit algorithm still to select | SIM-001/003 |
| First qualified character source | Compatible Quaternius family is a candidate | ART-001 |
| Exact quality/budget targets | Provisional LOD/texture budgets | M2/M4 evidence |
| Projectile friendly fire | Undecided; must be explicit | COM-002 |
| Campaign battle time | Campaign pauses during battle | Confirm in WORLD-003 |
| Code license intent beyond existing text | Preserve existing GPL v3 text; no unilateral relicense | Maintainer before adding a license identifier policy |
| Multiplayer/seamless/mobile | Deferred | New ADR after core gates |

## Scope discipline

This plan does not guarantee 2,000-unit 60 FPS, universally deterministic GPU output, automatic production-quality humanoids, engine-independent animation export, or free hosting at unlimited bandwidth. It defines what must be measured and validated before those claims can be narrowed or made.
