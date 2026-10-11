# KARMA REBIRTH Wave18 — Performance recovery report (2026-10-11 KST)

## Decision and facts

**Wave18 is a prioritised performance recovery of the existing c2 `test-fps-1`, NOT a new project.** Wave17 remains published and intact. The prior Wave17 performance assurance from a short Mac Chrome session was insufficient: low-power browsers experience major performance degradation under source PBR + 64-bone skinning + 43.58MB original GLB and multiple German bots. Do NOT claim universal 60FPS after this repair.

## Genuine German soldier optimized without faking assets

- The original creator's legitimate CC0 WW2 Panzergrenadier mesh is retained intact: `three-d/assets/characters/panzergrenadier_cc0.glb` 43,578,032 bytes, 27,005 triangles, 64 Mixamo joints, 5 PBR materials / 15 exported images.
- New **genuine derivative**, `three-d/assets/characters/panzergrenadier_cc0_optimized.glb`: **11,607,272 bytes**, **16,092 triangles**, **64 genuine original Mixamo joints**, 5 original-material mappings, 19 embedded textures resized to max 768px at Blender export time. 2K artist original and 52/52 UAL1 retarget basis still available; never relabelled a Quaternius lowpoly placeholder as original historical model.
- `scripts/wave18-cc0-lod.py` reproducibly exports from signed-in owner's original `~/Downloads/WW2 Panzergrenadier.blend`. Source LOD audit `docs/research/wave18/lod-build.json` saved.
- New default `?quality=fast`: optimized **genuine German player** while German AI uses inexpensive GPU-skinned fallback. `?quality=balanced`: near, camera-visible AI use genuine 16k-triangle mesh, far/off-camera AI lowpoly; `?quality=original`: original 43.58MB 27k + German AI; `?quality=legacy`: lowpoly fallback. Users can choose modes in game diagnostics; the fallback is visible and never described as a real model.
- World static building/rails triangles are cached by map rather than rebuilt every RAF; sun shadow pass throttles to every third frame in fast/auto fallback; render scale fast .65 / balanced .8 / original 1; UAL pose cache quantized to authentic 24Hz for AI only. German AI no longer incorrectly receives the player's left-hand gun-grip IK pose; the player retains existing 3-joint CCD IK. Source motion correction and natural foot planting are **not fully completed**, especially shot/reload gun contact.

## Quantitative Chrome A/B profile — REAL, but software headless only

Under matched Chrome Headless SwiftShader software WebGL2 (Factory, 3P, 4v4, around 9.5sec measured), with actual per-version `quality` query and WebGL2 initialization verified:

| Mode | Mean FPS | Meaning |
|---|---:|---|
| Wave18 original / Wave17-style full | 16.0 | Heavy 43MB / 3 high-res German AI baseline |
| Wave18 balanced, before final static map optimization | 19.8 | real 16k/768px CC0 LOD, nearby actor culling |
| Wave18 fast, before final static cache | 29.1 | real 16k CC0 player, lightweight German AI, lower pixel rendering |
| Wave18 original with static-map cache | 16.2 | heavy source, still GPU heavy |
| Wave18 balanced with static-map cache | 24.7 | cached static geometry |
| Wave18 fast with static-map cache | 28.2 | current default, software renderer |

The last row ~74% faster than heavy original (28.2 vs 16.2) **only within controlled SwiftShader**, not measured on end-user Windows hardware. Check primary evidence `docs/research/wave18/performance-ab-true.json`, `docs/research/wave18/performance-cached.json`, scripts `scripts/wave18-performance-after.mjs` and `scripts/wave18-performance-final.mjs`. The initial file `performance-ab-before-after.json` mistakenly did not append quality URL and should **not** be interpreted as valid A/B.

Longer/stronger test needed on actual end-user Windows hardware, especially startup download and GPU-driver limitations. A software WebGL renderer can remain below 30FPS even after optimizations, whereas GPU Chrome baseline from prior Waves was ~59-60 on Mac. GPU presence and WebGL2 browser acceleration are a separate factor; cannot infer from these tests.

## Live FPS, aim, AI diagnosis and opt-in feedback UI

