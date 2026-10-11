# KARMA REBIRTH — Wave20 Report (2026-10-11)

## Scope and invariants
Continued existing c2 project `test-fps-1` / `test_fps_1` only; Wave19 and earlier releases unchanged. Initial Wave20 stage was ≤20min; subsequent Wave20.2 enhancement has user's explicit up-to-1-hour approval. The actual original German soldier is still the **creator-authorized Britdawgmasterfunk 64-joint Mixamo skinned CC0 Panzergrenadier**, using Quaternius UAL1 52 mapped source bones, its original PBR materials and Wave18 optimized LOD in default fast mode. There is **no author-supplied original historic German firearm yet**; Wave20.2 adds Blender-authored interim gun geometry.

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

- **Sketchfab abandoned at user's explicit direction** due repeated Epic-account signup authorization loop. DO NOT request another Sketchfab login. Official no-account BlendSwap/OpenGameArt artist assets should be used only after actual binary, author license and texture rights validation. The authored Wave20.2 MP40- and PPSh-shaped interim meshes are not period-exact original-source assets.
- Find Soviet model with original self-owned redistributable materials and real compatible rig. Ivan currently has third-party textures.com provenance; do not just relabel its author CC BY as a valid license for textures from a separate copyright holder.
- True two-foot terrain alignment & planted-foot slip QA, video frame alignment and extended hardware performance Windows user A/B data from `COMPARE_WINDOWS.bat`.

## FINAL VERIFIED STATUS — 2026-10-11 17:10 KST
- Forced clean `check` PASS, Node **99/99 PASS**, build PASS, existing c2 secret scan PASS (its 0 Git-dirty count is not comprehensive security certification).
- Chrome software WebGL2 Factory 3P walk & shoot 4v4 **11/11 PASS** each after final rig amendment, ~25.2/25.7 FPS in separate quick samples; this is NOT user Windows GPU.
- 6 creator-model Chrome MP4 before/after + 3 cropped left-before/right-after comparisons + 1 actual live-reload MP4 all generated and ffmpeg encoded; 16 video frames each for ~3.2sec and machine-readable 3D joint error measurements in `docs/research/wave20`.
- Local Wave20 ZIP integrity PASS, contains four motion MP4s and prior Windows comparator, original licensed skinned 64-joint Panzergrenadier; no new unlicensed external firearms/Soviet models.
- Public GitHub `v0.20.0` main Windows GitHub Actions smoke + Pages deploy **SUCCESS**; tag Windows smoke + automatic release **SUCCESS**. Actual release asset `KARMA_REBIRTH_v0.20.0_Windows_Offline.zip` **59,952,211 bytes**, nondraft. Windows automated HTTP/source loading passes; personal Windows GPU playing not evaluated. Release: https://github.com/jhye-aivis/karma-rebirth-offline-builds/releases/tag/v0.20.0 .
- Official Sketchfab Mac Chrome pages all opened but current account screen displayed SIGN UP: logged-out, real binaries not acquired, rights unchanged.

## WAVE20.2 NPC art upgrade — 2026-10-11 late evening (user-authorized ≤1 hour)

**Problem proven in source:** Wave18 fast mode condition `wave18Quality!=="fast"` prevented source-author skinned German AI in ALL frames; Soviet AI always used generic Quaternius fallback. Therefore player could wear a creator PBR model but all visible computer opponents were Minecraft-like low-poly boxes.

**Real creator-original CC0 source-backed model, not a fake claim:**

| Actor side | New actual GPU-skinned GLB | Actual indexed triangles | Original rig | Materials |
| --- | --- | ---: | --- | --- |
| German NPC | `three-d/assets/characters/panzergrenadier_cc0_npc_lod.glb` | 7,569 | Britdawgmasterfunk CC0 64-bone Mixamo | Source PBR textures downsampled to 384px |
| Opposing Soviet faction **interim** | `three-d/assets/characters/soviet_side_derived_cc0_interim.glb` | 5,585 | **Same German CC0 source** 64-bone Mixamo reworked, **NOT** authentic period Soviet model | Derived olive cloth, cap, source-authored cloth texture |

