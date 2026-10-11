# KARMA REBIRTH — Wave19 | Windows GPU compare, CC0 soldier motion, legal asset audit

Date: 2026-10-11 KST. Project: **EXISTING c2 `test-fps-1`**. Previous Wave17/18 published releases preserved. One bounded work segment, stop before Wave20.

## Q1 — User's own Windows PC FPS vs Wave17: NOT measured yet

- The connected c2 host is **jhyeui-MacStudio.local (macOS Darwin arm64)**. No `pwsh`, Wine, direct Windows desktop session, or user's GPU device control is connected. Prior GitHub `windows-latest` action jobs prove Windows PowerShell server functionality but **do not run on the user's actual PC**, nor demonstrate Windows accelerated Chrome/WebGL2 gameplay. Therefore no truthful device-specific FPS, VRAM or GPU root-cause conclusion is possible until the user runs the benchmark locally.
- Created **`COMPARE_WINDOWS.bat`, `windows_compare.ps1`, `COMPARE_WINDOWS.html`**. These are now included in the portable Windows ZIP. The runner fetches and verifies exact **48,460,996-byte v0.17.0 official ZIP** from the user's existing GitHub Release (one-time network), extracts *only* to a local `benchmarks/wave17` directory, launches the pre-existing loopback-only PowerShell server and a visible Chrome/Edge same-origin benchmark webpage. No remote control or hidden telemetry.
- Browser page loads Wave17 vs latest WebGL2 from the SAME Windows machine under equal map/team/view/window in a visible sequential iframe (7s warmup + 18s collection for each). It samples the actual in-game benchmark DOM FPS, 1% low, P95 frames, CPU scene and AI time, retrieves `WEBGL_debug_renderer_info` when the browser exposes it, captures canvas resolution/DPR, reports FPS delta and saves **local downloadable JSON** only after user click. This is a repeatable **measurement harness**, NOT a measurement already executed on user PC.
- Run the official downloaded ZIP after extraction on Windows: double click **`COMPARE_WINDOWS.bat`**, run both Factory and Castle / 3P and 1P as desired, click "JSON 결과 다운로드" and attach those JSONs here. The result will distinguish ANGLE/D3D hardware vs SwiftShader CPU fallback and GPU/render vs AI CPU bottlenecks. No universal 60FPS claim.
- Code `three-d/wave18-diagnostics.js` now additionally shows actual browser renderer and authentic soldier foot IK contact correction; opt-in controls and telemetry ownership unchanged.

## Q2 — German CC0 soldier authentic 64-joint rig and weapon/feet pose improvements

- `three-d/real-character.js` continues rendering actual licensed Britdawgmasterfunk WW2 Panzergrenadier 64-bone PBR GLB and calculated 52 UAL bone bind alignments. No placeholder soldier marketed as new.
- Added bounded **upper-arm / forearm / hand quaternion blending** between actual UAL1 shooting/reloading clips and the supported weapon aim pose (shoot 40%, reload 62% of original clip). Player's weapon still anchored to the right hand joint and independent 3-joint CCD solves actual left hand to weapon grip.
- Added modest **foot/sole reference vertical stabilization** to animated original glTF skinned model using real artist foot bone transforms relative to idle ankle height; bounded to ±7.5cm, with consistent GPU vertex uniform world displacement, weapon-hand `jointPoint` and left-hand IK goal correction. Cached foot correction for repeated same-phase calls; bots use legacy simple path to avoid heavy per-bot foot stabilization. This is **skeleton-relative contact height** and NOT full two-foot physics root-motion/terrain foot locking.
- `window.KarmaWave19Pose` exposes actual clip, `getFootContact()` and IK measured residual (model source). Independent Mac headless Chrome **SwiftShader** runtime `docs/research/wave19/chrome-motion-qa.json`: Factory/third-person `?pose=walk` and `?pose=shoot` both 11/11 live 4v4 QA, model loaded 64 bones with 5 PBR; virtual left-hand grip position residual **~0.01158m walk** and **~0.01425m shoot**; foot-adjusted after residual **0m at inspected sample frames**, with tiny offsets `-0.000697m` / `-0.0000014m`. SwiftShader ~25FPS in those runs; does NOT prove 60FPS on user GPU or flawless walking foot contact.
- Short foreground Mac Chrome screenshot in c2 E2E `wave19-foot-animation-regression-factory.png` shows Panzergrenadier rendering during combat, full FPS HUD ~59.98 GUI. Short capture is not extended Windows gameplay.
- Additional hardware/long-running and action quality inspection including precise feet lock over consecutive strides, multiplayer weapon author model, true projectile decals **remains incomplete**. Do not call these animations motion-captured military animations; actual clip source remains CC0 UAL1.
  
