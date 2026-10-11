# Presentation and crowd rendering

Status: [proof-of-concept Three.js rendering](../REFINEMENT_02.md) implements instanced rigid articulation, near/crowd geometry tiers and camera culling. The production skinned-crowd plan and real-device rendering qualification below remain open. The [engine ADR](../decisions/0001-browser-engine.md) defines the Godot alternative and decision gate.

## Scene contract

Orthographic camera, fixed isometric orientation initially; zoom/pan without gameplay effects. Simulation uses a ground plane plus height; glTF assets use metres and Y-up at export. The adapter defines the exact sim-to-render axis transform. Never infer attack reach from transformed render bounds.

Render snapshots + immutable render catalogs produce render instances. UI operates on entity IDs; selection/picking uses an interpolated spatial index or explicit proxy shapes, not expensive per-triangle tests for all troops. Ground previews are cosmetic until commands are acknowledged.

## Crowd plan

- Group compatible troops by geometry, material/atlas, animation representation and LOD; per-instance palette/heraldry variation where feasible.
- Ordinary independent SkinnedMesh objects are a prototype baseline, not an assumed 2,000-unit solution.
- Evaluate GPU bone-palette/animation-texture skinning or vertex-animation textures for repeated crowd clips. Specify clip phase, interpolation and transition data per instance. Measure memory, shader cost, attachments, blending and browser precision.
- Keep a richer nearby hero/companion path only if necessary. Do not implement a second authoritative character controller.
- GPU animation requires animated sockets/attachment strategy for weapons and shields; instancing a body while updating thousands of weapon scene nodes can erase the gain.
- Cache a bounded set of assembled loadout meshes. Naive eight-part modular characters can multiply draw calls. Source modularity and runtime representation need not be identical.

Three.js InstancedMesh reduces repeated draw submissions but does not solve independent skeletal animation by itself. See [official documentation](https://threejs.org/docs/pages/InstancedMesh.html).

## LOD and budgets

Start with close, mid and far geometry/animation tiers from [asset contracts](../assets/CONTRACTS.md). Use screen-space size with hysteresis. Reduce distant pose update frequency, shadows and particles; preserve action identity and readable weapons. Interpolation should not produce visibly sliding feet or teleporting attachments. Far impostors are optional and need transition/angle validation.

Terrain uses chunks with bounded material sets; scenery is instanced where appropriate. Cull at useful chunk/group granularity before expensive per-instance work. Measure culling CPU overhead. Keep transparency/overdraw low; avoid one dynamic shadow-casting light or text label per troop. Baseline: one sun/ambient setup, bounded shadow distance or simple blob shadows. Limit corpse/debris visual lifetime; retain gameplay consequences separately.

WebGL2 baseline; capability detection and clear unsupported-device messaging. WebGPU is optional after measurements. No authoritative GPU simulation. Cap device pixel ratio/render resolution for predictable GPU cost; a 4K display is a separate workload from a 1080p benchmark.

## Fidelity rules

Detail must correspond to equipment identity: shield shape/pattern, helmet, weapon class, faction marks. Layered cloth, seams and metal hardware should survive close inspection; tiny details move to baked maps at distance. Terrain texture frequency must not obscure soldiers. Faction recognition must not rely only on red/green color contrast.

## Failure and lifecycle

Track asset references, upload progress and GPU allocations. Dispose on unload. Recover from WebGL context loss using cached source assets and the latest simulation snapshot; pause the local game during restoration. Missing cosmetic assets may show explicit placeholders during development, but required production assets fail the release gate. Version-mismatched catalogs cannot silently render the wrong weapon.

## Evaluation fixture

The first representative scene includes real rigged bodies, visible equipment attachments, mixed clips and transitions, terrain, shadows, UI, projectiles and corpses. Compare renderer-only and full-simulation runs. Capture draw calls, triangles, CPU submission, GPU frame time where available, texture/animation memory, frame percentiles and context-loss recovery. An unanimated primitive crowd is only an early diagnostic.
