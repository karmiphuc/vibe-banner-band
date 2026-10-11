# Vibe Banner Band

A browser-first, isometric historical sandbox in development: command formations and fight as a character in battles targeting **100–1,000 simultaneously active soldiers per side**. Travel, recruit, trade, and develop a company in a persistent campaign. Deploy the client as static files on GitHub Pages.

**Status: playable Roman–Gallic custom-battle experiment, 2026-10-11.** Configure armies, watch AI commanders and troops fight, inspect original equipment-bearing models, and verify deterministic replays. Campaign, production character assets, and full device qualification remain planned.

[Play the battle laboratory](https://karmiphuc.github.io/vibe-banner-band/) · [Controls, capabilities and limits](docs/CUSTOM_BATTLE.md) · [Double-check findings](docs/REVIEW.md)

## Start here

1. [Product scope and success criteria](docs/PRODUCT.md)
2. [Architecture and dependency boundaries](docs/architecture/OVERVIEW.md)
3. [Deterministic simulation contract](docs/architecture/DETERMINISM.md)
4. [Content, equipment, and ability contracts](docs/design/CONTENT.md)
5. [Reproducible asset production](docs/assets/PIPELINE.md)
6. [Dependency-ordered implementation roadmap](docs/ROADMAP.md)

The [documentation index](docs/README.md) covers navigation, combat, rendering, worker transport, saves, testing, deployment, decisions, risks, and research sources.

## Proposed foundation

- TypeScript headless simulation; Three.js orthographic presentation; Vite static build.
- Fixed-tick authoritative rules, explicit integer arithmetic, stable ordering, recorded commands, and replay hashes.
- Formation navigation, shared flow fields, local spatial queries, and bounded deterministic work scheduling.
- Versioned content catalogs linking unit loadouts, equipment, abilities, animations, and asset manifests.
- Blender-generated equipment and approved modular character sources, with explicit quality and reproducibility gates.
- One dedicated worker with transferable snapshots; no mandatory shared memory, WebGPU, backend, or hosted runtime.

The current slice implements the TypeScript/Three.js/worker foundation. Flow fields, production animation and compiled asset packs remain planned. The renderer choice must still pass the [engine evaluation gate](docs/decisions/0001-browser-engine.md).

## What runs today

Use Node 24.19.0 (`.nvmrc`):

```sh
npm ci
npm run dev
# Open http://localhost:5173/vibe-banner-band/
```

`npm test`, `npm run check:boundaries`, and `npm run build` check the implementation. See the [battle guide](docs/CUSTOM_BATTLE.md) for browser tests and benchmarks.

Documentation checks (Python 3.11+; standard library only):

```sh
python3 tools/check_docs.py
```

A small procedural sword/shield example is preserved as a research artifact:

```sh
blender --background --threads 4 \
  --python tools/assets/generate_equipment.py -- --output build/equipment
```

See [example scope and reproducibility evidence](tools/assets/README.md). It is not a production character generator, does not generate animations, and has not passed an engine import or full asset-quality gate. Build outputs are intentionally ignored.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Implement the roadmap in dependency order. Changes to authoritative behavior, persisted formats, asset contracts, or package boundaries need an updated decision record and relevant evidence.

## License and provenance

The repository retains its existing [GNU GPL v3 license text](LICENSE). Third-party assets keep their own licenses and must have source/version/redistribution records before inclusion. No TaleWorlds assets, branding, or game data are included. No third-party character library has been imported.
