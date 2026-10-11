# Verification and CI plan

## Current checks

The [custom battle](../CUSTOM_BATTLE.md) has 13 headless/model tests and three production-build Chromium tests, including worker backpressure and headless/worker replay agreement. `runtime.yml` runs boundaries, tests, typecheck/build and browser tests. Firefox/Safari and real-device GPU performance remain open.

`python3 tools/check_docs.py` checks local Markdown file links, JSON syntax and limited reference/timing integrity in the illustrative catalog. The documentation workflow runs it on pushes and pull requests. It does not validate a game engine, external URL availability, asset quality, or the full future schema.

The procedural equipment experiment has [recorded repeat-build evidence](../../tools/assets/evidence/repeat-build.json). It has no production rig or gameplay and has not run the Khronos validator or a browser engine import.

## Planned layers

| Layer | What must be proven | Introduced |
| --- | --- | --- |
| Numeric kernel | Integer bounds, rounding, overflow, PRNG vectors, ordering | M1 |
| Replay/state | Same inputs → same canonical states; divergence diagnostics | M1 |
| Content | Schemas, reference graph, incompatible loadout rejection, repeat compile | M2 |
| Combat | Phase boundaries, resources, blocks, simultaneous damage, projectiles | M3 |
| Navigation | Reachability, no illegal crossing, congestion recovery, bounded work | M3 |
| Transport | Real buffer ownership, backpressure, stale/duplicate messages | M3 |
| Asset | Geometry/rig/clip/import checks plus reviewed pose renders | M2/M4 |
| Persistence | Round-trip, migrations, quotas, interrupted reconciliation | M5 |
| Browser flow | Load → deploy → command → battle → save/reload | M4/M5 |
| Performance | Fixed scenario release-build reports and regressions | M0 onward |
| Deployment | Repository base path, cold cache, offline/version behavior | M0/M6 |

## Meaningful fixtures

Small deterministic scenarios should expose a rule, invariant or regression; avoid snapshots that merely freeze incidental implementation details. Property checks cover resource/roster conservation, finite/in-range state, no duplicate IDs, no dead actor issuing new actions, and collision constraints within declared tolerance.

Golden replay fixtures record simulation/content/numeric-format versions. Changing them requires explaining the intentional rules change and comparing event/state divergence. Never regenerate all goldens to hide a nondeterminism failure.

## Cross-runtime matrix

Headless simulation plus Chromium/Firefox/WebKit automation where available; separately qualify actual supported desktop browsers, including Safari. Different render frame rates, worker message delays, cosmetic settings and repeated runs must produce identical authoritative hashes. Emulator/WebKit automation is not identical to a real Safari hardware performance test.

## Failure injection

Worker crash; full snapshot pool; corrupted/wrong-version catalog; missing mesh or clip; GPU context loss; storage quota failure; canceled load; duplicate command; huge save import; interrupted encounter commit. Check that failure yields explicit pause/error/recovery and does not invent a new battle outcome or duplicate rewards.

## CI evolution

Current: documentation, pinned runtime build, core/model tests, and Chromium integration checks. Remaining milestone requirements: M0: pinned toolchain/install/build/type/import checks and artifact reporting. M1: fast headless determinism suite. M2: schemas/compiler and small asset fixture checks; full Blender jobs can be separate because they are heavier. M3–M5: browser integration and replay matrix. M6: release build/base-path smoke and signed-off benchmark reports on named devices.

Run GPU benchmarks on suitable controlled hardware when available; never use shared CI timing as a strict real-device FPS gate. Use relative regression thresholds only after observing runner variability. Keep dependency/action versions pinned at runtime bootstrap, update intentionally, and grant CI least required permissions. Pull-request checks do not deploy the game.

## Done criteria

A subsystem needs contract, implementation, relevant tests, diagnostics and benchmark impact where applicable. A visually plausible screenshot is insufficient. For assets, automatic checks plus human pose/scale review are both required. For performance claims, attach [measurement context](PERFORMANCE.md). For docs-only changes, report docs checks rather than pretending runtime tests exist.
