# Repository instructions

Read README.md, docs/README.md, and the applicable subsystem contract before editing. This repository currently contains plans, a playable experimental custom battle and equipment experiments, not a completed engine. See docs/CUSTOM_BATTLE.md for implemented scope.

## Engineering rules

- Preserve the existing license. Track third-party code and asset provenance independently.
- Keep the authoritative core headless: no DOM, Three.js, Godot, engine physics, filesystem, wall clock, or network imports.
- Do not add a second production renderer, arbitrary plugin framework, distributed backend, or general-purpose engine features without a demonstrated requirement and ADR.
- Use the deterministic arithmetic, ordering, command, content-version, and serialization contracts. No ambient random calls in authoritative code.
- Renderer LOD, visibility, hardware speed, and worker scheduling cannot change battle outcomes.
- Design extensions around explicit schemas and narrow interfaces. Validate untrusted save/mod content before allocation or execution. Initial mods are data-only.
- Do not replace missing source art with primitive stand-ins while calling the result a production character. Record missing dependencies and validation gaps.
- No performance claims without release-build measurements, scenario seeds, runtime versions, hardware, and timings. Preserve raw benchmark evidence.
- Avoid broad rewrites and speculative abstractions. Update relevant documentation in the same change as a contract change.
- Implement replay, content integrity, save migration, and meaningful failure-path checks as their subsystems arrive. Do not add tests that only restate implementation details.

## Validation and handoff

Run `python3 tools/check_docs.py` for documentation changes. Follow docs/engineering/TESTING.md for runtime/asset changes. Distinguish existing checks from future requirements. Report what changed, evidence, and remaining limitations. Keep generated binaries, rendered previews, caches, credentials, and local build directories out of commits unless explicitly selected as a reviewed fixture.