- `three-d/wave18-diagnostics.js` adds an in-game clickable **성능 · FPS · 피드백** toggle, optional visible at `?diagnostics=1`. Displays actual RAF FPS, frame P95, CPU render & AI time, selected quality/scale/LOD, real model state / genuine AI count, shots, hits, calculated accuracy, damage, cover block count, last world XYZ impact.
- Graphics quality dropdown changes URL only on explicit selection. Never sends metrics automatically. No cookies / analytics / localStorage / server collector added.
- Feedback textarea + manual Copy diagnostics; `GitHub 의견 작성` user click opens a **pre-filled, user-reviewable GitHub issue composer**. Posting may require GitHub sign-in and user's own confirmation. Repository issues are enabled; this is an intentional low-backend consent-oriented feedback workflow, not direct anonymous server feedback.
- The actual Chrome CDP run `scripts/wave18-chrome-diagnostics.mjs` with `?quality=fast&wave17Selftest=1&diagnostics=1` passed **11/11 genuine live AI combat QA**: real moving bot 0.132m, real 3P shot HP 100→68, real model 64 joints, PBR 5/5 after async load, panel visible; result `docs/research/wave18/qa-live-diagnostics.json`. Screenshot `docs/screenshots/wave18-factory-cdp.png`. This is an instrumented test, not a 30-minute manual gamer playthrough nor pixel-extracted decal accuracy.

## Q1 animation / Q2 historically accurate additional assets

- German UAL1 interpolation and IK optimization has been limited to AI 24fps pose cache and no sharing of player's IK corrections across different soldier actors. Cinematic arm/hand/foot grounding quality is **unfinished**. No false assertion of complete natural motion.
- MP40 Fab `https://www.fab.com/listings/38cb364f-c066-4aa3-8715-c6c427d1f782` is a free-looking actual high-quality candidate, but auth/license + actual binary acquisition not completed.
- PPSh-41 Sketchfab `https://sketchfab.com/3d-models/ppsh-41-5c8a64490fa747389e9cfcaecc69c88a` creator marks CC BY 4K; requires official download/attribution and binary validation, not acquired this wave.
- BlenderBlendSwap CC0 `https://blendswap.com/blend/8207` MP40 artist comments mention Photoshop/provenance licensing doubt; **not imported** and legal rights need clarification.
- Soviet soldier: `https://www.cgtrader.com/free-3d-models/military/military-character/soviet-soldier-6b972d63-fc85-43b3-9717-23256c5c79f4` listed as free with Blender/FBX formats, but full redistributable rights, verified rig binary and textures not acquired, thus **NOT integrated**.
- **No new authentic MP40/PPSh or Soviet soldier binary** imported. Preserved all existing gameplay functionality. Do not portray regular procedural guns or generic Soviet actor as new licensed photoreal assets.

## Code and delivery

- Changed: `three-d/engine.js`, `three-d/real-character.js`, `three-d/index.html`, `scripts/build.mjs`, compatibility tests.
- Added: `scripts/wave18-cc0-lod.py`, `three-d/assets/characters/panzergrenadier_cc0_optimized.glb`, `three-d/wave18-diagnostics.js`, `tests/wave18.test.mjs`, wave18 Chrome CDP A/B and QA scripts, original/optimized evidence.
- Most recent Node automated checks **92/92 PASS** before final end-of-wave verification, then actual Chrome QA 11/11, full build/secret scan to be reconfirmed. Security scan of 0 Git-dirty files should not be confused with a complete repository history audit.
- Wave18 public deployment: existing GitHub `jhye-aivis/karma-rebirth-offline-builds`, URL `https://jhye-aivis.github.io/karma-rebirth-offline-builds/three-d/index.html` and release v0.18.0 only count SUCCESS after CI public Pages deploy / ZIP / Windows HTTP smoke status verified. Windows GPU user play remains unverified.

## Next Wave
Continue only after user approval. Profile actual Windows Chrome renderer type, FPS at Factory and Castle at 1P/3P at 3,5,15,30m, long-term thermal throttling, PBR model/weapon quality. Obtain and verify new historical CC BY/CC0 gun & Soviet model binaries before replacing art. Improve foot locking and UAL arm support IK without sacrificing frame-time budget.
