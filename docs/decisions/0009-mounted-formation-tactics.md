# ADR 0009: Deterministic mounted formation controllers

Status: accepted experiment, 2026-10-11.

## Context

Direct charge and individual mounted skirmish movement cannot express repeated flank, impact, withdrawal and reassembly. The battle needs inspectable formation-level decisions while retaining deterministic unit combat and five independent formation IDs per army.

## Decision

Add validated role-specific `tactic` orders and a pure fixed-cadence controller over the existing formation census. Store every phase variable in FormationState, hash it, and copy it independently into checkpoints and summaries. Preserve the existing soldier movement, combat and collision loop; mounted tactics supply slot destinations instead of individual pursuit. Manual maneuver/layout orders cancel the controller; fire orders do not. Add a deterministic filled-skein slot layout. Bump simulation compatibility to battle-lab-6 and worker protocol to 6.

## Alternatives and consequences

Per-rider circling alone cannot coordinate a formation. A general behavior-tree framework or arbitrary plugin interface is unnecessary for six bounded maneuvers. This explicit controller is easier to test, but target selection and navigation remain deliberately limited. Deadlines bound waiting, not successful route completion. No claim is made that this duplicates Bannerlord's implementation.

## Validation and revisit

Require phase-transition fixtures, incompatible-order atomicity, checkpoint isolation, command replay agreement in Node and the browser worker, and large-army timing evidence. Revisit target scoring and approach planning when replay fixtures demonstrate a specific terrain or threat failure. See [implemented behavior and limitations](../REFINEMENT_06.md) and [formation contracts](../design/FORMATIONS.md).
