# Documentation map

Updated 2026-10-11. All engine subsystems below are specified/planned unless a document explicitly records an implemented artifact. Documentation is the starting contract; implementation proves it.

| Document | Responsibility |
| --- | --- |
| [Custom battle](CUSTOM_BATTLE.md) | Implemented controls, units, mechanics and limits |
| [Review](REVIEW.md) | Double-check findings and validation |
| [Roman–Gallic models](assets/ROMAN_GAUL_RECIPES.md) | Original procedural model recipes and provenance |
| [Product](PRODUCT.md) | Player loop, scope, platform tiers, non-goals |
| [Architecture](architecture/OVERVIEW.md) | Modules, dependency rules, interfaces, lifecycle |
| [Determinism](architecture/DETERMINISM.md) | Arithmetic, tick ordering, PRNG, replay identity |
| [Worker protocol](architecture/WORKER_PROTOCOL.md) | Ownership, commands, snapshots, recovery |
| [Navigation](architecture/NAVIGATION.md) | Formations, flow fields, crowd contact, bounded work |
| [Rendering](architecture/RENDERING.md) | Camera, animation, LOD, crowd batching, picking |
| [Combat](design/COMBAT.md) | Attacks, equipment, skills, morale, cavalry |
| [Content](design/CONTENT.md) | IDs, schemas, extension points, compilation |
| [Campaign and persistence](design/CAMPAIGN_AND_SAVES.md) | World scale, encounters, saves, migration |
| [Asset pipeline](assets/PIPELINE.md) | Source art, assembly, equipment generation, quality gates |
| [Asset contracts](assets/CONTRACTS.md) | Units, rig, sockets, clips, manifests, budgets |
| [Testing](engineering/TESTING.md) | Verification strategy and CI stages |
| [Performance](engineering/PERFORMANCE.md) | Scenarios, metrics, provisional budgets, evidence |
| [Deployment](engineering/DEPLOYMENT.md) | GitHub Pages, builds, caching, release/rollback |
| [Roadmap](ROADMAP.md) | Milestones, work items, dependencies and exit gates |
| [Risks and open questions](RISKS.md) | Failure modes, mitigations, unresolved decisions |
| [Decision records](decisions/README.md) | Durable architectural choices |
| [Research sources](RESEARCH.md) | Primary references, claims and limitations |
| [Content example](examples/vertical-slice.json) | Illustrative equipment/skill/asset linkage |
| [Reusable asset skill](../skills/deterministic-medieval-assets/SKILL.md) | Agent workflow and acceptance requirements |

## Reading paths

- Engine implementation: architecture → determinism → worker protocol → navigation → testing/performance.
- Gameplay/content: product → combat → content → campaign/saves.
- Art/tools: asset pipeline → asset contracts → reusable skill → equipment experiment.
- Project sequencing: roadmap → risks → decisions.

## Status vocabulary

- **Required constraint:** user/project requirement, such as static-host compatibility.
- **Proposed baseline:** recommended starting choice awaiting implementation evidence.
- **Accepted architecture:** boundary adopted for planning; still needs verification in code.
- **Verified experiment:** narrowly scoped executable evidence with recorded conditions.
- **Deferred:** intentionally outside the first playable scope.

Each subsystem document owns its contract. Other documents link to it rather than copying detailed constants. The roadmap owns completion status. Research recommendations never override measured engine behavior.
