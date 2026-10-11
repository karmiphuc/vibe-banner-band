# Contributing

## Pick a bounded milestone

Use [ROADMAP.md](docs/ROADMAP.md). The first runtime work establishes a headless arithmetic/replay kernel and an instrumented crowd scene. Do not begin a large campaign or siege system before the battle and asset gates pass.

## A change is ready when

1. Its behavior and non-goals are clear.
2. Its dependency direction follows [architecture](docs/architecture/OVERVIEW.md).
3. Relevant content/version/save/replay consequences are documented.
4. Required checks pass, or the change is explicitly a draft with blockers.
5. New assets have source, license, revision, hashes, and validation evidence.
6. Performance-sensitive changes include before/after evidence using the same scenario and machine.

For planning changes, run `python3 tools/check_docs.py`. For future runtime code, the exact pinned toolchain and commands must be established in M0, then recorded here; no package-manager setup is currently implied.

## Decision process

Small implementation choices belong in code and tests. Cross-cutting or costly choices belong in [decision records](docs/decisions/README.md). State status, constraints, alternatives, consequences, and what evidence would reopen the decision. A proposed decision is not a passed benchmark.

## Pull requests

Use focused branches. Describe the concrete behavior, reason, validation, and known limitations. Do not commit vendored commercial assets, generated armies, credentials, or large render outputs. Publishing a static client and changing production save formats require the corresponding release gates, not merely a successful local build.
