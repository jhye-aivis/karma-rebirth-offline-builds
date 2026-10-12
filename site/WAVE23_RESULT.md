# KARMA REBIRTH — Wave 23 검증 및 배포 보고서

2026-10-12 KST / project `test_fps_1` / **Wave 상한 40분**.

## 1. 실제 완성한 개선
- **독일군 G01 / G02 / G03, 소련군 스타일 S01 / S02 / S03**: 독일군 MP40 파우치/가스마스크통, 소총수 배낭/침낭, 경장형 가방 / 소련군 PPSh 드럼 파우치/배낭, 소총수 삽/수통, 경장형 침낭. 실제 Blender 제작 스킨드 메시(문자열 라벨이나 색상만 교체한 모델이 아님). 기존 제작자 CC0 Panzergrenadier 64관절 스켈레톤을 유지. 소련군은 독일 CC0 모델에서 파생한 스타일 모델이며 독립적인 역사 고증 자산이 아님.
- 진영당 1개 공유 GLB: `three-d/assets/characters/panzergrenadier_wave23_german.glb`, `panzergrenadier_wave23_soviet.glb`, `wave23_gear_atlas_{german,soviet}.png`, `three-d/assets/characters/wave23-variants.json`과 `three-d/variants.js`. 고정 시드/역할에 따라 실제 W23_G01/S01 노드명 장비만 그린다. **Soviet 군장 관련 원본 15개 메시 → 4개(기본+3 역할), 진영별 단일 아틀라스**.
- 정적 맵 지오메트리를 매 프레임 JS 배열 복사/재업로드하던 방식 → 전용 GPU static VBO 생성/렌더(그림자 패스 포함), 동적 지오메트리만 갱신. 실제 WebGL2 `drawArrays/drawElements` 제출계수로 `KarmaWave23GpuMetrics`: draw calls, triangles, 그림자/액터별 계수. CPU `actorRenderMs`, `shadowCpuMs`, `vfxCpuMs`; GPU timer 결과는 미측정 (`gpuMs=null`). GPU 메모리는 추정치 미제공.
- `three-d/tdm.js`의 진짜 피해 이벤트(고유 id/실제 HP 감소)에만 연동하는 **적 명중 X 표시, 조건부 머리 명중 색상·음성, 나를 공격한 방향 HUD와 체력 강조, 상체 64관절 additive 반응**, 작은 군복 먼지 파편. `three-d/combat-feedback.js/css`. UI에서 화면 움직임 감소 선택 가능. 사지는 개별 collider 판정이 없어 모두 **body**로 분류(사지 정밀 판정은 미구현). Head는 카메라 광선이 반지름 0.235m 머리 구체를 통과할 때만 판단하는 근사 판정(머리 실제 고정밀 충돌체는 아님).
- **기존 Wave21 Space, Wave22 모델 MP40·PPSh, 전투 4v4, AI, 좌우 시점 유지**.

## 2. 같은 Chrome SwiftShader Factory 3P fast scale 0.68 A~F 비교

**중요: 아래는 Mac 헤드리스 Chrome SwiftShader 소프트웨어 렌더링. 사용자의 Windows GPU가 아니다.**
기존 Wave22를 변경하기 전에 저장한 `performance-baseline.json`과 코드/군장 아틀라스 적용 후 `performance-after-atlas.json`, 각각 모델 로딩 후 RAF 약 4.6초 기록. 하드웨어·프레임 제어가 완전히 안정된 정밀 GPU microbenchmark는 아니며 오차가 존재한다.

| 실험 | Wave22 FPS | Wave23 FPS | Wave22 CPU scene | Wave23 CPU scene |
|---|---:|---:|---:|---:|
| A: 1 AI | 19.13 | 19.71 | 1.62ms | 1.36ms |
| B: 4 AI | 14.89 | 14.73 | 2.05ms | 1.75ms |
| C: 8 AI | 12.78 | 12.60 | 2.35ms | 1.86ms |
| D: 8 AI, 사격 | 13.03 | 12.78 | 2.23ms | 1.85ms |
| E: 8 AI, 피격 HUD 활성화 | 12.81 | 12.44 | 2.16ms | 2.07ms |
| F: 8 AI, 전체 최적화 | 12.81 | 12.30 | 2.16ms | 1.96ms |

