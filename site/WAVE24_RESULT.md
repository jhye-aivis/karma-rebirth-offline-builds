# KARMA REBIRTH — Wave 24: generated concept art -> 실제 플레이 가능한 게임 에셋 적용

**프로젝트:** 기존 `test_fps_1` / 게임 KARMA REBIRTH / 2026-10-12 KST  
**작업 한도:** 한 Wave 당 40분. **배포 목표:** `v0.24.0` (GitHub 실제 릴리스 확인 전까지 공개 완료 아님)

## 1. 적용한 것과 아직 적용되지 않은 것

이번 대화의 2D 이미지 4종(독일군 G01~03, 소련군 S01~03, MP40·PPSh·소총·기관총, Muzzle/Impact/Hit UI)을 **디자인 참고**로 사용했다. 2D 이미지는 뼈대가 있는 게임용 GLB로 자동 변환된 것이 아니다. **원본 컨셉 시트 픽셀을 게임에 그대로 포함하거나 이미지를 정밀 3D 스캔으로 변환했다고 주장하지 않는다.**

진짜 게임 자산은 같은 디자인 의도를 참고해 로컬에서 **Blender로 새 3D 장비·무기 메시**와 **자체 생성한 타일형 PNG 재질**이다. 이전 Wave23의 공개판보다 개선된 로컬 시각 회귀 수정(과대형 1P 무기, 한 점 UV, 네모난 군장)도 통합했다. 이들은 기존 4v4 실전 게임의 플레이어와 AI에 연결되어 있으며, 단순히 별도 포스터만 붙인 작업이 아니다.

### A. 독일군·소련군 G01~G03 / S01~S03

- **원본 스켈레톤:** 합법 출처가 기록된 Britdawgmasterfunk CC0 Panzergrenadier를 기반으로 한 기존 64관절 GLB를 유지. 소련군 스타일 장비는 독일 CC0 몸체에서 파생한 모델이며 별도 실제 역사 고증/현역 1944 Soviet 모델을 확보한 것이 아니다.
- 진영별 **1개의 스킨드 GLB / 1개의 고해상도 텍스처 아틀라스**를 모든 봇이 공유. 아틀라스는 이전 256×256 (실제 32픽셀 재질칸)에서 **1024×1024 (재질칸 128픽셀)**로 변경.
- 독일군 G01: MP40 군장과 가스마스크통의 실제 3D 돌기/고정끈. G02: 실제 둥근 야전 배낭/롤/버클·길이 조절끈, 소총 파우치와 수통. G03: 실물 형상의 쌍안경, 렌즈, 철모 위장 천 조각, 경장형 가방.
- 소련군 S01: PPSh 원형 드럼 파우치/큰 둥근 배낭/침낭. S02: 삽날 테두리, 수통의 실제 가죽끈, 소총 파우치. S03: 정찰병 쌍안경·렌즈·스카프 스타일 소품과 작은 천 가방.
- 텍스처는 자체 작성 `scripts/wave24-textures.py`가 새로 계산하는 직물의 직조, 오일/가죽 마모, 그을린 금속, 진흙/먼지 입자. 컨셉 원본에서 가져온 저작권 이미지 픽셀을 복사하지 않는다.

### B. 무기 6종

| 플레이어 무기 | 실제 GPU 모델 | 제작 |
|---|---:|---|
| MP40 | 4,820 삼각형 | 이전 Blender 메시 + 새로운 강철/베이클라이트 이미지 샘플 |
| PPSh-41 | 8,100 삼각형 | 이전 Blender 메시 + 새로운 청동/호두나무 이미지 샘플 |
| Kar98k | 2,411 삼각형 | **이번 Wave 신규 3D 제작** |
| Mosin-Nagant | 2,832 삼각형 | **이번 Wave 신규 3D 제작** |
| MG34 | 4,100 삼각형 | **이번 Wave 신규 3D 제작** |
| DP-28 | 2,464 삼각형 | **이번 Wave 신규 3D 제작** |

무기 표면 재질은 `three-d/assets/weapons/wave24_material_atlas.png` 1024×256의 4개 텍스처 타일(청색강/인산염강/베이클라이트/호두나무)과 `three-d/weapon-art.js` 원본 GPU 샘플링 셰이더로 연결. 3인칭·1인칭에서 실제 게임 무기 선택에 따라 다른 GPU 기하를 그리며 총알 궤적, 게임 내 피해량 판정은 기존 로직을 그대로 사용. 이미지 기반 PBR-inspired 스타일이며 사진측량 스캔/정밀 정상맵·ORM 완제품 수준은 아니다.

원본 파일: `scripts/wave24-weapon-models.py`, `scripts/wave24-textures.py`, `three-d/assets/weapons/wave24_{kar98,mosin,mg34,dp28}.{glb,mesh}`, `docs/research/wave24/weapon-models.json`.

