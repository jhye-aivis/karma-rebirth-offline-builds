# KARMA REBIRTH — Wave 21: Space Jump, Weapon-Class VFX, AI & Factory Surface Upgrade

**Date:** 2026-10-12 KST  
**Existing project:** c2 `test-fps-1` / `test_fps_1`, preserving Wave17–20 tags and offline source.  
**Scope:** One bounded user-approved visual/gameplay Wave. No Unity migration or Sketchfab.

## 1. Space Jump implemented, not a visual-only bounce

- `three-d/jump.js`: grounded-only `Space` handling, vertical initial velocity **5.4m/s**, gravity **14.4m/s²**, bounded max displacement of 1.2m, normalized frame time, landing and jump counters.
- Existing XZ `KarmaMaps3D.walk` collision still active; moving through a wall while airborne remains blocked. Multiple airborne presses do NOT trigger a double jump; jump is blocked when dead.
- The **actual CC0 64-bone Panzergrenadier player GPU-skinned mesh**, right-hand weapon joint, 3-joint left-hand CCD foregrip, equipment weapon model and **both camera perspectives** share the same real `player.jumpY` translation. Player camera, shot origin, visual effects and view direction are consistent. Foot lock suppressed midair.
- HUD/help shows `Space 점프`. Local diagnostics panel reports height, grounded state and jump counters. While paused, Space cannot trigger jump.
- Real Mac Chrome WebGL2 1P **and** 3P `Input.dispatchKeyEvent Space` test: airborne peak heights ~0.99–1.02m, landings=1, grounded=true after descent and normal weapon firing still works.

**Limitations:** Current authored maps have only flat ground at y=0 and non-traversable vertical wall footprints. No multi-story rooftop jumping, mantling, falling off platforms, vaults or network synchronized jumps. 60FPS is a hardware-dependent target, not achieved/proven on the user's actual Windows GPU.

## 2. Distinct actual weapon-specific offline VFX & audio

- New `three-d/weapon-vfx.js` profiles for **8 kinds**: smg, rifle, sniper, lmg, pistol, launcher, grenade, melee. Fire spawns muzzle flare (class radius/length), transient tracer, simulated brass ejection, contact sparks, smoke and dust, different for launchers vs pistols. Impact particles only appear when the actual world trace identifies actor/cover or an explosive detonation, not arbitrary midair tracer endpoint. These effects NEVER determine hit registration/damage.
- GPU-friendly lifetime caps: **max 72 live particles + 5 transient flashes**, automatic expiry, no persistent particle leaks. Shells/tracers still authored world geometry; smoke, dust, sparks rendered through ONE transparent depth-tested **WebGL2 soft-particle point sprite draw call**, not Minecraft-like opaque smoke boxes.
- Existing `three-d/audio.js` synthesizer now chooses envelope, noise cutoff, bass and fire tail for each gun class. No sampled unlicensed weapons or network/CDN dependencies.
- Real Mac Chrome WebGL2 script `scripts/wave21-chrome-jump-vfx.mjs` actually changes gun selection and fires 5 kinds in both 1P/3P. Recorded fired profiles **smg=2, rifle=1, lmg=1, pistol=1, launcher=1** per camera. Loaded on GPU, effects peak ~45–52 transient particles and GPU soft particles counted in RAF.
- Screenshots: `docs/screenshots/wave21-third-space-mp40.png`, `wave21-first-space-mp40.png`, `wave21-third-launcher.png`, `wave21-first-launcher.png`.

**Limitations:** Models/1P gun still interim Blender-authored shapes, **not actual photographic/period-perfect MP40, PPSh, Kar98k etc.** VFX are software-generated particles, not scanned/cinematic volumetric effects. Distinct VFX does not imply photoreal weapons.

## 3. Visual upgrade that doesn't falsely claim Unity/Tripo or original map assets

