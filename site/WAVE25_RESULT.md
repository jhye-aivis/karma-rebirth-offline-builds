# KARMA REBIRTH — Wave 25 actual 3D architecture & 8 AI benchmark

**2026-10-12 KST | Existing test_fps_1 | One Wave, maximum 40 minutes.**

## Facts and scope

This is a continuation of the actual KARMA REBIRTH WebGL2 game, NOT a new demo. Previous Wave24 six authored WW2 3D weapons, textured 64-bone CC0 German-derived German/Soviet field rigs, 4v4 AI, Factory/Castle, jumping/shooting/HUD remain available.

### 1. Buildings and maps

- `three-d/maps.js` adds factory warehouse sloping roof (2 pitched roof meshes), polygonal chimney and six round masonry/industrial columns. Castle adds four twelve-sided stone towers with raised battlements, a sloping roof, four polygonal arched facades/gates and six tapered stone buttresses.
- `three-d/engine.js` constructs actual normals, GPU vertex buffers and original material-atlas sampling for these triangulated meshes. This is author-created procedural 3D **geometry**, not photos, concept art or independently licensed Blender building imports.
- Render-only meshes are non-solid; the existing physics obstacles retain *identical serialized collision definitions* to the current published Wave23 main SHA `9ef0e92fdd33775df81794094c49e0d222db01bb`: Factory **16/16**, Castle **17/17**. Player movement, line of sight and bot routes were not deliberately changed.
- Both factions now face the combat arena rather than leaving the Soviet TDM player looking into the far perimeter wall on spawn.
- Remaining blockout: most castle walls, map footprints and container stacks retain their rectangular old core geometry. **This is a substantive partial silhouette/mesh upgrade, NOT a claim that all blocky buildings have been removed or that exact 2003 KARMA geometry has been reconstructed.**

## 2. 8AI performance profiling and actual code optimization

Measured on the c2 Mac, Chrome headless ANGLE **SwiftShader software WebGL2**. Fixed map Factory, camera third person, renderScale .68, 8 NPCs, identical four-tap/512px shadows for isolated MSAA comparison. Results are short-run RAF times; Windows GPU performance remains unverified.

| 8 AI condition | MSAA on | MSAA off (Wave25 fast default) |
|---|---:|---:|
| 8 AI, no shooting (case C) | **11.78 FPS** | **22.83 FPS** |
| 8 AI, shots and feedback (case F) | **11.30 FPS** | **21.15 FPS** |

`?msaa=1` restores legacy multisampling; balanced/original quality retains it. Fast defaults to WebGL context `antialias:false`. The sacrifice is some jagged edges, especially around thin geometry/diagonals. On the measured software renderer, this has a far more significant effect than reducing the shadow PCF 9→4 samples and resolution 1024→512 alone, where one eight-AI run yielded 12.80 vs 12.77 FPS (noise; no attributable gain). The fast shadow change is therefore a secondary quality/performance option, not claimed as an isolated win.

Runtime measurements typically show CPU AI logic ~0.1–0.4 ms/frame, CPU scene submission ~1.8–2.5 ms, 20–55 GPU draw submissions depending on view/visibility; 8AI ~50–100+ ms frame before the fast MSAA change. The GPU **elapsed** timer remains unavailable/not recorded; do not present RAF-minus-CPU as GPU execution time. Significant work remains in GPU skin/material passes and character animation costs. The existing static building world remains batched into one GPU static VBO, not a draw call for each building.

## 3. Direct verification

- `npm run check`, `npm test`, `npm run build`: **150/150 Node tests green** at pre-release verification.
- `node scripts/wave24-chrome-art.mjs`: **6/6 real Chrome cases green** after the Wave25 changes, including both teams, one/third person, all six Blender-modeled weapons and texture atlas.
- `node scripts/wave24-chrome-combat.mjs`: Chrome 2 team showcases, one genuine hit, two received hit events, HUD/AI preserved, exit 0.
- `node scripts/wave25-architecture-chrome.mjs`: Factory/German **5460 static triangles**; Castle/German/Soviet **3184 static triangles** (three map/team scenes exit 0). Screenshots saved under `docs/screenshots/wave25-*-actual-chrome.png`. These are actual WebGL frames, not image-generation examples.
- Published baseline: GitHub API confirmed public branch main SHA `9ef0e92...` (Wave23). An isolated worktree pinned to this SHA was served over localhost and run in the *same Chrome software WebGL2 harness*, generating `docs/screenshots/wave25-public-*-actual-chrome.png`. The comparison HTML is at `docs/research/wave25/compare.html`. This validates **source-equivalent remote commit A/B**. It is not proof of opening the HTTPS Pages host itself; direct external browser visit was blocked by c2 local approval.

## 4. Release safeguards

Preserve old GitHub release tags and old ZIPs. The existing local `.wave17-publish` Git repo has unpublished Wave24 source commits; remote main was at Wave23 in the check above. New version should be **v0.25.0** with new offline package, and Pages updated to contain all Wave24 + Wave25 assets only after successfully verifying `dist`. Report exact commit and deployed URLs only after an authenticated GitHub push/release and remote check succeed. Windows real GPU FPS cannot be guaranteed.

## 5. Remaining priorities

1. Replace the remaining rectangular Castle interior facades and Factory shipping-container blockouts with fully bespoke Blender-modeled multi-material buildings (not just render-shell augmentations); add historically grounded weathering while maintaining collision.
2. Measure native GPU timestamps on a suitable non-SwiftShader browser and distinguish fragment/pixel cost, skinned vertex shader cost and actual AI update cost with longer samples.
3. Windows hardware A/B, side-by-side screenshots in user Chrome, collision/gameplay human playtesting.
