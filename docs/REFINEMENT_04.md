# Combat PoC 0.4: ranks, reserves and flanks

The previous demo exposed formation commands but advancing soldiers still pursued targets individually. This iteration replaces that behavior with formation-level motion and makes the command target visible on the field. It remains an experimental infantry battle, not Bannerlord parity.

## Play this encounter

Choose **Try the reserve & flank battle**. Roman formation 1 is the main infantry line, 2 the javelineers and 3 a held rear reserve. Gauls have two infantry formations and a ranged formation. Click the numbered field labels to select formations; selected soldiers receive ground rings and their destination footprint/facing is outlined.

1. Select Roman **1**, then **Hold here**. Start the battle and let the enemy commit to the front.
2. Select Roman **3**, then **Flank left** or **Flank right**. The route line shows the approach. The reserve marches to a lateral staging point, then toward the enemy flank and releases its charge after reaching that point or meeting resistance on the final leg.
3. Compare that with charging the reserve immediately or leaving it in reserve. The same seed and roster make the comparison repeatable. Flanking does not grant an artificial damage multiplier or promise a win.
4. Try **Face** and **Files** to rotate/widen a formation. **Fall back** now withdraws opposite the ordered facing. Line, shield wall and loose remain spacing choices, independent of frontage and facing.
5. Replay export/import includes facing, frontage, membership, reserve deployment and flank-route progression. Version 3 files are rejected by version 4 rather than interpreted under changed rules.

## What changed in the battle

- **Ranks are deployed as actual formation blocks.** Infantry, ranged troops and reserves occupy separate echelons. A reserve checkbox holds a compact rear formation at deployment.
- **Advance uses a shared moving anchor.** Soldiers follow persistent slots. The anchor slows to the slowest member's march speed, stops when average displacement exceeds 3m, and stops on close combat contact. Distant approach uses opposing formation extents; nearby approach uses actual target distances so two disciplined lines can reach weapon range.
- **Front-rank vacancies refill.** At a 30-tick boundary after strength changes, active non-routing soldiers receive compacted slots in stable ID order. Explicit facing/frontage/spacing orders also reform slots. This is deterministic compaction, not minimum-distance matching.
- **Charge releases slot constraints.** Existing target acquisition, bounded momentum, shield facing, stamina, stagger and morale then govern individual combat.
- **Exhausted javelineers close with sidearms.** The formation changes its preferred engagement range when its ammunition runs out or fire is held.
- **Bodies obstruct short melee attacks.** The release checks the ground-plane segment for intervening standing soldiers. This prevents a rear-rank weapon from passing through the soldier in front. It is not animated blade collision or a complete hit-region system.
- **Commands are visible.** Numbered clickable formation labels, strength, selection rings, destination outlines, facing arrows, flank-route segments and an in-position percentage connect the controls to the battle.

Formation controls remain capped at five per army. The IDs remain separate from troop roles, preserving the combined-arms extension plan.

## Evidence and interpretation

39 core/model tests include opposing disciplined-line engagement, slot cohesion, anchor recovery, rank refill, rotated fallback, two-leg flank completion, checkpoint continuation, snapshot ownership, large diagonal footprints and melee obstruction. Seven production-build Chromium flows include field-label selection, reserve setup, facing/frontage commands and exact flank-order replay. Asset geometry is unchanged from recipe 3; new visuals are tactical overlays, not newly claimed character art.

[Behavioral comparison](evidence/battle-lab-v4-tactics.json) records the same seeded encounter with the reserve held, charged immediately or sent left. The report includes commands, completion tick, casualties, outcome and state hash. One scenario is evidence of changed behavior, not proof of tactical balance or superior AI.

Scale measurements are recorded separately in [headless evidence](evidence/battle-lab-v4-headless.json). They cover two/five formations per army at 100/500/1,000 soldiers per side; At 1,000 per side the recorded p95 was 15.908 ms with two formations per army and 12.329 ms with five. CPU simulation measurements do not qualify browser/GPU frame rate.

The overview fits the actual army footprint. A paused battlefield redraws only when its state, selection, placement preview or camera changes.

## Remaining problems

Flanking uses two geometric waypoints around the nearest live enemy formation at command time. It does not replan around other formations or negotiate terrain corridors. Local rock/contact avoidance can delay or obstruct it; extreme arena-edge orders may be clamped. Long column reshapes can produce crossing traffic while reforming. Mounted units, siege, strategic command AI, elevation-aware ballistics, advanced animation/contact, battlefield audio and the campaign remain separate work. The larger navigation hierarchy is still planned.
