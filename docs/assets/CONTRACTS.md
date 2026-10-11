# Asset contracts

Status: proposed v1; freeze with the first qualified soldier in M2. All numeric budgets here are hypotheses to benchmark.

## Coordinate and origin conventions

Author in metres, Blender Z-up; export glTF Y-up using the pinned exporter. Define forward direction and root origin explicitly in the profile (proposed exported character forward +Z, feet root at ground origin). The adapter maps this to the simulation ground plane. Apply/validate scale before rigging/export; no accidental negative scale or centimetre/metre mismatch.

Weapons have asset-local origins/axes documented in their manifests, independent of showcase placement. Production exports have an item root with sockets as children. The equipment demo currently uses scene-positioned meshes and named empties; it is not yet this production item hierarchy.

## Rig and sockets

Versioned skeleton name, hierarchy, rest-pose hash, bind-pose transforms, bone count and skin influence policy. Initially one approved humanoid family and a separate horse family. Suggested crowd skin limit: four influences/vertex, normalize weights and reject unweighted vertices. Bone palette budgets come from the chosen crowd shader, not an arbitrary universal number.

Required humanoid sockets: primary hand, off-hand, back/sheath, head and projectile origin where applicable. Weapon sockets: primary grip, secondary grip for two-hand weapons, tip/edge markers for validation, sheath attachment. Shield: hand/forearm attachment and front axis. Horse: rider seat, stirrup/foot targets and rein reference. Define whether each socket is bone-relative or mesh-relative and its coordinate basis; verify after export/import.

Visual markers assist checks; authoritative collision profiles live in gameplay catalogs. Mesh LOD cannot alter weapon reach or shield protection.

## Animation

Clip ID/version, compatible rig/grip/equipment tags, duration, loop mode, root-motion policy, normalized phase markers, socket tracks and bounds. Initial baseline uses in-place locomotion; simulation owns movement. If an attack needs displacement, author a deterministic gameplay displacement profile separately. No engine root-motion extraction drives authoritative positions.

Required initial suite: idle, walk, run, directional turn/aim policy, thrust/slash, block, hit, death. Archer draw/release and mounted gait/attack are additional families, not automatic retarget guarantees. Validate looping seams, hand placement, shield intersection and attack timing at varied playback speeds. Pose sampling includes extreme joint configurations and LOD transitions.

## Proposed delivery budgets

| Profile | Triangles per character including equipment | Starting representation |
| --- | --- | --- |
| Hero close | 15k–30k | Richer skinned mesh; bounded materials |
| Troop near | 4k–8k | Batched compatible loadouts |
| Troop mid | 1k–2k | Reduced mesh/animation detail |
| Troop far | 200–500 or impostor | Silhouette/equipment identity retained |

These are not all-on-screen budgets or a 60 FPS promise. Two thousand troops at 4k triangles already imply eight million character triangles before terrain/shadows. Optimize material, animation and overdraw costs as well as triangles. Start with one or two material sets per assembled ordinary troop; benchmark the actual shader and attachment path.

Texture and animation atlases have explicit maximum dimensions, color space, padding/mipmap rules and byte accounting. Texture download size is not decoded GPU memory. Select supported compression formats through the asset loader with tested fallback; do not require an unsupported extension. Share palettes/atlases and cache bounded assembled kits.

## Manifest fields

`assetId`, `contractVersion`, `generatorRevision`, `toolVersions`, `sourceHashes`, `licenseRecords`, `recipeHash`, `outputHashes`, `coordinateProfile`, `rigId/restPoseHash`, `sockets`, `lods`, `materials/textures`, `clips`, `bounds`, `gameplayEquipmentIds`, `validationResults`, `qualificationStatus`.

Hashes must declare canonicalization and what is covered. Release-qualified means all required gates in [pipeline](PIPELINE.md) passed. A manifest with `prototype` or missing checks cannot be silently promoted. Store small manifests/reports in Git; keep bulk builds in the chosen artifact store unless a reviewed fixture is needed.
