# GitHub Pages and release design

Status: the experimental custom battle builds to `dist/` with Vite base `/vibe-banner-band/`. Preview publication uses the `gh-pages` branch with `.nojekyll`; source remains reviewable in its feature PR. GitHub Pages serves only static client files. The production release gates below remain future requirements.

To update the preview, run all runtime checks, build from the reviewed source revision, then publish only `dist/`, license and source-revision metadata to `gh-pages`. Never overwrite source history. The build is pushed to that branch, but Pages activation is pending: the integration returned HTTP 403 (`Resource not accessible by integration`) when creating the Pages site. A repository administrator must select Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)`. The intended URL is https://karmiphuc.github.io/vibe-banner-band/. No service worker or offline cache is shipped yet.

## Static delivery

GitHub Pages serves built HTML/JS/Wasm/assets. Simulation, AI, saves and gameplay run locally. No API keys or secret credentials belong in client bundles. Accounts, cloud saves, authoritative multiplayer or shared economy need separately designed services and are deferred.

For project hosting, Vite base must resolve to `/vibe-banner-band/`; a future custom domain may use `/`. Test worker chunks, glTF external textures, audio and lazy-loaded assets under the actual configured base. Construct worker URLs through the bundler-supported module URL mechanism. Use in-app state/hash navigation initially; do not assume server-side route rewrites.

## Compatibility

HTTPS, WebGL2 baseline and ordinary transferable-worker messages. Do not require cross-origin isolation/SharedArrayBuffer. GitHub Pages does not provide ordinary custom response-header configuration; service-worker isolation workarounds exist but are not a baseline dependency. Wasm single-thread kernels remain possible later; validate MIME/loading/browser behavior when introduced.

Feature-detect capabilities and show clear unsupported-device or storage-unavailable messages. Initialize audio on user gesture; handle focus/visibility and fullscreen restrictions explicitly. Supported browser minimums are selected from M0/M4 evidence, not assumed from a library name.

## Build and publish plan

Pinned clean dependency install → type/unit/content/replay checks → production build → static path smoke test → package release manifest/assets → upload Pages artifact → deploy approved release commit. Use GitHub Actions official Pages actions with pinned versions/revisions and minimal permissions. Keep PR validation separate from deployment and prevent concurrent releases from overwriting each other unexpectedly.

Release manifest records app commit, simulation/protocol/save versions, authoritative and cosmetic catalog hashes, asset manifest hashes and tested browser matrix. Cache immutable hashed resources. Load one consistent manifest per session; avoid mixing an old worker with new content after an update.

## Caching/offline

Start with normal HTTP caching. Add a scoped service worker/PWA only after version handling is tested. Cache names and scope must be repository-specific because other project sites may share the same origin. Do not delete unrelated IndexedDB databases or caches. Offer update/reload at a safe session boundary; never swap mechanics mid-battle. Offline support applies only to downloaded content and can be lost to eviction.

## Save continuity and rollback

Store saves under an application namespace. Before an incompatible update, retain backups and run migrations from [save contract](../design/CAMPAIGN_AND_SAVES.md). Rolling back a site does not make newer saves compatible with older code: keep recovery/export paths and document supported downgrade behavior. Retain previous release artifacts and manifests. Re-deploy a known-good build only with its matching catalogs/assets.

## Size and hosting constraints

At research time, GitHub documents a 1 GB published-site maximum and 100 GB/month soft bandwidth limit. Stream optional regions/content and audit decoded memory as well as compressed size. 25 MB × 4,000 uncached downloads is approximately 100 GB, excluding other traffic. Reassess delivery when popularity or content exceeds the host's fit. Verify current terms for any later commercial distribution model.

References: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Vite static deployment](https://vite.dev/guide/static-deploy.html), [MDN transferable buffers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).
