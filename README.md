# Vibe Banner Band

A planned browser-first, isometric medieval sandbox: command formations and fight as a character in battles targeting **100–1,000 simultaneously active soldiers per side**. Travel, recruit, trade, and develop a company in a persistent campaign. Deploy the client as static files on GitHub Pages.

**Status: architecture and production planning, 2026-10-11.** There is no playable game or implemented simulation in this repository. Battle capacity and frame-rate numbers are acceptance targets, not benchmark results. Concept images are not implementation evidence.

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

These are documented decisions/proposals, not installed dependencies. The renderer choice must pass the [engine evaluation gate](docs/decisions/0001-browser-engine.md).

## What runs today

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