**CPU scene 평균은 8 AI 조건 C 기준 2.35→1.86ms(약 21% 감소). FPS는 12.78→12.60으로 개선하지 못했다.** 이는 CPU 복사/렌더 제출 시간 감소와 달리 Mac SwiftShader의 소프트웨어 GPU 병목이 여전히 남음을 시사한다. F는 전체 최적화 코드를 실행하는 기본 Wave23 경로일 뿐 별도의 토글로 모든 최적화를 끄고 켜는 완벽한 인과분석 실험은 아님. E/F 실제 AI의 유효 생존 수는 일부 시점에 8명 미만이 될 수 있음. 명중 이벤트가 A~F 4.6초 구간에 연속 생성됐다는 증거가 없어 피격 VFX 집중부하 실험으로 해석하면 안 된다.

최종 GPU 제출 카운터는 `docs/research/wave23/chrome-combat.json` 실제 4v4 Chrome 장면에서 수집. 이는 draw submissions이며 GPU 실행시간이 아니다. `docs/research/wave23/variant-asset-audit.json`에 Blender GLB 64뼈, 역할별 삼각형, 병합 전후 메시 수 등 기록.

## 3. 실제 Chrome 전투 검증
- `scripts/wave23-chrome-combat.mjs` 브라우저 `Input.dispatchMouseEvent`로 **실제 총알을 쏘아 진짜 적 HP 감소 / `KarmaTDM.damage` 이벤트 수신, hit marker 발행** 검증. 피해 직후 `KarmaTDM.damage`를 AI 공격자로 호출해 **나의 HP 감소 / 방향 HUD** 연결도 검증(후자는 실제 AI 자율 사격 난수가 아닌 직접 결정적 공격 재현).
- 독일군/소련군 양 진영의 모델 각각 G01~3 / S01~3 역할 부착, CPU drawcalls / actual Chrome screenshots, 총구·사격·체력 HUD.
- Chrome 렌더 PNG: `wave23-german-6-outfits-chrome.png`, `wave23-soviet-6-outfits-chrome.png`, `wave23-hitmarker-in-combat.png`, `wave23-directional-damage.png`. 실제 연속 Chrome screenshot 프레임의 MP4 `Wave23_hit_damage_real_chrome.mp4`. 몇 프레임은 HUD 이펙트가 TTL 종료된 상태일 수 있으며 이것이 모든 피격 영상의 지속 표시를 보장하지는 않음.
- 실사 수준이나 Windows GPU 60FPS 달성 증거는 없음. 고품질 모델 변형과 타격감을 확인한 WebGL 프로토타입.

## 4. 검증·배포
- 필수 기존 121개 테스트 보존 + Wave23 소스 7개 / Chrome 증명 4개 추가, **최종 테스트 수는 검증 시점 결과 참조**.
- `npm run check`, `npm test`, `npm run build`, c2 secret scan, `unzip -t`, Chrome 훈련·4v4, Windows GitHub Actions HTTP/PowerShell smoke 및 Pages 배포 성공 여부를 확인해 녹색일 때만 공식 버전 배포.
- 이전 **v0.22.0** 릴리스와 Pages 공개 사진/문서 유지.
- 실제 사용자의 Windows GPU 환경에서는 ZIP 압축 해제 후 `PLAY_WINDOWS.bat`과 `COMPARE_WINDOWS.bat`을 실행해 GPU 가속 여부와 실제 FPS를 조사해야 한다.

## 5. 남은 주요 과제
- 사용자 Windows Chrome/Edge 하드웨어에서 프레임별 실제 GPU timestamp, GPU/CPU 병목 (Windows PC 원격 데이터 없음).
- 본 Wave의 군장 슬롯은 선택된 role mesh 렌더링이고, 무기·전투 역할별 AI 무기 자동 변경이나 무기 픽업 UI는 별도 미구현.
- 근/중/원거리 전용 3단계 GLB LOD 구축 미완료. 화면 밖 프러스텀 컬링은 기존 구현 유지. 재질 아틀라스 통합은 진행됐지만 추가 GPU셰이딩 개선 필요.
- 세밀한 사지 피격 충돌/애니메이션, 물리 관성/죽음 반응, 실제 충격 재질별 파티클과 소리 샘플은 후속 범위.
