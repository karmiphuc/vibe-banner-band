# Early Roman–Gallic unit recipes

Status: original runtime-generated articulated prototype models. Implemented in [unit-models.ts](../../src/render/unit-models.ts), consumed by [battlefield.ts](../../src/render/battlefield.ts). Recipe version `rome-gaul-combined-5`.

The [0.2 refinement](../REFINEMENT_02.md) adds a disposable model workshop, detailed near recipes and a simpler crowd tier. [Recipe evidence](../evidence/model-recipes-v2.json) reports both builds, variant hashes and triangle counts.

PoC 0.3 adds broken-shield variants that preserve the articulated arm. [Current recipe report](../evidence/model-recipes-v3.json) includes every intact/broken near/crowd kit and relevant sidearm.

## Provenance

All character/equipment geometry in this slice is authored procedurally in this repository. No third-party character meshes, textures, animations or generated concept images are used. Three.js supplies geometry/rendering primitives under its own package license; project code retains the repository license. Actual models are generated from source at runtime, not opaque binary downloads.

## Construction

Each kit compiles five vertex-colored parts: body/head, left leg, right leg, left arm/shield, right arm/weapon. Explicit joint transforms animate gait and attack presentation; no animation event drives mechanics. Geometry and colors are deterministic for the same recipe/tool version. The two ranged kits also have a sidearm variant used when ammunition reaches zero.

Roman silhouettes use mail hems, shoulder strap, belt/buckle, bronze helmet and cheek guards, curved-strip scutum with rim/boss/motif, gladius and bound sandals. The legate adds crest, cloak and standard. Gallic kits use oval shield/rim/spine, longer sword, trousers, woven color bands and torc; the warlord adds mail, mantle, cloak and standard. These are stylized test details and historically inspired equipment choices, not reconstruction-quality art.

## Validation

`tests/assets.test.ts` verifies six distinct base recipes, repeatable geometry/color digests, finite coordinates, matching position/color attributes and sensible body bounds. Browser tests render and inspect the two commander models. They do not certify skin deformation, all collision/hand contacts, texture quality, LODs or a production asset pipeline.

## Promotion requirements

Follow the [production pipeline](PIPELINE.md): formal recipe inputs/schema, asset-local manifest/socket hierarchy, fitted approved rig/body, authored compatible clips, pose review, export/import validation, LOD/material/animation budgets and actual animated-crowd measurement. The current rigid-part implementation is a useful reference/test fixture, not a substitute for those gates.

## Combined arms in 0.5

[Combined models](../../src/render/combined-models.ts) add original horse and ballista geometry. Twelve humanoid designs share five-part joints, with dedicated spear, bow, sidearm and crew-tool variants. The horse seat is approximately 1.45 m high; rider roots are offset by 0.68 m, with legs spread outside the saddle. Horse bodies and four legs are instanced separately. Engines are a single merged batch per battle. [Repeat-build report](../evidence/model-recipes-v5.json) includes equipment and near/crowd variants. Horse crowd geometry uses low-poly body volumes and omits bit rings; leg and tack silhouettes remain. No production animation or grip-fit qualification is implied.

## Carried standards (0.7)

The runtime character recipe `rome-gaul-standards-6` adds a weapon-free carrying hand variant. Original `carried-standards-1` equipment attaches to that grip or a back sling; see [equipment designs, source references and limits](BATTLE_STANDARDS.md).
