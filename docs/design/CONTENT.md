# Content and extension contracts

Status: design specification. Formal JSON Schemas and the production compiler arrive in M2; the current documentation checker performs only limited example integrity checks.

## IDs and versions

Stable namespaced IDs such as `equipment.spear.ash.v1`, `ability.spear_thrust.v1`, `unit.militia_spearman.v1`. File paths and display names are not identities. Source JSON uses string IDs; the compiler creates compact numeric indexes in a stable sorted order and produces an immutable catalog plus SHA-256 digest. Never persist transient numeric indexes without the associated catalog identity.

Separate schema version (structure), simulation version (rules), content version/hash (values and IDs), asset contract version (rig/material/socket expectations), generator version and protocol version. A balance edit can break a replay even if the JSON schema remains unchanged.

## Catalogs

| Catalog | Required relationships |
| --- | --- |
| Units | body/rig family, loadout constraints, base stats, role and formation preferences |
| Equipment | slot, grip mode, class/tags, mass, gameplay profile, allowed abilities, visual asset ID |
| Abilities | prerequisites, cost, timing, targeting/effects, cancellation policy, animation requirements |
| Armor | slots/coverage/resistance, compatible body/rig, hidden-body masks |
| Animations | rig revision, clip ID, equipment/grip tags, phase mapping, root-motion policy |
| Visual assets | source recipe/hash, mesh/LOD/material IDs, sockets and bounds |
| Factions | permitted kits, palette/heraldry, recruitment and diplomatic starting data |
| World/biomes | terrain rules, nav classes, settlements, spawn tables, source asset sets |
| Progression | requirements, bounded stat modifiers, allowed ability unlocks |

Visual and simulation records join by equipment identity but remain independent: changing a texture does not alter reach. Validate visual weapon dimensions against approved gameplay tolerances. Cosmetic-only catalog changes need not invalidate a replay if the authoritative digest is separately defined and unchanged.

## Loadout compiler

Validate all references, unique IDs, integer ranges, schema versions and capacity limits. Check slot conflicts, two-hand/off-hand rules, body/armor compatibility, mount compatibility, required ammo, required sockets and clip availability. Exclude hidden body faces only through approved masks; do not delete arbitrary geometry at runtime.

Resolve derived stats and available abilities deterministically. Unsupported effect types are errors. Missing animations do not silently change abilities; mark the asset/loadout unqualified. Separate development placeholder status from release-qualified status.

## Build stages

Parse with size/depth limits → schema validation → graph/reference checks → semantic compatibility → deterministic ID assignment → simulation/render catalog separation → canonical serialization → content digests → asset manifest linkage → report.

Source order must not affect output. Diagnostic errors name source path, content ID and rule. Build reports include all input revisions and generator/toolchain versions. Compile twice in CI once M2 exists. Never let runtime load order decide overrides.

## Extension policy

Initial extensions are data-only packs with declared base version, namespace and dependencies. Define deterministic pack order and explicit conflict rejection; no implicit last-file-wins behavior. Limits apply to unit counts, effect chains, nested data and asset sizes. No remote JavaScript, arbitrary GDScript, Python or shader injection via content. New engine effect types require reviewed code and replay tests.

Editor tools should write the same source schemas as hand-authored data. Runtime read-only catalogs do not contain editor convenience objects. Hot-reload cosmetics in development; authoritative catalogs reload only when starting/restarting a session.

## Acceptance

One valid spearman and archer loadout compile. Invalid cases fail: unknown ID, duplicate ID, two-handed spear plus incompatible shield, skill without required equipment, wrong skeleton revision, missing clip/socket, out-of-range timing, incompatible pack dependency, oversized input. Example values in this repository are illustrative until the real compiler and asset checks exist.
