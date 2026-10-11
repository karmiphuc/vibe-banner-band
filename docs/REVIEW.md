# Double-check and implementation review

Date: 2026-10-11. Scope: inspect the planning baseline, implement an experiment the user can play, verify claims against executable evidence.

## Findings in the planning baseline

1. **Plans could be mistaken for implemented systems.** Kept roadmap milestones uncompleted and added a separate custom-battle capability/limitations document.
2. **Production asset prerequisites were missing.** No body/rig/clip library was qualified. Implemented original articulated equipment-bearing prototype recipes and labeled them as such; no production-humanoid claim.
3. **Engine choice was unproven.** Three.js now has a real executable browser slice, but no evidence establishes superiority over Godot or closes the full engine comparison gate.
4. **Strict fixed-point arithmetic was only specified.** Implemented bounded integers, exact integer square root, known PRNG vectors, reproducible headless runs and browser-worker comparison. Full multi-browser qualification remains open.
5. **Crowd navigation and performance had no measurements.** Added actual spatial queries/contact, a bounded small terrain set and headless evidence; no claim of flow fields, general navigation or proven 2,000-unit rendering.

## Corrections during implementation review

- Movement/target queries now read tick-start positions so earlier movement writes do not alter later intentions.
- Simultaneous damage is accumulated before death cleanup; a test covers mutual lethal attacks.
- Shield checks for projectiles use incoming segment origin, not the shooter's later position.
- Empty-ammo javelineers switch both gameplay behavior and visible held equipment.
- Primary battle controls remain reachable while the setup form scrolls independently.
- A full snapshot pool drops presentation snapshots but does not stop the simulation; status responses still deliver final state. Browser tests exercise this with no recycled buffers.
- Rendering/disposal uses owned geometry/material/instance lifetimes; reset tests cover the user flow. A 20-session memory qualification is still outstanding.
- Replay input validates version/content/seed/count/length/checksum and a 64 KB file bound; replay generation yields between batches so reset can cancel it.

## Verification and scope

Headless tests cover arithmetic vectors, deterministic re-execution, checkpoint continuation, conservation, lethal trades, commander/morale behavior, outcrop exclusion, swept projectiles and invalid inputs. Model tests compare generated positions/colors between repeated builds. Browser tests exercise real worker transfer/replay behavior, headless/browser hash agreement, setup, model inspection, pause/step and responsive layout.

Performance evidence is explicitly a one-run headless diagnostic under a recorded Node/Linux CPU configuration. It is not the three-run device/browser qualification in the broader plan. A successful build or screenshot does not close the larger roadmap gates.

## Proof-of-concept refinement review

See [0.2 refinement](REFINEMENT_02.md). Added a regression fixture for rear-rank commander overlap, corrected that deployment defect, committed targets during windup, made shield support spatial, and exposed actual geometry tiers in a disposable inspection workshop. New simulation fields are included in replay/checkpoint identity; old rule versions are rejected.
