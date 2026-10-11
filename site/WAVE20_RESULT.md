# KARMA REBIRTH — Wave20 Report (2026-10-11)

## Scope and invariants
Continued existing c2 project `test-fps-1` / `test_fps_1` only; Wave19 and earlier releases unchanged. Within one ≤20min Wave20. The actual original German soldier is still the **creator-authorized Britdawgmasterfunk 64-joint Mixamo skinned CC0 Panzergrenadier**, using Quaternius UAL1 52 mapped source bones, its original PBR materials and Wave18 optimized LOD in default fast mode. There is **no real author-supplied German rifle yet**: the MP40 magazine remains independently procedural.

## REAL WebGL2 Chrome MP4 and actual end-effector measurements

Recorded each 3P Factory source clip through fresh standalone Chrome DevTools sessions running genuine WebGL2 SwiftShader + `Page.captureScreenshot`, 16 screenshot frames per clip at ~5 fps, encoded with actual ffmpeg H.264 MP4 3.2sec. NOT static stills being called video. Reproducible in `scripts/wave20-record-motion.mjs`. Source frames `docs/research/wave20/{before,after}/{walk,shoot,reload}/*.png`; 6 full-frame videos `Chrome-{before,after}-{walk,shoot,reload}.mp4`; 3 cropped side-by-side actual video comparisons `Chrome-compare-{walk,shoot,reload}.mp4`. All 3 comparisons are **left BEFORE, right AFTER**, equal camera/game parameters. They are included under `three-d/motion/` in portable ZIP and website.

**Only samples after the real 64-bone model loaded are in numeric average** (15-16 samples/clip; excludes one startup low-poly fallback). The true 3D left-hand joint from skinned glTF is compared to the actual weapon virtual foregrip target, not measured by visual pixel segmentation.

| Clip | Before average hand error | After average | Improvement | After maximum loaded |
| --- | ---: | ---: | ---: | ---: |
| walk | 1.489cm | **0.357cm** | 76.0% | 0.471cm |
| shoot | 1.356cm | **0.449cm** | 66.9% | 0.492cm |
| reload clip (no actual moving magazine) | 1.033cm | **0.228cm** | 77.9% | 0.498cm |

### Why actual magazine swap was far worse, and actual fix

A separate real gameplay test explicitly initiated the existing `shoot()` event then normal `doReload()` key event, confirmed magazine ammo **31→32** and detached `withdraw/swap/insert` progression. With the 27cm down/15cm outward original prototype magazine movement, at `swap` left-hand IK error **17.626cm** (unreachable body-to-hand support distance ~0.707m). `docs/research/wave20/reload-unreachable-before.json` keeps original actual live movement and `Chrome-reload-unreachable-before.mp4`.

Applied reachable **temporary procedural MP40 magazine path only for genuine German model + actual reload** (`drop` 0.27→0.08m max; `side` -0.15→-0.045m). Original mechanic stage timing unchanged, left IK uses the same visual trajectory as drawn magazine. Re-ran genuine game state: **actual reload max error 17.63cm→1.32cm**, mean **1.348cm→0.276cm** across 16 frames. Magazine genuine game reload shows `release→swap→insert→latched`. Final extra actual Chrome video `Chrome-after-live-reload.mp4`, and `docs/research/wave20/after-live-metrics.json`. This fix reduces hand separation but visibly reduces magazine removal travel; when actual licensed MP40 is integrated, retune the physical gun-magazine grip/arm IK, do not treat procedural magazine as a final real gun.

### IK/pacing and feet truth
- Changed real-artist-only 3-joint CCD IK convergence from **20mm** old threshold to **5mm** target, max 16 bounded iteration safety cap; average actual loaded 3–6 iterations, old Quaternius fallback threshold stays 20mm. The hand target is model-driven game coordinate, not a verified original gun handle.
- Foot vertical support correction **already present since Wave19**; baseline before `walk` average raw lower-sole height difference ~15.95mm vs idle, mathematical min-sole vertical residual 0 after per-frame translation. It stays 0 in both videos. **This Wave did NOT deliver new two-foot planted-ground constraint, root motion or eliminate forward/back foot skating. Do not claim feet were further physically improved.**
- Measured headless SwiftShader FPS (software renderer) baseline ~23.1 and new ~22.3–23.2 in three clips, a modest within-session variation (reload clip approx -4.6%); this does not establish 60FPS on user Windows hardware. Native browser screenshot and on-screen motion do not equate to GPU benchmarking on user's PC.
- No character identity or genuine historical original game assets inferred from video; all videos are independent WEBGL game capture.