- Actual Blender 5.2.2 opens original signed-in author's `~/Downloads/WW2 Panzergrenadier.blend` (52,897,426 bytes) and decimates to NPC LOD, packs real original material textures. Derivative does NOT modify source Blender file. Script `scripts/wave20-cc0-npc-lods.py`; audit `docs/research/wave20/npc-lods.json`, standalone creator license `three-d/assets/characters/LICENSE_WAVE20_NPC_CC0.txt`.
- For **Soviet-side stand-in only**, Blender removes source German M42 combat helmet and German ammo pouches, re-tints source cloth, makes a small olive field cap attached to artist HEAD bone; it is intentionally provisional because legitimate independent original USSR model hasn't been downloaded. Users must not interpret costume as confirmed 1944 USSR historical uniform.
- Built new **independently modeled** modest polygon MP40-inspired stick-mag folding-stock and PPSh-inspired wood-stock drum-mag 3D silhouette *within project Blender*, weighted to source Mixamo RightHand (not downloaded 4K real firearms). It has true 3D receiver/barrel/sights/stock/magazine, source-local shader material; right wrist orientation corrected with world axes measured from **actual Chrome loaded source bone skin** (idle/walk/shoot). This resolves the initial vertical rifle problem in preview but is NOT scanned or third-party licensed original historic weapons. No Sketchfab account or content used.
- Renderer: `three-d/engine.js` now loads BOTH real GLBs by author source; draws each visible 4v4 NPC in German/Soviet skin rig, high detail only near player; frustum and solid wall occlusion culling, artist LOD per team, fallback explicitly available `?npc=legacy`. The actual AI battle movement/shots remains CPU-side and unchanged. 3P player switches to correct live faction rig once GLBs load. Removes duplicate block-shaped procedural fake helmet/backpack when original artist mesh already contains its own outfit, preserving gun and 5mm wrist / foot IK.
- Fast quality starts at internal scale 0.68; raises resolution gradually up to 0.93 on sustained 58.2+fps hardware vs prior permanently pixellated 0.65. Weak/software GPUs remain on cheap scale. This is dynamic resolution, not promise of 60fps on user Windows.
- `three-d/real-character.js` GLSL supports true textured PBR clothing and GLTF solid author colors for two handmade cap parts and true artist source 64-joint weighted simulated right-hand firearms. NPC player left-hand IK and foot IK are isolated between actors so player pose cannot contaminate NPCs.

**Real Chrome evidence (not third-party catalog imagery):**

- Mac GUI Chrome Factory German normal first-person/3P screenshot labels actual CC0 soldier NPCs, near-showcase screenshot `docs/screenshots/wave20-ai-artist-public.png` is **explicitly staged AI visual QA only**, not an ordinary gameplay spawn; native short Chrome FPS ~60 average (~55fps 1% low), ~3ms CPU render. Mac Castle Soviet visual screenshot remains available for comparing factioned art.
- Software-rendering **headless Chrome SwiftShader** run `scripts/wave20-npc-chrome-ab.mjs` serially checks Factory and Castle; `docs/research/wave20/npc-chrome-ab.json`. Example factory scene German side 2 and Soviet side 2 source-derived meshes simultaneously rendered in actual WebGL2 and complete PBR, no runtime errors. Older simple Quaternius fallback ~21.2fps vs new detailed 4-bot scene ~18.4fps in that *software* environment: about 13% slower. This is a real GPU cost in CPU software mode; **not** the user's actual Windows hardware. Rendering on native Mac GPU ~60 short sample, no long gameplay or Windows claim. Automated battle `scripts/wave20-npc-combat-cdp.mjs` ran actual 4v4 moving AI hit HP reduction **11/11 PASS**, software Chrome FPS ~22.4.
- Source/rights/bin/performance checks in `tests/wave20-npc.test.mjs`: validates both real GLBs true 64-bone skin, true indexed triangles, actual source materials, authored gun GLTF skinned node, at least one simultaneous German & Soviet actor in real Chrome screenshots, explicit not-authentic Soviet origin. Existing hand grip below 5mm (on 15-16 loaded samples per walk/shoot/reload), live magazine swap, and planted-foot contact regression tests maintained.

**Unfinished external model work:** neither legally redistributable independent WWII Soviet original rig nor genuine artist-source MP40/PPSh 3D original binaries yet. Avoid Sketchfab per user decision. Existing game has genuine CC0 author-origin German meshes and **original-project gun approximations**; do not claim historical visual reproduction of game publisher assets. Remaining architecture, crates and lighting still low-poly/period-inspired so the entire game does NOT yet resemble a modern AAA production.

**Publishing:** Wave20.2 stage must run full Node/check/build/secret scan, Windows CI+Pages, verified nondraft GitHub new tag and ZIP; prior v0.20.0 release remains untouched.
