# Carried banner equipment (0.7)

Implemented experimental equipment, 2026-10-11. Floating formation name boxes are removed. Standards are Three.js geometry attached to a particular soldier, with equipment selection before combat and a separate model-workshop preview. This is an asset/equipment slice, not a claim of Bannerlord visual or gameplay parity.

## Reference study

Two related systems need to be distinguished. TaleWorlds' [e1.9.0 notes](https://www.taleworlds.com/en/News/513) describe equippable banner items, formation bonuses and regular troops promoted to banner bearers through banner-equipped heroes. That physical-equipment system is the reference for this implementation. A faction emblem by itself does not implement it.

TaleWorlds' [3 May 2018 faction-banner design notes](https://www.taleworlds.com/en/Games/Bannerlord/Blog/58), also available in the [official Steam announcement](https://steamcommunity.com/games/261550/announcements/detail/1649884446698938168), describe a large focal emblem, restrained detail and faction colors that survive changes of scale. The original six culture families were studied as design references:

| Culture family | Reference design language |
| --- | --- |
| Empire | Shared double-headed eagle; northern purple, southern blue-violet and western orange variations in the 2018 designs |
| Vlandia | Lion on deep red; bold heraldic silhouette |
| Battania | Celtic motif on woodland green |
| Sturgia | Shield, sword and torc-derived ornament on dark blue |
| Aserai | Cup-and-horns composition, Mamluk influence and golden yellow |
| Khuzait | Sun/moon forms and a sky-derived blue palette |

These are dated design references, not a current exhaustive item catalog. The [early-banner comparison image](https://www.nexusmods.com/mountandblade2bannerlord/mods/3067?tab=images) was visually inspected as a secondary historical comparison; mod images are not evidence of current vanilla equipment. Reference images are not redistributed or used as game textures.

For the Roman–Gallic slice, use original period-inspired designs rather than Bannerlord's medieval imperial eagle. The [Oxford Classical Dictionary's military-standard entry](https://academic.oup.com/edited-volume/61673/chapter-abstract/550498683) distinguishes legionary aquilae from other standards. A [British Museum first-century-BC Gallic coin](https://www.britishmuseum.org/collection/object/C_1901-0503-226) depicts a warrior carrying a boar standard. Crimson/green palettes, the combined eagle-and-cloth assembly and horse ornament here are artistic choices, not certified archaeological reconstructions.

## Equipment contract

[`src/content/banners.ts`](../../src/content/banners.ts) defines four stable item IDs:

- `roman-aquila`: single-headed eagle finial and crimson cloth.
- `roman-vexillum`: spear finial, crimson hanging cloth and wreath/lightning ornament.
- `gaul-boar`: boar finial, green forked cloth and wheel ornament.
- `gaul-horse`: horse-head finial and blue-green forked cloth.

Each formation stores `bannerItem` and `bannerBearer`. The bearer is the non-commander member with the nearest deployment slot to the formation anchor; equal distances retain stable unit-ID order. No extra soldier is spawned. Empty/noneligible formations have no banner. Roman formation 1 defaults to the aquila and other Roman groups to vexilla; Gallic mounted groups default to the horse standard and other groups to the boar.

A validated `{kind:'banner', team, group, item}` order equips an item or `none` at tick zero. Wrong-faction, unknown-item and post-start changes reject before mutation. Equipment orders preserve tactical movement/phase. Equipment assignment is hashed and checkpointed; replay reconstructs it from initial deployment and recorded orders. The simulation/content identity and worker handshake were advanced to `battle-lab-7` / protocol 7. Packed soldier/projectile/engine records are unchanged.

Use **Banner equipment** in formation controls before starting. The inspector lists the bearer's item. **Model workshop → Banner equipment** previews each faction's items with infantry or mounted models, near/crowd geometry and pose studies. Workshop selections are previews and do not modify battle loadouts.

## Geometry, attachment and lifecycle

[`banner-model.ts`](../../src/render/banner-model.ts), recipe `carried-standards-1`, produces shaft, metal and cloth geometry in metres, +Y up and +Z toward the cloth front. The item origin is its grip. Models use original procedural shapes, sculpted finial bodies, feather ridges, shaft collars, lower roundels, a crossbar, cloth folds and raised decoration. Assets are covered by the repository license; no external image, font or model is downloaded at runtime.

The existing experimental rigid humanoid rig is retained. The right-hand grip is `JOINTS.rightArm + (0,-0.55,0.18)`. While carried, the right arm holds a fixed pose and its ordinary weapon mesh is omitted. During windup/recovery, the standard is placed in a back sling and the ordinary weapon is rendered; engineers use the sling while operating. Mounted height and the unit root/fall transform apply to the equipment. A fallen bearer's standard remains with the body; escaped bearers disappear. This is not a pickup/drop physics system.

At most ten equipment groups exist. Each has three meshes. Bearer-only character instance buffers are capped at ten rather than allocating an army-size buffer. Geometry is cached until item/owner changes and disposed when replaced or the battlefield is disposed. Transparent, keyboard-accessible click targets are projected near the physical standards; they render no names, counts, boxes or SVG artwork. Detailed tactical state remains in the command panel.

## Validation and limits

Tests cover faction/prebattle validation, real troop ownership, checkpoint/replay, repeat geometry digests, finite attributes and bounds, and removal of the weapon from the carrying hand at both detail levels. Chromium checks equipment selection/removal, empty name-box targets, replay preservation and workshop previews for all four items. See [the testing contract](../engineering/TESTING.md).

This slice has no banner bonuses, hero-inventory ownership, bearer replacement, capture, nearby pickup or cloth simulation. The back-sling transition is immediate and the existing rigid humanoid/horse poses are experimental, not production skinned animation. A geometry/replay test does not establish convincing choreography or historical fidelity. The next visual acceptance gate is dedicated carry/stow animation and camera-scale readability against actual battle reference footage, including formation congestion and a fallen bearer.

## Review evidence and continuation

Local production-build validation on 2026-10-11: 56 headless/model tests and all 12 Chromium browser scenarios passed. After adjusting the workshop camera to include the mounted finial, the equipment browser scenario passed again. Documentation and authoritative dependency-boundary checks passed. Reviewed screenshots include the infantry aquila carry pose, mounted horse-standard attack/stow pose and battlefield overview; generated local evidence is intentionally ignored by Git.

The overview still makes individual standards difficult to distinguish at the default battlefield scale. Rigid poses and instantaneous stowing remain conspicuous up close. Future work should first establish a visually convincing small engagement: a useful default camera, readable contact and withdrawal, dedicated carry/stow animation, and clear formation response. Judge recorded footage against those criteria before adding more unit categories or enlarging the battle. The present automated checks establish reproducibility and interface behavior, not that visual acceptance gate.
