# Roman–Gallic custom battle laboratory

Status: implemented experimental vertical slice, 2026-10-11. It tests architecture and combat with **early original articulated models**, not production rigged humanoids. No campaign or direct player-character control is implemented. It does not complete the full M0–M4 roadmap gates.

[Play on GitHub Pages](https://karmiphuc.github.io/vibe-banner-band/). Static build is published from the repository `gh-pages` branch; see [deployment details](engineering/DEPLOYMENT.md).

See [ranked combat proof of concept 0.4](REFINEMENT_04.md) for the newest controls, combat rules, model workshop and verification.

## Run and test

Use Node 24.19.0 (`.nvmrc`) and the committed npm lockfile:

```sh
npm ci
npm run dev
# Open the printed /vibe-banner-band/ URL.
npm test
npm run check:boundaries
npm run build
npx playwright install chromium
npm run test:browser
npm run bench
```

To use an existing Chromium installation: `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`. Browser tests run the production build through Vite preview. Local checks need Python 3.11+ for `python3 tools/check_docs.py`.

## What to try

1. Start with the default 80 Romans versus 100 Gauls. Both army counts include one commander.
2. Click **Begin battle**, pause with the same button or Space outside form controls, and use **Step one tick** to inspect action transitions.
3. Select a soldier on the field or a unit/commander in the inspector. **Inspect model** pauses and zooms to it; **Fit battlefield** restores the view.
4. Reset, change troop mix/doctrine/terrain/seed, and begin a new experiment. Setup is locked once combat starts; reset is explicit.
5. Observe ammunition, morale, stamina, casualties and commander skill activations. Javelineers visibly switch to a sidearm when ammo is exhausted.
6. Export a replay at a coherent worker tick. Import it to re-simulate and compare the saved state fingerprint. Reset cancels a long replay.
7. Increase to 300, 500 (numeric input) or 1,000 per side. Watch Diagnostics; these are experimental capacity options, not certified device tiers.

Default troops are intentionally asymmetric and unbalanced for testing. Doctrine now affects speed, file/target preference, nearby shield support and charge impact; it is not a completed formation order system. Both sides can fight automatically. Up to five independent formations per army can divide infantry and javelineers by integer shares. Tactical orders are optional, and their acknowledged history is recorded in replay files.

## Unit and commander templates

| Unit | Role/equipment | Mechanical purpose |
| --- | --- | --- |
| Roman legionary | Gladius, curved scutum, mail, bronze helmet | Armor and frontal shield protection |
| Roman auxiliary javelineer | Javelins, buckler, short sword | Ranged opening, distance maintenance, finite ammo |
| Roman legate | Officer kit, crest, cloak and standard | AI combatant; 14m morale/stamina rally every 12s |
| Gallic warrior | Long sword, oval shield, tunic/trousers | Faster advance, longer reach, less armor |
| Gallic javelineer | Javelins, light oval shield, knife | Mobile ranged screen with melee fallback |
| Gallic warlord | Mail, decorated shield, torc and cloak | AI combatant; 14m morale/attack buff every 12s |

These are fictional gameplay archetypes with historically inspired equipment, not an archaeological reconstruction or a balanced historical claim. No named historical commander is impersonated. The source of truth is [catalog.ts](../src/content/catalog.ts).

## Implemented mechanics

- 30 Hz integer simulation with 1,024 units/metre and exact integer-square-root normalization.
- xorshift32 seeded random stream, stable entity order and explicit content/rules versions.
- Tick-start targeting/intent positions, local spatial queries, two ordered separation passes, static circular-rock avoidance.
- Windup/recovery, stamina regeneration/cost, armor, facing-dependent shield chance, simultaneous damage and lethal trades.
- Swept javelin contacts, finite ammo, commander loss penalty, routing and victory/draw. Initial ranged friendly fire is off.
- One worker, three transferable snapshot buffers, snapshot backpressure, separate status replies, stale-session rejection and hidden-tab pause.
- Canonical state fingerprint including arrays, config, RNG, projectiles and authoritative counters; config/order/tick replay export/import with version and input limits.
- Trusted in-memory checkpoints for tests; this is not a hardened public save/checkpoint import API.

## Implemented presentation

Orthographic Three.js scene with original parametric geometry, five articulated rigid parts per model, compatible instanced batches, faction equipment/palettes, visible projectiles and corpses. Inspection, zoom/pan, army reports, live stats, diagnostics and replay tools. Cosmetic ground/scenery generation uses a separate deterministic stream and cannot affect combat. No external art downloads, remote fonts, accounts or backend.

The core uses `src/sim` and `src/content`; renderer and browser ownership stay in `src/render` and `src/platform`. This small tree realizes the architecture boundaries without scaffolding the future monorepo packages.

## Known limits and next gates

- No hierarchical navigation, shared flow-field implementation, general formation pathfinding, cavalry, siege, campaigning or production data-pack compiler yet.
- Local steering handles only the two defined outcrops; it is not a general pathfinder. Two separation passes are approximate and can leave residual overlap in dense contacts. No collision-free crowd guarantee is made.
- Models are explicit early procedural studies: no deforming skin rig, authored motion capture, detailed baked material set, animation-texture crowd path, or production LOD compiler. A tested near/crowd geometry tier is implemented. No production-asset qualification is claimed.
- Battle ends when a side has no non-routing combatants, or at 180 simulation seconds. Corpses remain until reset.
- Replay captures immutable setup, a bounded tactical order history and a target tick. FNV state fingerprints aid reproducibility, not tamper resistance. Format/rule changes require version bumps.
- Browser validation currently covers Chromium in the execution environment; Firefox/Safari and real-device GPU capacity remain unqualified.
- Pause/step/replay work is implemented; worker-crash checkpoint recovery, public save migration and robust WebGL recovery require further testing/implementation. Context loss pauses the battle but is not a certified recovery feature.

See [review notes](REVIEW.md), [evidence](evidence/battle-lab-headless.json) and [ADR 0005](decisions/0005-custom-battle-slice.md).

## Ranked combat (0.4)

Choose **Try the reserve & flank battle** to exercise ranked movement, held reserves, facing/frontage and two-leg flank orders. Click formation labels on the field to select them. See the [play guide and explicit navigation limits](REFINEMENT_04.md).