- Retains Wave20.2 **source CC0 creator Panzergrenadier 64-joint GPU skinned 3D**, with distinct German AI LOD and CC0 German-derived Soviet faction stand-in. In the real 4v4 Chrome staged Factory screenshot, **6 visible real GPU-skinned AI / 0 generic lowpoly fallbacks**, both factions. Source `three-d/assets/characters/*npc*.glb` derivative Blender geometry exists and actual glTF binary load succeeds.
- `scripts/wave21-materials.py` generates **self-authored tileable** 1536×1024 environment color atlas (6 tile categories: brick/concrete/oxidized steel/wood/gravel/limestone); `three-d/assets/environment/wave21_surface_atlas.png` ~2.3MB, locally generated with NumPy and stdlib PNG writer. Pixel source is synthetic/self-authored; NOT photographic materials or external CC0 media.
- WebGL2 static mesh shader uses map-authored material IDs packed in existing 11-float vertex attributes so the source box/rounded cylinder geometry samples appropriate albedo and original metal/roughness without new vertex fields, with sun shadows and fog. Runtime supports atlas load fallback (no CDN).
- Factory now includes six rounded rust steel drums with multiple rim bands. These use 18-segment real curved cylinder geometry instead of colored cube faces; are non-colliding decorative props near existing cover and do not modify authored 4v4 collision lanes.
- Updated browser UI progress label and real user diagnostics `root.KarmaWave21Environment`, `root.KarmaWave21Jump`, `root.KarmaWave21VFX`, `root.KarmaWave20NPC`. Screenshot `docs/screenshots/wave21-factory-authored-npc.png`.
- **NOT true photoreal**: Factory and Castle are still blockout-level geometry rather than realistic buildings. Proper world-scale scanned textures, historical Soviet artist model, authentic weapons, terrain, Unity URP environment/lighting would require larger asset development and a separate Unity/C# port. No Sketchfab attempted, per explicit user refusal.

## 4. Evidence and tests

- Full `npm run check`, `npm test`, `npm run build` and c2 secret scan to be reverified at release time. Prior main test checkpoint: **114 Node tests PASS** after new gameplay/material modules.
- Real Chrome script `scripts/wave21-chrome-jump-vfx.mjs`: actual `Space` input, jump/landing in both cameras, real GPU sprites, gun category shots, real 64-bone skinned AI and loaded texture atlas. Evidence `docs/research/wave21/chrome-jump-weapon-npc.json`.
- **Mac Chrome headless SwiftShader** software-renderer (~16.9–18.1 FPS in Factory when 6 real PBR NPCs visible, about 27–29 FPS 3P Training and 39–44 FPS 1P Training). Variation between runs is not a controlled Windows A/B. These are NOT user's actual Windows hardware GPU FPS or proof of 60FPS.
- C2 project source isn't its own Git workspace; a git-dirty-only scan finding zero modified tracked files is **not a comprehensive malware/asset rights audit**. Old releases preserved.
- Existing `COMPARE_WINDOWS.bat` Wave17 vs recent same-machine benchmark and `PLAY_WINDOWS.bat` launchers still included in source.

## 5. Distribution and verification

- Local expected portable archive: `releases/KARMA_REBIRTH_Wave21_Windows_Offline.zip`; include jump/vfx JS, environment atlas, AI German/CC0-derived Soviet GLB, video comparisons, Windows PowerShell server, original licensed media. Require local `unzip -t`.
- Public existing GitHub repository https://github.com/jhye-aivis/karma-rebirth-offline-builds and Pages https://jhye-aivis.github.io/karma-rebirth-offline-builds/three-d/index.html.
- Official release should be https://github.com/jhye-aivis/karma-rebirth-offline-builds/releases/tag/v0.21.0, ONLY after Windows runner CI success, Pages success, published tag/release ZIP verified. Windows CI smoke checks HTML/JS/GLB serving and PowerShell syntax, NOT user Windows GPU gameplay.

## Next wave priorities

1. Acquire **no-login legally licensed** authentic MP40/PPSh/Soviet model bytes from creator sources; audit real originals, texture grants, rig skeleton and distribution before game inclusion. Avoid Sketchfab entirely.
2. Build photo-scanned environmental material atlas + actual 3D broken walls/occlusion and foliage/wreckage, rather than synthetic tiles. A prototype Unity URP vertical slice is a separate substantial C# engine port (NOT done this wave).
3. User actual Windows hardware real benchmark JSON for 60FPS/LOD budget, GPU renderer and scene shadow hotspot; report profile first and avoid universal claims.

## Final source and Chrome verification (2026-10-12 KST)

- npm check PASS (including new jump.js and weapon-vfx.js syntax); Node **117/117 PASS**, npm build PASS, existing c2 secret-scan PASS with noted git-scope limitation.
- Fresh Chrome 1P and 3P actual Space input, six weapon shots/class variation, six historical-source-derived 64-bone skinned NPC staged, CC0 PBR, 6-category real texture atlas and GPU soft billboard sprites verified; evidence `docs/research/wave21/chrome-jump-weapon-npc.json`.
- Local Windows ZIP integrity `unzip -t` PASS, contains all new scripts, atlas PNG and German+interim Soviet 64-bone GLBs plus offline Windows comparator. Windows GPU personal FPS remains unmeasured.
- Public Pages and tagged release status must be checked independently after push, not inferred from local ZIP tests.