## Q3 — MP40, PPSh, Soviet original model binaries STILL MISSING; source-rights blockers verified

- Local search of project models + user Mac Downloads found **only previously downloaded `WW2 Panzergrenadier.blend`** as original historical model. No new MP40, PPSh, or Soviet historical `.glb/.blend/.fbx` downloaded/converted/retargeted this wave. No unlicensed models falsely published.
- Candidate official high-quality licensed asset register: `docs/research/wave19/official-asset-rights-audit.json`:
  - MP40 by Moony_State, Sketchfab CC BY, 14.5K triangles, 4K PBR, source `https://sketchfab.com/3d-models/mp-40-ww2-submachine-gun-7ec7e1f9656e4319b8edae0d785699ad`
  - PPSh-41 by Zillious, Sketchfab CC BY, 12.4K triangles, 4K PBR, source `https://sketchfab.com/3d-models/ppsh-41-5c8a64490fa747389e9cfcaecc69c88a`
  - Soviet soldier Ivan by SihaGames, Sketchfab CC BY, 7.4K triangles but **textures.com third-party texture origin** means derivative re-distribution rights still uncertain and rig is not independently verified. Do not integrate without permissions.
- Sketchfab's **official** Download API requires user OAuth authorization. No account cookies/passwords were read. C2 Mac opening official MP40 page raised external-browser owner approval **`shq_d9671215-1e78-4d87-98d2-072c4a156c34`**. This request, and normal Sketchfab login/download, are required before binary intake; nothing was automatically bypassed. Owner can click/download the two creators' **official** assets to Mac `~/Downloads` and present verified licenses. Rights of original models and original embedded materials must be recorded; source CC BY attribution must appear in packaged licenses and the game's credits when imported.
- Ripped Call of Duty USSR models from third-party listings explicitly excluded regardless of misleading CC label. CC BY-NC MP40 explicitly excluded for possible commercial distribution.

## Code, tests and distribution

Changed in SAME c2 source: `three-d/real-character.js` (actual foot and weapon-arm blending), `three-d/engine.js` (pose debug only), `three-d/wave18-diagnostics.js` (renderer+foot diagnostics), `three-d/index.html` (version), `scripts/build.mjs` (Windows scripts), `tests/wave15.test.mjs`, `README.md`, `WINDOWS_README_KO.txt`; plus source/render CI in existing `.wave17-publish/.github/workflows/publish.yml`.

New: `COMPARE_WINDOWS.bat`, `windows_compare.ps1`, `COMPARE_WINDOWS.html`, `tests/wave19.test.mjs`, `scripts/wave19-chrome-motion-qa.mjs`, test screenshots and JSON, new licence-audit file, this report. No new c2 project. Previous source assets and v0.17/18 releases retained.
- Node tests **95/95 PASS** after Wave19 code changes (re-run final full check before posting).
- JS syntax/check/build and secret-scan to be reverified. Secret scan reporting `0 Git-dirty` does not certify all source files or downloaded assets because c2 project isn't a Git repository.
- Existing public live game URL `https://jhye-aivis.github.io/karma-rebirth-offline-builds/three-d/index.html`.
- Tagged v0.19.0 Windows portable official release and Windows runner checks should be marked DONE only after actual GitHub workflows green, nondraft published ZIP and Pages completed.

## Next prerequisites / acceptance

1. Run `COMPARE_WINDOWS.bat` **ON USER'S WINDOWS PC** and send the generated JSON (Factory + Castle, 1P/3P) to identify actual GPU and frame bottleneck; Mac and GitHub runner cannot substitute.
2. On licensed creator web sites, officially download actual MP40, PPSh and Soviet soldier files in connected c2 Mac. Until all bytes + license are inspected, do NOT claim integrated.
3. Only when above completed: Blender certified GLB import, separate material budgets, weapon skeleton/hand grip and Soviet bone retarget, heavy/medium/light 3D models and 30min Windows GPU QA with 60FPS goal subject to measured hardware.
