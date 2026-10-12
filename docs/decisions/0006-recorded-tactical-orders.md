# ADR 0006: Boundary-stamped tactical orders

Status: accepted experimental implementation, 2026-10-11.

## Context

The combat proof of concept needs player-directed formations without direct hero control. Configuration-and-tick replay alone cannot reproduce a battle once commands change during combat. Browser timing must not become an implicit replay input.

## Decision

Use typed, bounded order payloads validated in the authoritative core. The worker processes each received order between simulation steps, stamps it with the current tick and a consecutive sequence, then returns updated authoritative status. At the same tick, sequence defines the order. Paused orders are immediate boundary changes, not queued for a future play action.

The replay contains the immutable initial configuration plus accepted orders and an endpoint/hash. Import validates the entire log's syntax, count, sequence and tick bounds before re-simulation. Replay applies orders at tick zero, after each step and at the endpoint; future commands are forbidden. Commands attempting impossible semantic actions, such as placing an anchor in a rock or issuing orders after victory, fail in the same core validator.

Formation IDs 0–4 are scoped to each army and separate from troop roles. Membership and integer share allocation are part of the initial configuration, with at most five formations per army. Commands can target one ID or all formations. Hash/checkpoint coverage includes formation membership, state, slots and complete accepted history. The worker keeps its existing session checks and transferable snapshot backpressure. It alone decides the boundary; UI labels use acknowledged state. No tactical command is inferred from rendering, frame time or animation callbacks.

## Consequences and limits

This supports deterministic single-client tactical experiments and branching by resuming an imported replay. It does not implement multiplayer lockstep, rollback, command prediction, public checkpoint saves or save migration. The 256-command ceiling bounds replay size/work. Extending formation groups or persisted order semantics requires explicit rule/protocol compatibility changes and fixtures.

Rejected alternatives: record browser timestamps (machine-dependent), issue commands directly through renderer state (breaks authority), or keep config-only replay after introducing orders (silently loses behavior).

[Implementation guide and evidence](../REFINEMENT_03.md).
