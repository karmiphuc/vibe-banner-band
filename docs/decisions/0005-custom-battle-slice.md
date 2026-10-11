# ADR 0005: Executable Roman–Gallic combat slice

Status: accepted experiment, 2026-10-11. User requested a custom-combat feature with AI Hero/Lord templates and early Roman versus Gallic units to test implementation across subsystems.

## Decision

Implement a bounded observer battle laboratory now, exercising portions of M0/M1/M2/M3 without claiming those full gates complete. Use the existing TypeScript/Three.js baseline, one headless worker, immutable battle setup and config-and-tick replay. Six original procedural articulated unit recipes demonstrate explicit equipment and repeatable geometry. Commanders are autonomous and share the normal combat rules plus authored data-driven rally abilities.

## Scope adjustments

The first content setting is Roman–Gallic antiquity rather than the originally proposed medieval campaign. The engine remains period-agnostic; the campaign setting is not frozen by this experiment. Art is labeled prototype, not an approved skinned production library. General flow fields, formation commands, cavalry and campaign persistence remain future work.

The initial tree uses `src/content`, `src/sim`, `src/platform` and `src/render` rather than empty workspace packages. Import/API boundary checks protect the core. Move modules into packages when dependency isolation warrants it.

## Consequences

The user can evaluate an actual loop, equipped models, commander behavior, determinism and scaling immediately. Local obstacle steering and approximate two-pass separation do not replace the full navigation contract. Literal typed catalogs are not the future schema compiler. Replay fingerprints are noncryptographic debug checks, not authoritative security claims.

## Gate and next work

[Custom battle](../CUSTOM_BATTLE.md) lists actual capabilities and limitations. Keep repeatable replay/browser tests passing; collect device evidence before capacity promises. Next deepen formation/pathfinding behavior, add content schema validation, qualify deforming character/animation assets and test on Firefox/Safari. Revisit architecture using measured bottlenecks, not concept images.
