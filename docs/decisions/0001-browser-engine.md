# ADR 0001: Browser engine baseline

Status: proposed, 2026-10-11. User expressed interest in Godot and Three.js, not a final exclusive engine choice. This plan recommends one implementation baseline and an evidence gate.

## Context

Static GitHub Pages hosting, isometric 3D, detailed equipped characters, 2,000-combatant upper target, reproducible mechanics and asset workflow. Editor productivity competes with fine control over browser workers, animation batching and delivery.

## Decision

Prototype TypeScript + Three.js + Vite with a headless simulation worker. Use Blender/glTF assets. Keep presentation interfaces narrow enough to evaluate Godot, but do not build or maintain two production renderers or two simulations.

## Alternatives

- Godot: integrated editor, animation/content tools and native export. Viable web export, but engine physics is not guaranteed deterministic and web threading/export configuration needs qualification. Switching requires a deliberate core integration plan, not assumed drop-in TypeScript reuse.
- PixiJS: excellent for a sprite-first fixed camera, but current direction prioritizes reproducible 3D equipped models.
- Custom WebGL/WebGPU engine: too much infrastructure before gameplay evidence. Custom crowd shaders may be introduced within Three.js after measurement.

## Gate

M0 captures an animated, equipped representative crowd and practical asset iteration time in the proposed stack. If it cannot meet the target with a credible optimization path, run the same content/scenarios in a Godot web export before committing further. Compare frame/tick percentiles, memory, asset correctness, tooling effort, cold-load size, worker/thread requirements and actual Pages deployment. A primitive draw-count demo does not settle the choice.

## Consequences and revisit

More custom tooling in Three.js; stronger browser-native composition. No engine-specific types in authoritative content/contracts. Pin versions only after the initial evaluation, and update this record with measurements and chosen versions. Revisit if measured animation throughput, editing cost or web compatibility makes the baseline unsuitable.
