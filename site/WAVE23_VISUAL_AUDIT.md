# KARMA REBIRTH — Wave 23 시각 품질 회귀 실측 검사

**검사:** 2026-10-12 KST / 동일 Mac Chrome SwiftShader, 1200×740 브라우저 창 / 프로젝트 `test_fps_1`.  
**공개본:** v0.23.0 / `9ef0e92`. **현재 수정 결과:** 기존 c2 소스/로컬 빌드에만 반영, **GitHub 미게시**.

## 확인한 결과: Minecraft처럼 보이는 이유

1. **Wave 22에서 Wave 23으로 전체 자산이 '리셋'되지는 않았다.** 태그 `v0.22.0`을 `git archive`로 정확히 복원, `v0.23.0`과 실제 Chrome 동일 화면 1P/3P `fast`/`original` 총 8가지 비교. 양쪽 모두 실제 artist CC0 64-joint 병사 GLB `loaded`, AI 5명, 독일 MP40 4,820 삼각형 GPU 메시 `lastKind=mp40`로 렌더됨. 화면은 대부분 비슷함. 즉 Wave 23에서 갑자기 Minecraft로 돌아간 것은 아님.
2. **그러나 현재 맵은 본질적으로 blockout.** `three-d/maps.js`가 factory/castle/training 건물·컨테이너·크레이트를 대부분 충돌용 box로 만들고 `three-d/engine.js:pushEnvironmentGeometry`가 `pushBox`로 삼각형화. 일부 환경 텍스처/컨테이너 골·기둥 등은 있어도 **진짜 고품질 건축 모델, 복잡한 실루엣, 실제 PBR 사진 텍스처가 완성된 완전한 게임 맵이 아니다.**
3. **기본 `fast`가 해상도를 0.68배로 렌더링.** Mac Chrome SwiftShader가 느리면 auto scale이 0.68에서 유지됨. 화면 픽셀 수는 가로세로 각 .68이므로 픽셀 수는 약 .46배. 정교한 재질 디테일이 흐릿해짐. `?quality=original` 또는 `?scale=1`로 더 선명히 볼 수 있으나 FPS 하락 가능.
4. **Wave 23 군장에 네모난 배낭이 있었고 UV가 한 점에 묶여 있었다.** 정확히 `scripts/wave23-gear-variants.py`의 기존 `box("G02_large_stiff_canvas_rucksack"...)`·`box("S01_large_square_soviet_haversack"...)` 및 `for loop in uv.data: loop.uv=(u,v)` 구현. 재질 무늬가 제거되고 각진 상자가 도드라졌음.
5. **무기도 진짜 모델은 그려지나 시각적으로 과대함.** `weapon-art.js` GLB 소스 자체가 손에 드는 총보다 긴 기준 단위로 제작되었는데, 장면 행렬에서 그대로 1.0배 그려 거대한 회색 기계 블록으로 보임.

## 로컬 수정 (미공개)

- `three-d/weapon-art.js`: 실제 MP40·PPSh GPU 메시를 유지한 채 표시 행렬을 1P 0.57배, 3P 0.72배로 교정하고 카메라 앞 위치 조절. 1P에서 시야를 가리던 지나치게 큰 총을 줄임. 총알 판정/피해량은 변경 없음.
- `scripts/wave23-gear-variants.py`: 역할별 가방/배낭 3D 둥근 천 주머니 메시+실제 굴곡 모델링. 역할별 GPU 공유 유지. 모든 UV를 1점으로 만든 버그를 수정하여 각 부품의 32×32 atlas tile 내로 표면 UV를 투영. 독일/소련 3역할+64-joint 유지.
- `scripts/wave22-soldier-outfits.py`: 소련군 공통 베이스의 정사각형 가방을 둥근 천 배낭 및 덮개로 변경. 신규 Blender GLB 재생성하여 Wave23 모델 재생성. 기존 공개 v0.22.0 자체는 변경하지 않음.
- 새 `tests/wave23-visual-guard.test.mjs`: 모든 6 역할 GLB에서 실제 UV 범위가 한 점이 아닌지, 무기 행렬 스케일, 가방 3D 제작/라이선스 원본 그대로인지 검사.

## 실측

| 화면 | 이전 공개 Wave23 | 로컬 수정본 | 판단 |
|---|---:|---:|---|
| Factory fast 1P 독일 | 15.47fps | 16.27fps | 매우 짧은 관측, 성능 우월성 증명 아님 |
| Factory fast 3P 독일 | 16.86fps | 15.63fps | 같은 카메라 조건, 독립된 단일 샘플 |
| Factory original 3P 독일 | 15.20fps | 15.31fps | 사실상 유사 |
| 8 AI fast 3P (C) | 12.60fps | 12.43fps | 여전히 매우 느림, 개선했다고 주장 금지 |
| 단일 test 셋 | 132/132 PASS (공개 전) | Full verification PASS + 시각 추가 자동 테스트 3개 PASS | 기존 전투 이벤트·렌더 기능 유지 |

Chrome 소프트웨어 SwiftShader이고 실제 사용자의 Windows GPU 60FPS 또는 하드웨어 GPU 결과를 대변하지 않는다.

**화면 파일:**
- `docs/research/visual-audit/screenshots/wave22-fast-first-factory.png` — 과거 Wave22 실제 배포본
- `docs/research/visual-audit/screenshots/wave23-fast-first-factory.png` — 현재 공개 Wave23
- `docs/research/visual-audit/screenshots/hotfix-fast-first-factory.png` — 로컬 수정본
- `docs/research/visual-audit/first-person-before-after.png` — Wave23 이전/로컬 수정 나란히
- `docs/research/visual-audit/third-person-before-after.png`
- `docs/research/visual-audit/same-scene-runtime.json` — 실제 GPU gun / NPC / FPS 로그
- `docs/research/visual-audit/postfix-runtime.json`

## 결론과 후속 작업

**실제 심각한 그래픽 퇴보의 주된 원인은 2026년 현재 게임의 블록형 맵/원시적으로 모델링된 총·군장이며, Wave23 버전 업그레이드가 이를 해결하지 못한 것**이다. 위 로컬 수정은 뚜렷한 문제를 일부 줄였으나 사진 수준의 현실적인 게임이 된 것은 아니다. 근본 해결은 다음 범위에서 진짜 건물·지형·컨테이너·도구·무기·사람의 **품질 높은 실제 GLB 메시와 PBR 재질**로 대체하고 화면의 before/after로 검증하는 것이다.

현재 변경사항은 아직 GitHub Pages 및 릴리스에 올리지 않았으며, 사용자 최종 승인 전 공개하지 않는다.
