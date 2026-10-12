# ADR 0010: Carried banner equipment

Status: accepted experiment, 2026-10-11.

## Context and decision

Equippable standards require stable item and bearer identities across replay and checkpoints. Store both in formation state, assign an existing troop deterministically at deployment, and accept faction-compatible equipment orders only before combat. Advance simulation identity to battle-lab-7 and worker protocol to 7. Earlier replay versions remain incompatible rather than receiving an untested migration.

## Alternatives and consequences

A renderer-only flag would not preserve equipment choices in a replay. Hero inventory, battlefield recovery and formation bonuses would expand the combat contract beyond this equipment experiment. They remain unimplemented. Render original procedural standards at the bearer’s grip or back sling, retaining renderer-independent outcomes and bounded equipment allocations.

## Validation and revisit

Require order rejection before mutation, checkpoint/replay preservation, reproducible geometry and browser equipment checks. Revisit ownership when hero inventory or bearer recovery is implemented; revisit attachment with proper carry/stow animation. See the [equipment contract, references and limitations](../assets/BATTLE_STANDARDS.md).
