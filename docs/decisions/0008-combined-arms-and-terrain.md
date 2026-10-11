# ADR 0008: Mounted actors, crewed artillery and expanded terrain

Status: accepted experiment, 2026-10-11. Builds on [cohesive formations](0007-cohesive-formation-motion.md).

## Decision

Retain one deterministic TypeScript authority and one Three.js presentation. Extend the catalog to five formation roles, still limited to five stable formation IDs per army. Mount state belongs to its rider; artillery is a separate authoritative engine with three referenced soldier IDs. An engine is not an extra soldier. Both armies include their commander within their 2,500-soldier cap.

Simulation `battle-lab-5`, catalog `rome-gaul-combined-2`, terrain `frontier-terrain-2`, worker protocol 5. Old replay versions are rejected; no implicit migration. Checkpoints and fingerprints include mount state, pace, charge cooldown, engine aim, crew, ammunition, deployment, projectiles and penetration history. Missed target acquisition is retried on a stable 12-tick actor schedule, avoiding full long-range scans every tick.

The arena is 640 × 640 metres, with commands bounded to ±300 m and actors bounded to ±320 m. Terrain is a pure integer height/speed/visibility function shared with presentation; the rendered mesh samples it. River navigation explicitly routes through two fords. This is not arbitrary pathfinding or a navigation mesh.

## Mechanical contract

- Mounted soldiers accelerate and turn at roughly five degrees/tick; mount HP is separate. Mount loss stores corpse location/tick and leaves the rider fighting on foot. There is no separate riderless-horse AI. Rider death visually fells the linked horse assembly.
- Sustained cavalry motion can cause an impact, with a 60-tick per-rider cooldown. Frontal braced infantry or shield walls arrest that impact and damage the mount. Ordinary melee and directional shields remain active. Some incoming hits also damage the mount; this is a prototype joint damage rule, not anatomical hitboxes.
- Mounted archers carry 28 arrows and may move during windup. Skirmish orders steer them toward a 30–45 m engagement band with tangent movement. They use a wider attack cone. Exhaustion switches their visible weapon and mechanics to a sidearm.
- Three crew share one ballista. Two surviving, non-routing crew within six metres are required to fire. Crew membership and engine slots survive casualties without regrouping operators between engines. A stationary engine deploys for 90 ticks; movement resets deployment. Full crew reload twice as fast as two crew. Each engine has 24 bolts and 320 HP; attacks on crew also damage their engine. Bolts can penetrate up to three enemies with diminishing damage.
- Projectiles have integer height/vertical velocity, finite lifetime, terrain obstruction and ordered swept actor collisions. Friendly fire is still disabled. Forest cover is a seeded chance to deflect a projectile, not individual tree-trunk collision.
- Ridgelines obstruct low firing lines; woods and river margins slow troops. Decorative rocks correspond to the existing solid-outcrop collision rule. Trees depict forest areas but are not individually solid.

## Consequences and alternatives

A separate entity-component engine, physics-driven horses, full siege construction and articulated physics would enlarge scope without evidence of need. This slice instead uses explicit typed arrays and engine records, with renderer-only procedural assembly and sound. That preserves replay and static hosting, while leaving mounted navigation, animation and siege destruction deliberately simplified.

The 5,000-soldier option is a capacity experiment, not a certified real-time tier. [Refinement evidence and limitations](../REFINEMENT_05.md) govern performance claims. Revisit entity lifecycle when remounting, abandoned-engine capture or campaign persistence is implemented; revisit navigation before adding arbitrary fortifications or destructible gates.
