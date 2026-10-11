# Performance targets and measurement

Current PoC 0.3: [headless evidence](../evidence/battle-lab-v3-headless.json) records p95 1.186/4.847/10.042 ms at 100/500/1,000 per side with two formations per army; five formations measured 0.7/4.205/9.661 ms. Full roster configurations are retained in the evidence. Rules and battle trajectories changed; this is not a controlled regression comparison.

Historical PoC 0.2: [new-rule headless evidence](../evidence/battle-lab-v2-headless.json) records p95 1.167/4.717/10.778 ms at 100/500/1,000 per side with two formations per army; five formations measured 0.7/4.205/9.661 ms. Full roster configurations are retained in the evidence. This is a single 600-tick diagnostic with changed rules/workload, not a controlled speedup claim or browser benchmark. Near/crowd recipe geometry counts are in the [asset report](../evidence/model-recipes-v2.json).

Historical PoC 0.1: [one-run headless battle evidence](../evidence/battle-lab-headless.json) now exists. On the recorded Xeon/Node environment, p95 tick times were 1.050 ms at 100/side, 6.659 ms at 500/side and 26.351 ms at 1,000/side. The largest run had a 34.628 ms p99, above the 33.3 ms tick budget. These are simulation diagnostics, not browser FPS or device qualification. Targets below remain engineering budgets to test.

## Workload definition

100, 500 and 1,000 units **per side**, simultaneously active. Upper-scale mixed scenario initially uses 60% infantry, 25% archers, 15% cavalry per side. Cavalry has separate horse/rider costs. Include active attacks, projectiles, deaths/corpses, morale, obstacles, formation orders, UI and audio. Seed, map/content/simulation versions and command schedule must be recorded.

## Initial budgets

| Metric | Goal | Interpretation |
| --- | --- | --- |
| Desktop render | 60 FPS goal; 30 FPS supported fallback tier | At declared resolution/hardware, not every device |
| Simulation rate | 30 ticks/s | 33.3 ms real-time tick interval |
| Worker tick cost | p95 <20 ms | Leaves scheduling/headroom; also report p99/backlog |
| Main-thread CPU work | p95 <10 ms/frame for 60 FPS tier | Not a GPU-time or total-frame guarantee |
| Local input feedback | p95 <100 ms | Measure event → visible acknowledgement separately from rule execution |
| Initial download | Candidate ≤15 MB compressed before menu/basic encounter | Audit actual contents; art may force a documented revision |
| Decoded working set | Set after M0 device capture | Measure textures, animation buffers, geometry and JS separately |
| Repeat sessions | No sustained unexplained memory growth | 20 encounter load/unload cycles, plus long-session run |

Do not treat worker cost and main-thread cost as additive time on one thread; they overlap and compete for hardware. A fast mean with large p99 stalls fails responsiveness goals. Memory/GPU limits differ by browser; distinguish measured values from estimates and avoid claiming exact GPU allocation from JS heap alone.

## Device/runtime matrix

Select and record a Windows integrated-GPU laptop (Chrome and Firefox), a MacBook (Safari and Chrome), and a mainstream desktop. Log model, CPU/GPU, RAM, OS, browser version, power mode, viewport, device-pixel ratio, display rate, thermal conditions, build commit and graphics capabilities. Hardware access is currently unconfirmed. Headless CI numbers are regression indicators, not substitutes for these devices.

Baseline viewport 1920×1080 with controlled pixel ratio; add a higher-resolution stress case. Mobile is a later independently qualified tier with thermal/touch/memory tests; do not promise 2,000-unit mobile support.

## Scenario suite

| Scenario | Primary risk |
| --- | --- |
| Open field 100/500/1,000 per side | Scaling curve and regression baseline |
| Dense infantry engagement | Contact density and target contention |
| Opposing bridge traffic | Congestion and pathological spatial buckets |
| Concentrated archer volleys | Projectile sweeping and effect peaks |
| Cavalry charge into braced infantry | Fast contact, animation and mount cost |
| Mass retreat/rally | Target/route churn and morale spikes |
| Repeated formation order changes | Navigation queue/cache thrashing |
| Zoomed-out all-visible battlefield | GPU geometry/overdraw and UI readability |
| Camera crossing dense scenery | Culling/streaming and asset uploads |
| Twenty encounter cycles | Leaks, stale workers and disposal |

Add siege/gate/ladders only in the siege milestone; do not extrapolate open-field results to siege density.

## Measurement protocol

Production build, fixed scenario inputs, warm-up (candidate 30 s), then at least 120 s capture, three runs per configuration. Retain raw samples and median/variation across runs. Also record a 15-minute sustained battle/campaign transition stress run for thermal/leak behavior where feasible. Warm and cold asset loads are separate measurements.

Capture frame p50/p95/p99 and long stalls; tick cost per system; backlog; command latency; neighbor candidate/bucket counts; navigation expansions/cache and queue delay; snapshots dropped/pool occupancy; draw calls/triangles; animation/texture allocations; GC/heap trends; active projectiles/events. Use GPU timers only where supported and handle disjoint/invalid results. Profiling overlays themselves have cost.

Benchmark renderer-only, simulation-only and integrated workloads to localize bottlenecks. Include a replay hash check in every correctness-preserving optimization comparison.

## Optimization order

Eliminate global scans and allocation churn → bound/correct dense queries and navigation → batch compatible meshes/materials → optimize animation/attachments → LOD/culling/overdraw → measured Wasm/GPU presentation experiments. Never change target count, AI rules or collision correctness silently to improve a chart.

Publish a supported-device table only after the gate passes. If it fails, record measured limit and reason; revisit implementation or explicitly revise product scope through an ADR.
