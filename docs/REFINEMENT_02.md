# Proof of concept 0.2: combat and equipment studies

This iteration makes the existing Roman–Gallic laboratory easier to observe, compare and inspect. It remains a bounded combat proof of concept, with autonomous commanders and no direct hero control.

## Try it

1. Choose **The frontier**, **Hold the passage**, **Javelin exchange**, or **Clash of armies**. Presets set troop mix, doctrine, terrain and seed together; all fields remain editable before combat.
2. Begin the battle. Watch the phase caption, minimap and chronicle. Toggle **Tactical** for faction rings and distance markers. Routing troops use a neutral marker.
3. Select a soldier and choose **Follow** to track it at inspection distance. Dragging cancels tracking. Rotate the camera by 90° or expand the field with the toolbar. **Fit battlefield** restores the army view.
4. Open **Model workshop**. Rotate any of the six equipped units on a lit turntable, compare idle/march/attack/guard studies, and switch ranged units to their sidearms. **Crowd geometry** exposes the actual simpler battlefield model for comparison.
5. Inspect shield support, built-up charge damage and recorded blocks. Pause/step and replay checks remain available. Battle results show surviving troops, damage and commander activations.

## Authoritative changes

Rules version is now `battle-lab-2`; worker protocol is 2. Old rule-version replay imports fail explicitly. Cosmetic asset revision is separate from the combat version.

- Melee targeting searches an 8m neighborhood; ranged targeting searches 22m. Candidates outside the radius are rejected. Disciplined troops prefer targets aligned with their deployment file until close contact. File correction relaxes when the opposing front is near, allowing pursuit across depleted files.
- Shield-wall doctrine grants +10 frontal block chance per eligible ally within 1,900 fixed-point units, capped at two. Eligible allies are active, non-routing infantry/commanders. Support is computed from tick-start positions; there is no isolated flat +20 shield bonus.
- Charge doctrine builds at most 60 momentum during forward ready-state movement. A melee strike adds `floor(momentum / 6)` damage and consumes momentum. Routing clears it. This is a bounded impact rule, not rigid-body momentum or cavalry physics.
- An attack commits to its target through windup. A newly closer enemy cannot redirect an attack already being prepared.
- Commanders deploy behind the last rank, avoiding the rear-rank overlap found by the formation fixture.
- Snapshot fields now expose momentum, nearby shield support, cumulative blocks and action serial. All new authoritative fields participate in checkpoints and fingerprints.

These are formation-aware local rules, not the planned formation-command/flow-field system. Approximate crowd separation and the existing terrain limits still apply.

## Presentation and asset changes

- Seeded cosmetic vegetation and supply camps, procedural ground texture, softened directional lighting and shadows for battles up to 600 total soldiers. Larger configurations keep inexpensive contact shadows.
- Original near models add mail detail, suspension straps/scabbards, helmet hardware, leather skirt strips, shield rivets, hair and ranged equipment. Bounded per-soldier scale/tint variation is cosmetic.
- A second geometry tier preserves the same five articulated parts and equipment classes with fewer than 35% of the near-tier vertices for every tested kit/sidearm variant. Camera zoom selects the tier with hysteresis; selected soldiers retain detail. Offscreen soldiers are omitted from presentation batches only.
- Distinct windup/recovery, marching, shield guard, hit recoil, shield sparks and commander rally pulses make combat events easier to read. No animation event deals damage.
- The workshop loads on demand and disposes its renderer, controls, geometry and observer when closed. Its pose studies are cosmetic demonstrations, not a production skeletal animation library.

`npm run assets:report` builds every near/crowd kit twice and reports positions, normals, vertex colors and joint-transform hashes. [Recorded recipe report](evidence/model-recipes-v2.json) identifies coverage and local repeatability. Pixel identity and production rig qualification are not implied.

## Verification

18 headless/model tests cover reproducibility, checkpoint continuation, lethal trades, morale, commander behavior, obstacles, swept projectiles, hostile replay input, 2,000-unit stepping, supported shields, one-use charge impact, formation-file preservation, committed windups and geometry reduction. Four browser tests cover deployment, real-worker replay agreement, controls/import failure, responsive layout, buffer exhaustion/stale sessions, presets, tactical/follow controls and workshop lifecycle/variants.

Browser evidence uses Chromium with software graphics in this execution environment. It does not establish real-device frame rates or Safari/Firefox support. The [current 600-tick headless run](evidence/battle-lab-v2-headless.json) recorded p95 ticks of 1.167 ms at 100/side, 4.717 ms at 500/side, and 10.778 ms at 1,000/side on the stated Xeon/Node environment. This is one run, not a frame-rate guarantee; changes in rules and workload prevent treating different-rule timings as a controlled optimization benchmark.

## Next proof points

General terrain routing and formation orders; elbow/knee and deforming skin animation; attachment/grip review across combat poses; controlled device benchmarks with larger armies; multi-browser replay validation. The current unit models and shadows are explicitly proof-of-concept quality.
