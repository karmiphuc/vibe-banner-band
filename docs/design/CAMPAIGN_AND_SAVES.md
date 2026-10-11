# Campaign, encounters and persistence

Status: planned after battle/asset foundation. A persistent world is not a continuously simulated population of battle agents.

## Campaign representation

Parties carry stable identity, region/local travel location, route, roster, supplies, morale, faction and strategic intent. Settlements hold inventories, production, recruitment and ownership. Simulate travel on a coarse graph and schedule economy/recruitment events. Deterministic event ordering uses due game time, category priority and stable ID. Do not run individual soldier locomotion outside tactical encounters.

Use a fixed world seed and versioned generation rules plus persistent deltas. Roads, settlements and passability must be generated coherently and checked for connectivity. Decorative scatter cannot alter navigation invisibly. Keep generated region IDs stable across loads; changing worldgen versions requires explicit migration or a new campaign.

## Time policy

Initial policy: campaign clock pauses during tactical battle. Battle-local time drives combat. Encounter resolution then advances a documented campaign duration once, if chosen by design. No real-world offline progress in the first version. This removes an uncontrolled concurrent economy while preserving a later extension point.

## Encounter transaction

1. Reserve participating parties/rosters in a campaign checkpoint with an encounter ID.
2. Build immutable encounter input: roster instance IDs, loadouts, positions/approach, terrain seed/version and rules hash.
3. Start battle without mutating the campaign roster in parallel.
4. Finish with result carrying encounter ID, input digest, survivors/wounded/killed/captured, equipment/ammo changes and rewards.
5. Validate conservation and identity constraints; reconcile atomically and record the applied encounter ID.
6. Release reservations and save a new campaign checkpoint.

Reapplying a result is idempotent. An interrupted transition resumes from its recorded phase; never duplicate soldiers or rewards. Validate casualty totals and unique roster membership. Auto-resolved distant encounters are a separate deterministic campaign rule, not a substitution for the player's promised simultaneous battle size.

## Save format

Header: save schema, simulation/content/worldgen versions and hashes, campaign/session IDs, logical game time, checksum, payload lengths and compression flag. Payload contains campaign state, active encounter checkpoint if any, pending transaction phase, authoritative RNG/scheduler state and stable source IDs. Renderer state is optional UI preference data, not authoritative.

Use canonical checkpoint serialization from [determinism](../architecture/DETERMINISM.md). Battle checkpoints include active actions, hit registries, navigation/scheduler state needed for identical continuation, pending commands and events. Derived caches can be omitted only when deterministic reconstruction is demonstrated.

## Storage and reliability

IndexedDB adapter writes a new versioned checkpoint and its index pointer in one transaction. Retain a bounded rolling backup history. Save at safe tick boundaries, before/after encounters and explicit user request. Serialization may be expensive: measure pause cost and transfer prepared buffers rather than blocking the render thread with huge object clones.

Handle quota errors, unavailable/private storage, failed upgrades and corrupted saves with actionable messages. Request persistent storage when appropriate but do not depend on approval. Always support explicit file export/import; browser storage can be evicted. Import treats data as untrusted: validate size, schema, hashes, references and decompressed limits before allocating. No executable save payloads.

## Migration

One-way pure migration steps `vN -> vN+1`, version-controlled fixtures and backup-before-write. Never overwrite the only original save. Unsupported future formats fail with a clear version message. Content ID remaps are explicit; missing items cannot silently become arbitrary index zero. Migration of campaigns does not imply old replay compatibility.

## Tests

Round-trip save equality; mid-attack resume; crash during encounter reconciliation; duplicate result application; quota failure; truncated/malicious import; old supported schema migration; missing content version; clearing browser storage then importing a backup. Verify roster/resource conservation across repeated encounters.

Reference: [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
