# Reproducible asset production

Status: production pipeline planned; [equipment example](../../tools/assets/README.md) and [Roman–Gallic articulated recipes](ROMAN_GAUL_RECIPES.md) are executed experiments. No production humanoid, approved rig library, or animation compiler is included.

## Goal and limit

Consistently produce detailed, correctly equipped, animation-compatible game assets from versioned inputs. Repeatability is a build property; quality comes from approved source parts, parameter constraints, fit/pose testing and review. A prompt or random seed cannot guarantee anatomy, topology, rig quality or believable combat animation.

Use Blender as the offline assembly/generation tool and glTF/GLB as delivery. Keep the engine-facing [asset contract](CONTRACTS.md) independent of authoring tool convenience. The reusable [generation skill](../../skills/deterministic-medieval-assets/SKILL.md) executes this workflow; it must not overstate qualification.

## Inputs

- Exact Blender/exporter versions and generator revision.
- Approved source body meshes, rigs, armor modules, weapon families and clips with source hashes/licenses.
- Recipe with stable IDs, valid dimensions, body family, equipment/skill bindings, material palette, heraldry and named random streams.
- Target profile: hero/crowd, LOD/material/bone/texture budgets and supported renderer capabilities.

## Asset compiler stages

1. **Validate recipe:** known IDs, ranges, slot/rig compatibility and source availability; fail before assembly if required inputs are missing.
2. **Assemble anatomy:** approved rig/body family and bounded morphs; do not regenerate arbitrary topology every run.
3. **Fit equipment:** authored fitted armor with body masks, rigid socket attachments for weapons/helmets where appropriate, skinned parts where necessary. Test grips and motion extremes.
4. **Generate details:** parametric blade profiles/guards/pommels, shield shape/rim/boss/straps/rivets, seams and hardware. Texture/normal detail for fine engravings, weave and mail rather than millions of tiny meshes.
5. **Resolve appearance:** constrained palette/materials, pattern masks, validated heraldry; explicit seeds per feature so adding wear does not reshuffle equipment selection.
6. **Bind motion:** approved clips for rig/grip class, explicit phase mapping and socket tracks. IK assists contact; it is not a substitute for authored convincing attacks.
7. **Build runtime representation:** merge compatible pieces by loadout/material, remove hidden geometry, generate/bake LODs and animation data. Preserve source modularity offline.
8. **Export:** GLB/catalog links, manifest, source hashes, socket/bounds/clip metadata and review renders.
9. **Validate:** format, geometry, rig, motion, performance and reproducibility gates below.
10. **Promote:** only reviewed qualified assets enter release catalogs. Preserve build provenance and failed-check diagnostics.

## Reproducibility layers

Geometry/socket equivalence, semantic material/UV/clip equivalence, binary artifact identity and pixel identity are different assertions. Canonical semantic hashes need explicit ordering/rounding and coverage. A geometry-only hash does not prove textures or animation match. Pin source/tool versions; build twice from clean directories. Strip nondeterministic metadata only through a documented canonicalization step. GPU renders may differ across hardware; use them for bounded visual regression/review, not exact cross-GPU hashes.

The example initially exposed inconsistent sphere triangulation; explicit procedural topology and fixed triangulation produced matching repeated exports. Its evidence is local to Blender 4.3.2 and the tested script revision.

## Quality gates

| Gate | Required evidence |
| --- | --- |
| Source/provenance | License, redistribution rights, exact revision and hashes |
| Recipe | Schema and equipment/skill compatibility pass |
| Geometry | Finite positions, correct bounds/scale/normals, sensible topology and budget |
| Rig | Approved hierarchy/rest pose, weights/influence limits, socket transforms |
| Motion | Grip, clipping, foot contact and phase checks across required poses/clips |
| Export | Khronos validator plus actual target-engine import/material/animation test |
| Visual | Front/back/side and isometric close/combat/formation views, equipment correctness |
| Runtime | Representative animated crowd cost, transitions, attachment correctness |
| Repeat build | Canonical manifest and stated artifact-hash comparisons |

Automation can detect many violations but cannot guarantee artistic quality or all cloth intersection. Maintain a human-readable qualification report; inspect sampled frames and extremes. Bows, crossbows, two-handed polearms and mounted characters require distinct pose suites.

## Source strategy

First qualify one coherent body/rig/outfit/animation family. [Quaternius base characters](https://quaternius.com/packs/universalbasecharacters.html), [modular outfits](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) and [animation library](https://quaternius.itch.io/universal-animation-library) are candidates with documented compatibility, not imported dependencies. Kenney/KayKit can support environment prototyping after fit/license review. Commercial sources require review of redistribution terms before use in a public repository or downloadable web build.

Do not mix unrelated scale, rig conventions and material styles then hope export resolves them. Preserve detailed master assets; optimize delivery variants. Source art provenance remains separate from repository code licensing.

## First production slice

One fitted human + sword/shield kit, one spear-compatible kit, one bow/ammo kit, shared approved rig, required locomotion/attack/block/hit/death clips, two faction appearances, validated LODs. Then qualify one horse/rider pair. Environment slice: traversable ground, wall/gate, bridge, village modules and tree/rock kit with navigation metadata. A large asset catalog before these gates only multiplies rework.
