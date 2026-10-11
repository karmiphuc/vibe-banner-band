---
name: deterministic-medieval-assets
description: Generate and qualify reproducible medieval equipment and modular characters from approved source assets, pinned recipes, explicit rig/socket contracts and deterministic gameplay definitions.
---

# Purpose and current capability

Produce reviewable game assets with provenance and repeatable builds. Read [asset pipeline](../../docs/assets/PIPELINE.md), [asset contracts](../../docs/assets/CONTRACTS.md), [content](../../docs/design/CONTENT.md) and applicable repository instructions before work.

This repository currently contains a working procedural sword/shield experiment and six original articulated [Roman–Gallic runtime model recipes](../../docs/assets/ROMAN_GAUL_RECIPES.md). These are explicitly experimental. It does not contain a production humanoid generator, approved base-body library, combat-animation library, formal recipe schema, LOD compiler or complete automated quality validator. Do not claim these capabilities exist merely because this skill describes them.

# Required inputs

- Equipment/unit IDs and requested qualification level (experiment or production).
- Versioned mechanics/content definitions, including permitted equipment and abilities.
- Approved source models, exact rig/rest-pose revision, license/provenance and required clips.
- Pinned toolchain/export settings, generator revision, constrained recipe and explicit seeds.
- Target render profile and budget, output location, required pose/import/repeatability checks.

Use established project defaults where available. Missing required body/rig/animation sources are real blockers for a production character. Continue independent tooling/validation work, but never silently substitute a primitive model or invent a license.

# Workflow

1. Inspect the actual source files and manifests. Confirm scope and status. Validate references, parameter bounds, slot conflicts, equipment/skill prerequisites and license records.
2. Choose an approved rig/body family. Preserve naming, hierarchy, rest pose, scale, forward axis and deformation conventions. Apply only tested bounded body variations.
3. Assemble fitted armor and authored hidden-body masks. Keep stable IDs on parts and attachment points. Reject unsupported fit combinations rather than stretching arbitrary armor blindly.
4. Generate appropriate hard-surface equipment from explicit dimensions: blades, guards, grips, pommels, shield curvature/rims/bosses/straps/rivets, seams and hardware. Fine weave/mail/engraving belongs in baked materials where appropriate.
5. Use independent named seeds for permitted variation. Pin source hashes, generator and tool versions. Adding a cosmetic feature must not reshuffle loadout selection.
6. Bind primary/off-hand grips, back/sheath, projectile and mounted sockets. Two-handed weapons, bows and cavalry require dedicated pose/attachment contracts.
7. Use authored compatible combat clips. IK may correct contacts. Authority remains in tick-based mechanics; no animation callback changes damage, ammunition or skill availability.
8. Compile bounded runtime loadouts: remove hidden geometry, merge compatible materials/parts, generate LOD/animation representations and preserve source assets offline. Source modularity is not permission for unbounded per-soldier draw calls.
9. Export asset-local GLB hierarchies plus manifests, recipes, source/output hashes, sockets, bounds, clips and LOD reports. Create fixed close/combat/formation previews and required pose frames.
10. Run validation and review. Record pass/fail/unavailable for each required gate. Promote only qualified outputs; preserve diagnostics and do not relabel a failed asset as production-ready.

# Validation requirements

- Input/schema and semantic loadout validity; no unknown or duplicate IDs.
- Geometry finite, correct scale/axes/bounds/normals, expected topology, budget and material use.
- Approved skeleton, normalized weights, bounded influences, no unweighted vertices.
- Grip placement, armor penetration, foot sliding and socket motion checked across idle/walk/run/thrust/slash/block/hit/death; add archer and mounted suites where required.
- Khronos glTF validation and actual target-engine import. Format compliance alone is insufficient.
- LOD/clip transitions preserve equipment identity and attachments. All render variants map to the same authoritative equipment profile.
- Two clean builds with pinned inputs. Report semantic geometry/material/UV/clip coverage separately from binary identity. Never claim cross-version or cross-GPU pixel identity from a single-machine check.
- Representative animated crowd benchmark; static geometry count does not prove gameplay scale.

# Existing experiment

From repository root:

```sh
blender --background --threads 4 \
  --python tools/assets/generate_equipment.py -- --output build/equipment
```

See [experiment README](../../tools/assets/README.md). The script uses fixed dimensions and materials, scene-positioned items and socket empties. It is a small example of procedural construction and manifest generation, not the future recipe-driven production compiler.

# Handoff

Return source recipe/revisions, generated file paths, qualification status, required missing inputs, completed validation, visual review findings and measured budgets. Distinguish observed facts from proposed capabilities. Do not use concept images as evidence that an asset can be reproduced or animated.
