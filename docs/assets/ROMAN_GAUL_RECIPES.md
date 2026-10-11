# Early Roman–Gallic unit recipes

Status: original runtime-generated articulated prototype models. Implemented in [unit-models.ts](../../src/render/unit-models.ts), consumed by [battlefield.ts](../../src/render/battlefield.ts). Recipe version `rome-gaul-articulated-1`.

## Provenance

All character/equipment geometry in this slice is authored procedurally in this repository. No third-party character meshes, textures, animations or generated concept images are used. Three.js supplies geometry/rendering primitives under its own package license; project code retains the repository license. Actual models are generated from source at runtime, not opaque binary downloads.

## Construction

Each kit compiles five vertex-colored parts: body/head, left leg, right leg, left arm/shield, right arm/weapon. Explicit joint transforms animate gait and attack presentation; no animation event drives mechanics. Geometry and colors are deterministic for the same recipe/tool version. The two ranged kits also have a sidearm variant used when ammunition reaches zero.

Roman silhouettes use mail hems, shoulder strap, belt/buckle, bronze helmet and cheek guards, curved-strip scutum with rim/boss/motif, gladius and bound sandals. The legate adds crest, cloak and standard. Gallic kits use oval shield/rim/spine, longer sword, trousers, woven color bands and torc; the warlord adds mail, mantle, cloak and standard. These are stylized test details and historically inspired equipment choices, not reconstruction-quality art.

## Validation

`tests/assets.test.ts` verifies six distinct base recipes, repeatable geometry/color digests, finite coordinates, matching position/color attributes and sensible body bounds. Browser tests render and inspect the two commander models. They do not certify skin deformation, all collision/hand contacts, texture quality, LODs or a production asset pipeline.

## Promotion requirements

Follow the [production pipeline](PIPELINE.md): formal recipe inputs/schema, asset-local manifest/socket hierarchy, fitted approved rig/body, authored compatible clips, pose review, export/import validation, LOD/material/animation budgets and actual animated-crowd measurement. The current rigid-part implementation is a useful reference/test fixture, not a substitute for those gates.
