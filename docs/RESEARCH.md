# Research references and evidence

Reviewed during project planning on 2026-10-11. Prefer current primary documentation; version-specific behavior must be rechecked when pinning dependencies. These sources justify techniques/constraints, not this game's unmeasured performance.

| Source | Supported finding | Project consequence |
| --- | --- | --- |
| [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | Static client hosting | Simulation and local persistence live in browser |
| [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | Published size/bandwidth constraints | Budget downloads and future delivery growth |
| [Vite static deployment](https://vite.dev/guide/static-deploy.html) | Repository base-path and Actions deployment | Test actual project path |
| [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) | WebGL2 export, single-thread option, threaded isolation constraints/workaround | Evaluate actual export configuration |
| [Godot physics introduction](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html) | Physics not guaranteed deterministic | Own authoritative solver |
| [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Instancing repeated geometry/materials | Useful rendering primitive; animation remains separate engineering |
| [Three.js orthographic camera](https://threejs.org/docs/pages/OrthographicCamera.html) | Orthographic projection | Isometric camera baseline |
| [MDN transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) | Ownership transfer and sender detachment | Buffer pool with explicit lifetime |
| [MDN SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) | Cross-origin isolation requirement | Shared memory optional |
| [COI service worker](https://github.com/gzuidhof/coi-serviceworker) | Workaround where headers cannot be set | Available alternative, not default dependency |
| [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) | Capability/availability constraints | WebGL compatibility baseline |
| [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Storage eviction and quota failures | Backups and export/import |
| [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) | Fixed steps and catch-up spiral risk | Headroom and explicit overload behavior |
| [Emerson flow-field tiles](https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter23_Crowd_Pathfinding_and_Steering_Using_Flow_Field_Tiles.pdf) | Shared tiled crowd pathfinding used in Supreme Commander 2 | Formation routes/shared navigation research basis |
| [ORCA](https://gamma.cs.unc.edu/ORCA/) | Reciprocal local collision avoidance | Optional steering evaluation, not assumed melee contact model |
| [glTF specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | Asset, skin and animation format | Explicit delivery contract |
| [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator) | Format validation | Necessary but insufficient asset gate |
| [Blender random values](https://docs.blender.org/manual/en/4.3/modeling/geometry_nodes/utilities/random_value.html) | Seed/ID-driven procedural variation | Pin stable feature identities and tool version |
| [Quaternius base characters](https://quaternius.com/packs/universalbasecharacters.html) | Compatible character source family | Candidate, not yet qualified |
| [Quaternius modular outfits](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) | Modular equipment and shared-family compatibility | Candidate armor source |
| [Quaternius animation library](https://quaternius.itch.io/universal-animation-library) | Shared rig animation source | Verify exact revision/naming before import |
| [Kenney Castle Kit](https://kenney.nl/assets/castle-kit) | CC0 environment source candidate | Optional prototype architecture |
| [KayKit Medieval Hexagon](https://kaylousberg.com/game-assets/medieval-hexagon) | Campaign-scale environment source candidate | Assess style, scale and exact license |

## Evidence already produced

[Equipment experiment](../tools/assets/README.md): Blender 4.3.2 generated a sword/shield scene twice with equal recorded canonical geometry/socket manifests and binary GLB SHA-256 digests. The example does not demonstrate character quality, animation performance, engine import, or cross-version reproducibility.

## Superseded exploration

Earlier image-generated visual concepts are excluded from implementation acceptance and not committed as production references. The project now prioritizes mechanically specified, reproducible assets and measured feasibility. PixiJS/Phaser were considered during broad research; current engine evaluation is focused on Three.js and Godot.
