# Combat PoC 0.3: command the line

This iteration adds tactical influence and more consequential defense to the Roman–Gallic combat laboratory. It moves toward formation-driven sandbox combat while keeping the commanders autonomous. It is not Bannerlord feature parity or a reconstruction of TaleWorlds' combat code/assets.

## What to try

1. Add up to five formations per army in deployment. Set their troop roles and shares. Choose **Romans → 1 · Infantry**, select **Shield wall**, and **Hold here** before starting.
2. Select **Skirmishers**, choose **Loose**, and use **Place line** to choose a ground position. The minimap marks held formation anchors. Press Escape to cancel placement.
3. Begin the battle. Toggle **Hold fire / Fire at will** to time the ranged opening, then order infantry to **Advance** or **Charge**.
4. Use **Fall back** to withdraw roughly 8m while facing the enemy. It establishes a new held anchor; it is not an automatic flee/surrender order.
5. Inspect a soldier's shield integrity and stagger state. A broken shield disappears from the model and cannot block again. The workshop also exposes a **Shield broken** variant.
6. Pause, give another order, export the replay, and import it. The accepted order history is reproduced at the same tick boundaries, including orders issued while paused at the final replay tick.

Keyboard: **1–5** select a numbered formation, **0** all; **V** advance, **H** hold, **C** charge, **B** fall back. Shortcuts ignore typing controls and the open workshop. The army selector determines which side receives commands. Both armies can still fight automatically without intervention.

## Formation rules

Each army has up to five independent numbered formations. Add formations in deployment, choose infantry or javelineers, and edit their relative share of that troop role. IDs remain stable when another formation is removed. The commander belongs to the first infantry formation. Orders target IDs separately from troop roles; multiple infantry wings can hold, charge or fall back independently. See the [formation contract and cavalry/siege extension plan](design/FORMATIONS.md).

- **Advance:** approach the enemy while preferring the assigned file until close contact.
- **Charge:** relax file preference, accelerate, and build bounded impact damage.
- **Hold/place:** move toward stable slots around the chosen anchor and fight from there.
- **Fall back:** create a rearward anchor, move at reduced speed, and retain enemy-facing defense.
- **Line / shield wall / loose:** slot spacing is 1,450 / 1,100 / 2,300 fixed-point units. Slot order is stable by entity ID. Shield-wall protection still requires nearby eligible shield bearers.
- A placement for all troops translates existing formation anchors together, retaining their relative offsets. Formation anchors are adjusted to fit their assigned footprint inside the arena. Individual units still use local terrain avoidance/contact; this is not a general formation pathfinder. Crowds and rocks can prevent perfect slot occupancy.
- Holding fire cancels an unreleased action without spending ammunition and exposes the sidearm. Changing fire discipline does not reset melee momentum. Previously released projectiles remain active.

## Defense and melee

Facing turns by approximately 10° per tick using bounded integer arithmetic. Windup commits the facing and target. A target that leaves the permitted facing cone before release can avoid the melee hit. Roman/knife thrusts use a narrower arc than Gallic sword swings, with different presentation poses.

Shields protect a frontal 120° cone, using an AI block probability affected by readiness, support and stamina. This remains an abstract combat rule, not exact animated-shield collision or player-selected directional blocking. Shield integrity starts at 160 for legionaries, 120 for Gallic warriors, 60 for skirmishers and 200 for commanders. Blocks consume stamina and shield integrity; exhausted defenses or heavy unblocked hits can stagger the target. Stagger stops movement/attacks and can interrupt windup. Shield destruction and stagger consequences are applied after eligible strikes, preserving simultaneous lethal exchanges.

Broken-shield variants retain the arm and rig joints. Stagger recoil, thrust/slash presentation and a short visual death fall improve readability; those animations never determine damage. Melee still resolves against the committed target, not a physically swept weapon mesh. Projectiles retain the existing ground-plane sweep and friendly-fire-off policy.

## Deterministic command/replay contract

See [ADR 0006](decisions/0006-recorded-tactical-orders.md). Rules are `battle-lab-3`, worker protocol 3, and model recipe `rome-gaul-articulated-3`. Older-rule replays fail explicitly.

Commands are validated before acceptance, then stamped with the worker's current tick and an increasing sequence. They take effect at that boundary, including tick zero while paused. Replay applies all commands at a boundary before stepping further, including the endpoint. Canonical state fingerprints and trusted checkpoints include the order log, formation state, slots, shield health and stagger. File imports reject excessive, misordered, future or malformed commands. There is a 256-order limit per battle; the existing 64 KB replay file cap still applies.

## Evidence and limits

31 core/model tests and six browser tests cover normal/replay behavior, command history at paused boundaries, formation placement, fire discipline, limited turning, stagger, shield destruction and visual variants. [Headless evidence](evidence/battle-lab-v3-headless.json) records one 600-tick run per configuration at 100/500/1,000 per side; p95 was 1.186/4.847/10.042 ms with two formations per army and 0.7/4.205/9.661 ms with five, on the stated Xeon/Node environment. This is not a browser frame-rate claim or a controlled comparison across changed rules.

[Recipe evidence](evidence/model-recipes-v3.json) covers intact/broken shields, relevant sidearms and both geometry tiers with repeated local geometry/color/normal/joint hashes. Browser qualification remains Chromium in the execution environment.

The largest remaining gaps toward Bannerlord-like combat are cavalry/mount bodies, ranged elevation/line of sight, sophisticated formation navigation and flanking AI, production skeletal combat animations, richer hit regions and weapon contact, and battle-scale audio. They require their own validated slices. Direct hero control remains outside the user's requested observer/commander scope.
