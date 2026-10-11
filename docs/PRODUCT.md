# Product scope

## Goal

A single-player medieval sandbox in a desktop browser. The player starts with a small company, recruits and equips troops, travels between settlements, earns resources, and personally fights while commanding formations. Large battles should remain tactically legible and mechanically consistent.

Required constraints: isometric presentation; browser play; GitHub Pages-compatible static delivery; battles targeting 100–1,000 simultaneously active units per side. Upper-end capacity is not permission to substitute reinforcements or offscreen auto-resolution without labeling a different mode.

## First complete loop

Recruit → choose loadouts → travel → encounter → deploy formations → fight/control hero → resolve wounds/casualties/loot → recover and upgrade → save/reload.

First campaign slice: one region, two competing factions, one town and nearby villages, roaming hostile parties, basic recruitment/trade, infantry/archers/cavalry, local saves. Content counts are scope suggestions, not engine limits.

## Battle interaction

- Direct character movement, aiming/facing, attacks and blocks; command a selected formation.
- Move, face, hold, advance, charge, rally and retreat orders introduced progressively.
- Formation outlines and ground previews; faction identity via silhouettes, banners and patterns as well as color.
- Optional pause for orders in single-player; camera zoom and pan independent of mechanics.
- Selection and input must remain responsive while simulation is busy.

## World structure

Use a persistent campaign map plus local tactical encounters. Tactical terrain inherits location, biome, approach directions, and stable world IDs. This is an intentional initial product scope, not a claim of seamless terrain streaming. See [campaign](design/CAMPAIGN_AND_SAVES.md).

## Support tiers

| Tier | Planned promise | Evidence needed |
| --- | --- | --- |
| Desktop baseline | Full controls; scalable battles on supported browsers | Named integrated-GPU and mainstream desktop benchmarks |
| Desktop upper scale | 1,000 vs 1,000 simultaneous combatants | Mixed-arms stress suite, not stationary crowds |
| Mobile | Later reduced-detail/control profile | Thermal, memory, touch UX and browser testing |

Device presets may lower visual quality or select a supported battle size before an encounter. Do not silently remove units or alter damage/AI rules based on device performance. A slower supported simulation tier must be explicitly communicated.

## Initial exclusions

Multiplayer, server-authoritative economies, MMO persistence, cloud accounts, seamless continent-scale terrain, destructible castles, fully simulated ragdolls, procedural invention of animation-ready anatomy, and unrestricted executable mods. These can be reconsidered through ADRs after the vertical slice.

## Success

The battle passes [performance gates](engineering/PERFORMANCE.md); a replay produces identical authoritative hashes across declared runtimes; one equipment/animation pipeline produces validated troop variants; the campaign loop survives save/reload; the release works under the actual GitHub Pages repository path.
