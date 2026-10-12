# KARMA REBIRTH — Wave 22 최종 개발·검증 보고서

**검증 날짜:** 2026-10-12 (KST)  
**원본 프로젝트:** 기존 `test_fps_1` / `test-fps-1`  
**Wave 제한:** 사용자 요청에 따라 이번 Wave부터 최대 **40분**  
**정식 배포:** v0.22.0 (하단에 CI 및 배포 상태 기재)

## 1. 이번 Wave에서 실제 완료된 항목

- 기존 Wave22의 남은 **121개 Node 테스트 중 실패 2개 수정 → 121/121 PASS**. 소련군 부품은 Blender의 재질별 Join 때문에 기존 이름이 사라지지만, 실제 GLB에는 해당 소련군 전용 재질과 64관절에 바인딩된 새 메시가 존재한다. 의미 없는 이름 확인 대신 실제 스킨·재질·부착 장비를 검증하도록 개선.
- MP40·PPSh의 브라우저 GPU 파일 URL은 `fetch("assets/weapons/wave22_"+kind+".mesh")`로 동적 구성된다. 테스트에서 실제 로딩 경로 생성과 모델 종류 2개를 검증하도록 개선.
- 사용자 승인으로 만든 과거 대화의 ChatGPT 캐릭터·총기 **2D 컨셉 시트**를 디자인 참고로 삼아 Blender에서 오리지널 **실제 3D** 형태를 새로 모델링했다. 그림 자체를 3D로 변환하거나 사진측량한 것은 아니다.
- 기존 Windows 오프라인 패키지 구조, `Space` 점프, 실제 4v4 AI, 사격 판정·무기 VFX, 맵, 기존 배포 버전 보존.

## 2. 실제 생성·반영된 오리지널 3D 에셋

| 자산 | 실제 3D 결과 | 라이선스·출처 | 적용 |
|---|---:|---|---|
| MP40 3D | Blender **4,820 삼각형**, 48개 원본 메시 | 이번 프로젝트에서 직접 만든 모델 | 1인칭·3인칭 GPU 렌더 |
| PPSh-41 3D | Blender **8,100 삼각형**, 67개 원본 메시 | 이번 프로젝트에서 직접 만든 모델 | 1인칭·3인칭 GPU 렌더 |
| 독일군 Panzergrenadier Wave22 | **64관절 유지**, 군장·파우치·담요·가스마스크 통 신규 메시 **2,544 삼각형** | Britdawgmasterfunk 출처 CC0 GLB 파생, 부착 군장은 신규 제작 | 플레이어/AI 군인 |
| 소련군 스타일 Wave22 | **64관절 유지**, SSh 헬멧·gymnastiorka 군복·배낭·침낭·삽·탄약 파우치 신규 메시 **3,856 삼각형** | 독일군 CC0 원본 스켈레톤 파생 + 신규 군장. 역사적 소련군 독립 원본 아님 | 플레이어/AI 군인 |

**중요:** 이 모델들은 기존 '마인크래프트식 상자 무기'보다 형태가 복잡하지만 **실사형 원본을 고해상도 스캔한 자산은 아니다**. 재질 또한 셰이더 기반이고, PBR 사진 텍스처 완성 수준이 아니다. Sketchfab이나 Epic Games 계정을 사용하지 않았다.

### 소스 및 바이너리

- `three-d/assets/weapons/wave22_mp40.glb` + `.mesh`
- `three-d/assets/weapons/wave22_ppsh.glb` + `.mesh`
- `three-d/assets/characters/panzergrenadier_wave22_german.glb`
- `three-d/assets/characters/panzergrenadier_wave22_soviet.glb`
- `scripts/wave22-weapon-assets.py` — Blender 원본 무기 생성 스크립트
- `scripts/wave22-soldier-outfits.py` — 스킨드 군복/장비 제작 스크립트
- `three-d/weapon-art.js` — GLSL/WebGL2 원본 GPU 메시 기반 1P/3P 렌더러
- `docs/research/wave22/weapon-models.json`과 `character-models.json` — 구체적인 원본 에셋 삼각형 수·GLB 크기·제작 이력 감사

## 3. 실제 Mac Chrome WebGL2 전체 재검증

