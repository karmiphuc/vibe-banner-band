# Combat, abilities and troop behavior

Status: proposed rules. Numeric examples are tuning hypotheses. The [determinism contract](../architecture/DETERMINISM.md) owns arithmetic/tick ordering; [content](CONTENT.md) owns IDs and compilation.

## Unit state

Stable identity/generation, team, formation, quantized position/velocity/heading, HP/stamina/morale, equipment IDs, action state/ticks, target handle, ammo, status effects, mount relationship and scheduler state. Hot fields live in typed arrays. Keep long-lived campaign identity separate from recyclable battle slots.

Start with ready → windup → active → recovery; add stunned, blocking, routing, mounted and dead with explicit transition priorities. A table of permitted transitions is easier to validate than scattered boolean flags. Equipment changes occur only at permitted boundaries; save all state needed to resume an action.

## Ability definition

An ability references preconditions, equipment tags/slots, integer resource costs, phase durations, targeting geometry/profile, bounded effects, animation bindings, and interruption/refund policy. No arbitrary script execution in initial data packs.

Example `ability.spear_thrust.v1` at 30 Hz:

- Requires a spear-compatible grip, alive/ready state, and at least 12 stamina.
- Pays 12 stamina once at accepted execution.
- Windup `[start,start+9)`, active `[start+9,start+12)`, recovery `[start+12,start+24)`.
- Gameplay profile controls facing/range and swept contact. One target per activation initially; target ties resolve by distance then stable ID. Maintain a hit registry to prevent repeat hits across active ticks.
- Damage/block calculation uses the pre-damage snapshot; simultaneous eligible attacks can trade lethal hits.
- Stun/death may interrupt according to phase priority; initial policy gives no stamina refund after start.
- Presentation maps clip phases onto authoritative intervals. Missing required clips fail asset qualification, not combat logic.

The [example catalog](../examples/vertical-slice.json) illustrates relationships, not a complete schema or balanced combat system.

## Melee geometry

Use circle/capsule ground-plane bodies and authored attack arcs/segments with integer profiles. Weapon mesh vertices do not define hit detection. Fast motion requires swept tests and quantized vertical bands where height matters. Define friendly-fire, maximum hits, shield interception and immunity rules explicitly per profile. Initial friendly-fire policy: no melee friendly damage; projectile policy to be finalized before ranged gate.

Shield block requires a compatible equipped shield, defensive state and facing arc; coverage and stamina cost are gameplay data. Armor coverage/type, damage type and attacker modifiers feed a versioned integer formula. Freeze formula v1 before combat golden fixtures; do not invent precision from visual armor coverage.

## Ranged

Ammo reservation/consumption is explicit; draw, release and recovery are tick states. Spawn gameplay projectile from a defined quantized origin; renderer sockets approximate that origin within tolerance. Swept collision checks crossed cells and candidate bodies, preventing tunneling. Gravity/drag use documented integer integration. Scatter uses the combat RNG stream. Define obstacle/actor ordering and earliest-hit tie-breaks. Cosmetic arrows may be reduced at distance; damaging projectiles may not.

## Cavalry

Separate horse entity/body/movement class and rider state, connected by a stable mount relationship. Define mounting restrictions, turn radius/acceleration, rider/horse damage routing, collision radius, charge eligibility, impact cap, brace interactions and dismount/death outcomes. Horse/rider animation synchronization and saddle sockets are an asset gate. Do not represent cavalry as faster infantry with a horse mesh.

## AI and formations

Army AI chooses objectives/reserves/retreat; formations choose routes/facing and targets; soldiers retain targets when valid and react locally. Orders influence utility/preconditions, not uncontrolled per-unit path searches. A charge does not make all soldiers choose one nearest victim; use stable target reservations/capacity heuristics. Hold/brace prioritize coherence; retreat seeks an escape region. Costs/cadences obey [navigation](../architecture/NAVIGATION.md).

## Morale and leadership

Deterministic events for nearby losses, casualties by formation, flank pressure, fatigue, leader loss and isolation. Aggregate formation signals rather than broadcasting every event to every unit. Hysteresis separates wavering, routing and recovery. Rally has explicit radius/eligibility/cooldown and cannot resurrect dead units. Routing/surrender ends battles before universal annihilation. Morale constants require scenario tests and playtesting.

## Player skills and progression

Distinguish executable combat abilities from proficiency/perk progression. Equipment grants possible actions; skill level modifies permitted numeric factors within caps. A perk cannot grant bow firing without bow/ammo/animations. Compile derived stats once at loadout/progression changes. Campaign progression updates at explicit transaction boundaries, not renderer callbacks.

## Required correctness fixtures

Stamina paid once, empty ammo, canceled windup, death during active phase, simultaneous kills, shield facing edge, armor resistance rounding, target deletion/ID reuse, projectile crossing multiple cells, cavalry brace contact, mass rout, and resume from a mid-action save. Verify the player and AI use the same authoritative action rules.