## Genuine MP40, PPSh and Soviet soldier — SOURCE AUTH VERIFIED, BINARY BLOCKED

Opened **all three official artist pages** in user's c2 Mac Chrome successfully, without unauthorized URL/download bypass. Direct screenshot inspection of MP40 page showed **SIGN UP**, thus current browser is **not logged into Sketchfab**. Official creator pages and content:
1. [MP40 — Moony_State](https://sketchfab.com/3d-models/mp-40-ww2-submachine-gun-7ec7e1f9656e4319b8edae0d785699ad) official downloadable CC BY, 14.5K triangles, 4K textures. **No original ZIP/GLB downloaded.**
2. [PPSh-41 — Zillious](https://sketchfab.com/3d-models/ppsh-41-5c8a64490fa747389e9cfcaecc69c88a) official downloadable CC BY, 12.4K tris, 4K textures. **No original ZIP/GLB downloaded.**
3. [Ivan Soviet Soldier — SihaGames](https://sketchfab.com/3d-models/ivan-soviet-soldier-276a01e4b8484fcda02061e073662dc7) official downloadable CC BY, 7.4K tris, but artist admits original textures from textures.com; **independent third-party texture redistribution rights and actual rigging remain unverified**. Do not publicly repackage it as-is without legal audit. **No model downloaded.**

Official Sketchfab download requires logged-in Sketchfab account (normal OAuth, normal Download 3D Model button) and cannot be bypassed. Browser has the three pages open for the owner to log in and legitimately download. No password, access token or cookie extracted; no files newly appeared in Mac Downloads. All actual German original creator model retained from BlendSwap, not reauthored/faked. Realistic MP40/PPSh/Soviet meshes **not integrated** in Wave20 and not claimed.

Pending c2 external E2E screenshot approval from earlier `shq_d9671215-1e78-4d87-98d2-072c4a156c34` is a separate c2 browser operation; Mac native Chrome pages are already opened normally, but no signed-in status. Users should sign in/download legitimately and c2 can then process the actual binaries in the next Wave.

## Build and release (pending final verification during wave)

Changed `three-d/real-character.js` (5mm CCD), `three-d/engine.js` (temporary magazine reach fix), `three-d/index.html` (4 video links), `scripts/build.mjs` (4 video files), `tests/wave11.test.mjs` (new strict CCD assertion), `tests/wave15.test.mjs` (version tracking).
Added `scripts/wave20-record-motion.mjs`, `tests/wave20.test.mjs`, actual Chrome .mp4 files and raw per-frame JSON, side by side, `three-d/motion/*.mp4`, this report.
Previous old Wave19 Windows same-machine A/B runner `COMPARE_WINDOWS.bat` still in dist. Node test expected 99/99 (prior 95+4 Wave20), build source/security scan and Mac Chrome E2E must be verified. Win GPU actual hardware not accessed. Zero-account-data uploads.
CI public Pages & actual v0.20.0 tagged release should be reported only after GitHub workflow complete and ZIP integrity verified.

## Next Wave blockers

- Owner signs into the existing Sketchfab tabs in Mac Chrome and clicks the official downloads for MP40, PPSh. Confirm exact binary + true CC BY assets and embedded texture rights, optimize 4K PBR to <=1K/2K for performance, replace procedural 3D gun with real mesh, retune hands against authentic magazine and grip position (current compact animation is temporary).
- Find Soviet model with original self-owned redistributable materials and real compatible rig. Ivan currently has third-party textures.com provenance; do not just relabel its author CC BY as a valid license for textures from a separate copyright holder.
- True two-foot terrain alignment & planted-foot slip QA, video frame alignment and extended hardware performance Windows user A/B data from `COMPARE_WINDOWS.bat`.
