# Equipment-generation experiment

This script is preserved from the initial research session. It generates a sword (diamond-section blade, guard, grip bindings, pommel) and round shield (painted face, rim, boss, rivets, rear straps), named socket empties, GLB, Blender scene, manifest and studio preview.

## Run

Tested with **Blender 4.3.2**. From repository root:

```sh
blender --background --threads 4 \
  --python tools/assets/generate_equipment.py -- --output build/equipment
blender --background --threads 4 \
  --python tools/assets/generate_equipment.py -- --output build/equipment-repeat
```

Outputs: `equipment.glb`, `equipment.blend`, `manifest.json`, `preview.png`. No external models/textures or paid dependencies are needed. Blender's exporter may report unavailable Draco compression; the example does not request Draco. Denoising is disabled because the tested Blender build lacked that capability. Studio render noise is expected at eight samples.

The output directory is overwritten intentionally by a rebuild. Use a separate directory for each candidate. Generated files are ignored by Git. Do not publish this demonstration GLB as a qualified soldier or optimized production loadout.

## Observed evidence

[Recorded comparison](evidence/repeat-build.json) contains two equal GLB SHA-256 digests and matching canonical geometry/socket manifests from the research run on 2026-10-11. Total evaluated geometry: 3,648 triangles across the equipment scene. Evidence is scoped to the pinned script/tool environment; it is not a guarantee for another Blender/exporter version.

Automatic sphere triangulation originally differed between runs. The current example uses explicit procedural boss topology and fixed triangulation. The geometry hash covers rounded vertex coordinates and triangle indexes, with object transforms in the manifest. It does not cover all UV/material/animation semantics. Binary equality was checked separately. Source script hash is recorded with the evidence for traceability.

## Limitations and promotion work

- Fixed script parameters; no formal recipe schema or general asset compiler.
- Showcase world-space placement, not separate production item roots/local socket hierarchies.
- Many separate objects/material assignments; no optimized crowd assembly, LODs or atlas pipeline.
- No humanoid, skinning, clips, fit/pose suite, gameplay hit profile or complete collision validation.
- No Khronos validator run, engine import test or browser performance claim.
- Low-sample studio preview was inspected, not artist-qualified detailed production art.

M2 in the [roadmap](../../docs/ROADMAP.md) defines promotion. The [generation skill](../../skills/deterministic-medieval-assets/SKILL.md) describes the intended production workflow without treating it as implemented.
