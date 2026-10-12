# ADR 0007: Cohesive formation motion before mixed arms

Status: accepted experimental implementation, 2026-10-11.

Formation IDs alone did not produce ranked combat: the previous advance intention still sought individual targets. Introduce a narrow deterministic formation controller within the existing simulation. Every tick, aggregate standing count, actual centroid, slot error, close contact and minimum speed. Advance moves the shared anchor; soldiers seek assigned slots. A charge releases that constraint. The controller reads tick-start positions and bounded formation state, never renderer state or wall time.

Persist integer facing (eight quantized headings), frontage in files, last assigned strength and flank waypoints. Rebuild world-space slots on explicit commands or at a fixed 30-tick casualty boundary. Clamp frontage to bound complete footprints, then fit anchors to arena bounds. Membership and stable ID tie breaks remain unchanged. Reserve flags belong to initial roster configuration; they do not prohibit later orders.

A flank is a deterministic two-leg approach to the nearest live enemy formation, selected by current centroid and ID tie break. Completing the last leg or meeting resistance there releases a charge. Routes are computed at command acceptance, bounded to the field and retained in hashes/checkpoints. Summary/checkpoint route arrays are copied so caller mutation cannot change live authority.

This intentionally precedes the planned sector/portal navigation and shared flow fields. Geometric waypoints do not guarantee clearance through terrain or other formations. Explicitly retain those limits and fixtures; do not claim a generic pathfinder. New mounted/crew movement classes must replace relevant movement assumptions with validated contracts rather than inheriting infantry mechanics silently.

Rules and worker protocol advance to version 4. Tests must demonstrate engagement as well as cohesion: two ranked armies that never reach weapon range are a failed controller even if their replay hashes match.

See [current slice](../REFINEMENT_04.md) and [combined-arms extension plan](../design/FORMATIONS.md).
