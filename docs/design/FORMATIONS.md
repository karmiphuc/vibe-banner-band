# Formation identity and combined-arms extension

Status: five formations per army with cohesive motion, facing/frontage, reserve deployment and flank orders implemented in combat PoC 0.4; mounted and siege behavior below is planned.

## Current contract

Each army has one to five formation specifications: `{ id, role, weight, reserve? }`. IDs are integers 0–4, displayed as 1–5. They are unique within an army and sorted canonically. Removing formation 2 does not rename formation 5. A command identifies the army plus formation ID, or `all`; it does not address every unit of a particular troop role. Infantry can therefore occupy several independent formations. Defaults are formation 1 infantry and formation 2 javelineers.

The army size includes its one autonomous commander. Reserve the commander for the first infantry formation by ID, then allocate ordinary infantry and javelineers independently. Positive integer shares of 1–100 divide each role's pool using integer largest remainders, with ascending formation ID breaking ties. Counts always sum to the army size; small armies may have empty formations. Empty formations retain identity and accepted orders. An infantry formation is required; a ranged formation is required when the javelineer percentage is nonzero. Unsupported roles fail validation rather than silently spawning infantry.

The deployment editor changes configuration before battle. Adding, deleting or redistributing formations during combat is not supported. Membership is a typed authoritative array, included in hashes and trusted checkpoints. The replay stores the validated initial roster and accepted boundary-stamped commands. Renderer quality, camera and timing do not change allocation or membership. Adjacent initial deployment files are assigned to cohorts deterministically; held/reformed slots use entity ID order.

Orders control movement, arrangement and fire discipline independently. Movement is advance, charge, hold/place or fall back; arrangements are line, shield wall or loose. These are separate from both identity and troop role. All-army placement translates formation anchors together, preserving relative offsets until an arena-boundary adjustment is needed. It does not stack all formations at the clicked point. The command selector shows standing/initial strength. Keys 1–5 select formation IDs, 0 selects the whole army. Missing IDs are not silently redirected.

[PoC 0.4](../REFINEMENT_04.md) adds a moving formation anchor, quantized facing, frontage, casualty rank refill, compact held reserves and two-leg flank approaches. Local contact and rock avoidance remain the obstacle navigation system. There is no synchronized formation pathfinding, automatic frontage negotiation or obstacle-aware slot assignment yet. Extreme placements can crowd neighboring formations at arena edges. Those require formation-level navigation and should not be solved by changing deterministic authority into renderer physics.

## Extension sequence

Keep the same five command slots for mixed armies. Five is a command-complexity limit, not five hardcoded troop classes. A future army might use infantry, archers, two cavalry wings and a siege battery; another might use five infantry cohorts. New troop roles must be registered explicitly with compatible loadouts, capabilities and movement rules.

1. **Formation navigation:** facing/frontage and geometric flank routes now exist; add deterministic destination reservations, terrain clearance and formation-level obstacle routes. Preserve stable slots where possible; reassign on recorded membership changes. Verify obstacle passages, retreating formations, opposing orders, empty/wiped groups and arena edges.
2. **Cavalry:** implement rider/mount identities and linked lifecycles, larger footprints, turn/acceleration limits, collision priority, charge impact and mounted reach. Mount casualties, dismounting and rider casualties need explicit simultaneous resolution. Reuse targeting and recorded formation orders, not infantry translation with a horse mesh.
3. **Horse archers:** compose mounted movement with ranged capabilities. Define firing arcs, turn limits, ammunition, deterministic orbit/skirmish intents and spacing. Hold fire must preserve the current movement order. Test moving-shot replay, interception and blocked retreat before exposing new commands.
4. **Siege engines:** make the engine an entity with crew assignment, deployment/rotation constraints, firing/reload state, ammunition and destruction. Crew are soldiers, not duplicate engine HP bars. Define what the unit cap counts and display soldiers and engines separately. Validate artillery elevation, friendly fire policy, terrain clearance and line of sight before release.
5. **Mixed formations and transfers:** only if needed, introduce capability aggregation and recorded reassignment commands. A formation's visual role is not permission to fire a weapon; the equipped unit capabilities are. Define unsupported/mixed orders explicitly, including siege hold/limber and cavalry shield-wall rejection.

Add narrow typed contracts when each slice needs them: locomotion and clearance, attack delivery, mount links, crew assignments and command eligibility. Do not build an unrestricted plugin runtime or a second simulation core in anticipation. Each rule change bumps simulation compatibility; each content change updates compiled content identity. Include new authoritative fields in hashes, snapshots where needed, checkpoints and replay reconstruction.

## Scale and acceptance gates

The current cap is 1,000 soldiers per side, including commanders, with up to ten total formations. Formation membership lookup is O(1); roster assignment happens only at deployment. Commands/reformation scan the bounded army, rather than issuing per-soldier browser messages. Summary strength counts are one linear pass.

Benchmark every new body/attack type in representative mixes, not only all-infantry battles: dense cavalry collision, mounted ranged crossfire, siege projectiles and crews, ten active formations, and mass routing. Record seed, full roster, runtime/hardware, warm-up, tick and render percentiles, memory and replay hash. A 2,000-soldier Node simulation result does not qualify 2,000 mounted actors or a browser renderer. Require repeatable outcomes across stepped/batched simulation and worker replay, conservation of linked entities, bounded projectile/command capacity and target-device frame budgets before raising advertised scale.

See [tactical order ADR](../decisions/0006-recorded-tactical-orders.md), [combat rules](COMBAT.md), [navigation](../architecture/NAVIGATION.md) and [runtime evidence](../REFINEMENT_03.md).