### C. 실제 전투 VFX

- 기존 WebGL2 point-sprite 단일 GPU 파티클 배치와 최대 72 동시 파티클을 유지. 같은 TDM 게임 실제 **3D 광선충돌 결과**에서 반환한 재질 `AA.firstSolidHit(map,...).material`만 FX에 전달한다. VFX는 총알이 빗나간 경우 충돌 이펙트를 생성하지 않고, 피해 판정·AI HP를 변경하지 않는다.
- **금속:** 주황색 스파크 + 금속 분진. **벽돌:** 붉은 벽돌 파편/분진. **콘크리트:** 밝은 회색 먼지. **목재:** 황갈색 파편. **군복:** 절제된 천 먼지.
- 실제 피해 이벤트를 근거로 하는 기존 Hit Marker/헤드샷 구분/피격 방향 HUD와 64관절 상체 반응이 보존됐다. 재질별 사운드 샘플과 고정밀 사지 충돌 판정은 아직 없음.

## 2. 실제 Chrome 플레이 검증

`scripts/wave24-chrome-art.mjs` 실행, **Mac Chrome ANGLE SwiftShader 소프트웨어 렌더링(사용자의 실제 Windows GPU가 아님)**.

| 실제 시점 | 실제 선택 무기 | 평균 FPS 샘플 | GLB GPU 렌더 / Atlas |
|---|---|---:|---|
| 독일 1인칭 | MP40 | 16.8 | 4,820 tris / loaded |
| 독일 3인칭 | Kar98k | 16.0 | 2,411 tris / loaded |
| 독일 1인칭 | MG34 | 16.3 | 4,100 tris / loaded |
| 소련 1인칭 | PPSh-41 | 18.9 | 8,100 tris / loaded |
| 소련 3인칭 | Mosin | 17.1 | 2,832 tris / loaded |
| 소련 1인칭 | DP-28 | 18.9 | 2,464 tris / loaded |

**6개 장면 모두** GPU 모델·재질 `loaded`, 64관절 GLB 진영별 3개 장비 role, AI 4~5명 가시성, 실제 드로우콜 발생 확인, Chrome 에러 null.

별도 `scripts/wave24-chrome-combat.mjs`: 실제 Chrome 마우스 입력으로 적 1회 체력 감소+명중 HUD 발생, 수신 피해 이벤트 2회+방향 HUD 확인, `Wave24_hit_damage_real_chrome.mp4` 생성.

### FPS 전후 동일 조건 비교 (Mac Chrome SwiftShader, fast third person Factory, scale .68)

| AI 조건 | 로컬 Wave23 시각 수정 후 | Wave24 에셋 적용 후 |
|---|---:|---:|
| AI 1 | 19.42 | 20.22 |
| AI 4 | 14.51 | 14.58 |
| AI 8 | 12.43 | 12.56 |
| AI 8 일반 사격 | 12.47 | 12.60 |
| AI 8 피격 HUD | 12.30 | 12.38 |
| AI 8 전체 설정 | 12.00 | 12.13 |

측정 윈도우가 짧아 작은 FPS 차이를 개선으로 주장하지 않는다. **8AI 12~13FPS는 여전히 느림**. 이는 Mac 소프트웨어 GPU 기반이며 Windows 실 GPU 60FPS 달성 검증이 전혀 아니다. `COMPARE_WINDOWS.bat`을 실제 Windows 컴퓨터에서 실행해야 한다.

## 3. 남아 있는 실제 한계

- 생성된 콘셉트 시트와 게임 화면의 그래픽 수준은 같지 않다. 군인 얼굴과 의복의 3D 소스 기반 모델 한계, 복잡한 주름·노말맵·실사 재질 완성도는 개선 필요.
- Factory, Castle 일부 건물·컨테이너는 **기하학적 상자 blockout**으로 구성되어 '마인크래프트 같다'는 사용자의 지적을 완전히 해결하지 못함. 이번 작업은 캐릭터·무기·전투 VFX 중심이며 건물 전체 실사 GLB 리모델링은 별도 Wave 요구.
- Rifle/LMG는 Blender 직접 제작 모델이지만 역사적 고증 인증이나 공식 제작사 제공 에셋은 아니다.
- 소련군 베이스는 CC0 독일군 파생. 고유한 독립 소련군 해부학/얼굴 모델은 확보하지 못함.

## 4. 검증과 배포

- `npm run check`, `npm test`, `npm run build`, c2 full verify/secret-scan, `unzip -t` 및 GitHub Windows PowerShell HTTP 정적 파일 smoke를 별도 확인.
- 기존 Wave 22/23 GitHub 태그/배포 ZIP·공개 문서는 변경/삭제하지 않는다. 새 `v0.24.0`만 별도 생성.
- 릴리스가 GitHub Pages 배포 완료 상태가 되기 전까지 '공개 적용 완료'라고 말하지 않는다.
