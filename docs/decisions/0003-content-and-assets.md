# ADR 0003: Content and asset compilation

Status: accepted architecture, 2026-10-11; only the equipment experiment exists.

## Decision

Versioned declarative catalogs define units, equipment, abilities and visual bindings. Offline compilation validates references, compatibility and deterministic ordering. Asset generation assembles approved bodies/rigs/armor and creates suitable procedural equipment details under pinned recipes/tool versions. Quality gates determine production qualification.

## Alternatives and consequences

Prompt-only model generation does not ensure topology, fitted equipment, grips or animation compatibility. Hand-authoring every variant scales poorly. Unrestricted runtime modularity multiplies draw submissions and validation combinations. The selected approach retains authored quality and source modularity while compiling a bounded set of optimized runtime loadouts.

Need tooling for schemas, manifests, source provenance, pose review and LODs. Source/artifact hashes and semantic/binary/pixel reproducibility are distinct. No full automatic-quality guarantee; critical source art and motion still require qualified authorship/review.

## Gate/revisit

One validated soldier with multiple compatible equipment sets, required clips, correct sockets and runtime LODs, followed by crowd measurements. See [pipeline](../assets/PIPELINE.md). Revisit deformation/rig families when cavalry or substantially different anatomies require them; do not force all content onto one unsuitable skeleton.