**2026-10-12** 새 브라우저 런타임 `scripts/wave22-chrome-3d-qa.mjs`에서 원본 GLB·GPU 무기 로딩, 1인칭·3인칭 독일군·소련군, shader 오류 유무를 검증했다.

| 테스트 | Mac Chrome SwiftShader FPS | 브라우저 상태 |
|---|---:|---|
| 독일군 / MP40 / 1인칭 Training | 19.53 | GPU gun loaded, shader error 없음 |
| 독일군 / MP40 / 3인칭 Training | 27.95 | GPU gun loaded, shader error 없음 |
| 소련군 스타일 / PPSh / 1인칭 Training | 35.74 | GPU gun loaded, shader error 없음 |
| 소련군 스타일 / PPSh / 3인칭 Training | 30.79 | GPU gun loaded, shader error 없음 |
| Factory 4v4 (실제 보이는 AI 5명) | **16.71** | 독일군 3·소련군 2, 신규 3D 스킨드 메시 5/5, generic fallback 0 |

**위 FPS는 Mac의 Chrome 헤드리스 소프트웨어 WebGL2 (SwiftShader)이고 사용자의 Windows GPU 성능이 아니다.** 60FPS 달성이나 실제 GPU 하드웨어 최적화 완료를 주장하지 않는다. 컴퓨터 사양/프레임 데이터는 실제 Windows PC의 `COMPARE_WINDOWS.bat` 실행 결과가 있어야 진단 가능하다. 또한 이 검증은 4v4 스테이징 화면을 포함하지만 30분 플레이 지속성·실사용자 Windows GPU 플레이 테스트를 의미하지 않는다.

실제 이미지:

- `wave22-german-first-chrome.png` (독일군 MP40 1P)
- `wave22-german-third-chrome.png` (독일군 MP40 3P)
- `wave22-soviet-first-chrome.png` (소련군 PPSh 1P)
- `wave22-soviet-third-chrome.png` (소련군 PPSh 3P)
- `wave22-factory-chrome.png` (Factory AI 두 진영 실제 게임 화면)

## 4. QA 및 배포 검증

- `npm run check`: PASS
- `npm test`: **121/121 PASS**
- `npm run build`: PASS
- `c2 full verify` (incl. secret scan): PASS. 단, 현재 c2 원본 폴더가 Git 작업 트리로 추적되지 않아 Git-dirty 0개 결과는 **전체 소스/자산 보안 인증이 아님**.
- `docs/research/wave22/chrome-3d-integration.json`: 런타임 검증 및 Mac 소프트웨어 WebGL 성능 기록
- 오프라인 ZIP에서 Wave22 MP40·PPSh GPU `.mesh`/GLB, 두 스킨드 군인 GLB, 점프/무기 VFX, Windows 런처 및 진단 도구 포함 필수.
- GitHub Actions Windows 런너는 PowerShell 파싱·로컬 HTTP·필수 에셋 로딩 URL **스모크 테스트만** 수행. 실제 Windows GPU Chrome 게임 테스트는 수행하지 않는다.
- `v0.21.0` 이하 이전 배포본은 변경하지 않는다.

## 5. 여전히 남은 그래픽 개선

기존 플레이 상태에서 개선은 실제로 보이지만, 맵 건물은 아직 대부분 단순 blockout 형태이고, 모델의 텍스처/LOD/실제 역사 고증은 추가 작업이 필요하다. 소련군은 CC0 독일군 베이스에서 파생한 역사적 스타일 모델이다. 손 파지 IK 5mm 목표의 이전 측정 결과와 장시간 두 발 접지 안정성을 이 Wave에서 다시 30분 이상 플레이하여 검사하지는 않았다.

**다음 작업 제안:** Blender sculpt 기반의 사실적인 얼굴·군장 주름 디테일, 실제 라이선스 확인한 사진 기반 PBR 재질, 원본 MP40/PPSh 상세 모델의 포워드/사이드 렌더 시트, Factory/ Castle 삼각형 LOD와 GPU 메모리 관리. 우선 사용자의 Windows 현장 FPS와 그래픽 가속 활성 여부부터 확인하면 품질 예산을 정할 수 있다.
