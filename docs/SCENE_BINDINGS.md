# 블랙 리지 — 변형 장면·후속 사건 연결 기록

작성: GA / Codex, 인계 후 이번 실행에서 작성. 이전 A·GA의 플레이 경험을 본인의 경험으로 주장하지 않음.

원고 판: `9a9291ffab1b677d7edae17ce7d40ab6c89d0790`. 기준은 2026-11-13 23:05 로컬 실행본. 현재 코드: `../game/`. 이전 실행본은 수정하지 않았다.

## 이번에 코드로 연결한 범위

- 부수 사건 29묶음, 39개 장면 노드, 79개 선택. 실제 플레이로 통과한 수가 아니라 작성 데이터 수다.
- 낮·밤 전환, 장소 도착, 개인 단서 조사, 물건 양도·소각·발견, NPC 부상·치료·죽음, 실제 협박·영입 응답, 신문 발행, 재판 결과, 폭발·소화 후속을 기존 상태와 연결했다.
- 12직업 × 5일의 이어갈 일 안내를 작성했다. 이것은 행동 안내이며, 60개의 확정 사건이나 이미 확인한 증거가 아니다.
- 전체 원고의 2,934개 상황 표제는 이전 작업의 추출 목록 수다. 이번에 2,934개 원문을 모두 읽거나 각각 독립 실행 장면으로 옮겼다는 뜻이 아니다. 상태가 같은 원고 변형은 공통 처리와 조건별 문장으로 합쳤다.

## 사건별 출처와 연결

|묶음|장면 / 장소|시작 조건과 후속|원고|
|---|---|---|---|
|1. 봉쇄 앞의 광부들|gate (갱도 입구) → lunch (갱도 입구)|gate: 2일 낮1, mineClosed; 미개입 시 minerEntered; lunch: 2일 낮1, followOnly|[gate](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L9), [lunch](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L26)|
|2. 갱도 구조와 진료소|trapped (갱도 입구) → minerClinic (진료소)|trapped: 2일 낮2, minerEntered; minerClinic: 2일 낮2, minerInClinic|[trapped](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L66), [minerClinic](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L91)|
|3. 밀린 품삯|wages (술집)|wages: 2일 낮2, mineClosed; 미개입 시 wageFight|[wages](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L109)|
|4. 노조 모임|unionMeeting (술집)|unionMeeting: 3일 낮1, doyleAlive|[unionMeeting](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L161)|
|5. 두 번 울린 종|wrongBell (교회) → bellChild (주택가)|wrongBell: 3일 낮1, 날짜와 장소; bellChild: 3일 낮1, followOnly|[wrongBell](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L212), [bellChild](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L235)|
|6. 아이의 증언과 재확인|childWitness (주택가) → childReturn (주택가)|childWitness: 2일 낮1, 날짜와 장소; childReturn: 3일 낮1, followOnly|[childWitness](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L261), [childReturn](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L295)|
|7. 종이를 태운 연기|smoke (주택가)|smoke: 2일 낮2, burnHome|[smoke](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L317)|
|8. 시장의 열쇠와 동행|mayorKey (마을 회관) → keyAtMine (갱도 입구)|mayorKey: 2일 낮2, mayorAlive; keyAtMine: 2일 낮2, followOnly|[mayorKey](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L359), [keyAtMine](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L377)|
|9. 화약고 당번|watch (갱도 입구)|watch: 2일 낮2, doyleAtMine|[watch](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L404)|
|10. 배급 소동|rations (마을 회관)|rations: 3일 낮1, mayorAlive|[rations](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L446)|
|11. 협박 뒤 판자|boards (주택가)|boards: 3일 낮1, publicThreat|[boards](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L492)|
|12. 고발 뒤 소문|rumor (술집)|rumor: 3일 낮1, caseExists|[rumor](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L545)|
|13. 고발 뒤 몸싸움|courtScuffle (마을 회관)|courtScuffle: 2일 낮1, caseExists|[courtScuffle](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L598)|
|14. 부족한 붕대|bandages (진료소)|bandages: 3일 낮2, stockLow|[bandages](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L645)|
|15. 도움 구하러 간 광부의 귀환|railDeparture (주택가) → railReturn (술집)|railDeparture: 3일 낮1, 날짜와 장소; 미개입 시 travelerLeft; railReturn: 4일 낮1, travelerLeft|[railDeparture](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L692), [railReturn](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L727)|
|16. 붉은 양초와 포장지|redCandle (주택가) → candlePaper (교회)|redCandle: 3일 낮2, 날짜와 장소; candlePaper: 3일 낮2, followOnly|[redCandle](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L755), [candlePaper](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L777)|
|17. 익명 고해와 돌아온 주민|confession (교회) → confessionReturn (교회)|confession: 3일 낮2, 날짜와 장소; confessionReturn: 4일 낮1, followOnly|[confession](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L802), [confessionReturn](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L835)|
|18. 압박받는 시장|mayorAnger (마을 회관)|mayorAnger: 3일 낮2, mayorUnderPressure|[mayorAnger](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L848)|
|19. 실제로 게시된 호외|fakeExtra (마을 회관)|fakeExtra: 2일 낮1, fakePosted|[fakeExtra](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L901)|
|20. 갱도 수색|mineSearch (갱도 입구)|mineSearch: 4일 낮1, missingBombs|[mineSearch](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L951)|
|21. 실제 자금 흐름|newMoney (술집)|newMoney: 4일 낮2, economyChanged|[newMoney](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1004)|
|22. 협박을 공개한 도일 동행|doyleGuard (술집) → doyleConfides (갱도 입구)|doyleGuard: 3일 낮1, doyleDisclosed; doyleConfides: 3일 낮1, followOnly|[doyleGuard](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1052), [doyleConfides](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1082)|
|23. 파헤친 종탑의 추모|memorial (교회)|memorial: 3일 낮2, cacheDisturbed|[memorial](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1101)|
|24. 도일 사망 뒤 노조|leaderless (술집) → doyleLedger (주택가)|leaderless: 3일 낮1, doyleDead; 미개입 시 newLeader; doyleLedger: 3일 낮1, followOnly|[leaderless](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1143), [doyleLedger](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1178)|
|25. 처형 뒤 빈집|executedHouse (주택가)|executedHouse: 2일 낮1, executionYesterday|[executedHouse](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1191)|
|26. 교회의 소각 흔적|burnSmell (교회)|burnSmell: 5일 낮1, burnChapel|[burnSmell](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1235)|
|27. 마지막 밤을 앞둔 의견|lastNight (마을 회관)|lastNight: 5일 낮1, mayorAlive|[lastNight](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1273)|
|28. 폭발 뒤 갱도|rubble (갱도 입구)|rubble: 1일 낮1, exploded|[rubble](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1318)|
|29. 실제로 꺼진 도화선|scorchedBoot (갱도 입구)|scorchedBoot: 1일 낮1, fuseExtinguished|[scorchedBoot](https://github.com/tjdgns3728-cloud/review-sandbox/blob/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story/scenes/side_incidents.md#L1360)|

조건의 정확한 필드·선택 문장·후속 노드는 [INCIDENT_BINDINGS.json](INCIDENT_BINDINGS.json)에 보존했다. `followOnly`는 앞선 선택이 있어야 열리는 장면이다. 시작 날짜가 지났더라도 실제 조건이 맞지 않으면 열리지 않는다.

## 원고를 그대로 실행하지 않은 부분

- 플레이어의 대답·투표·협력·감정을 원고가 대신 정하는 대목은 질문·선택·NPC 발언으로 바꿨다. NPC의 주장은 확인한 사실과 구분한다.
- “집에서 총이 나왔으니 집주인이 범인”처럼 신원을 확정하는 서술은 사용하지 않았다. 권총을 실제로 놓아야 발견할 수 있고, 범인은 목격·추가 증거로 따로 판단한다.
- 폭약의 수량·위치는 실제 6개 물건의 상태를 따른다. 원고 분기 이름만으로 수레나 집에 자동 배치하지 않는다.
- 폭발 직격 생존·구조 원고는 P의 직격 사망 규칙에 맞춰 잔해 접근과 사후 조사로 바꿨다. 직격 사망자를 되살리는 선택은 없다.
- 시민의 밤 이동이나 밤샘 행동을 허용하는 원고는 넣지 않았다. 낮1·낮2·밤, 시민의 밤 휴식, 습격 시 대응 규칙을 유지한다.
- 숨어 있기만 하면 신원이 가려진다는 처리나 장소 밖 정보를 자동 공유하는 처리는 넣지 않았다. NPC도 실제 있는 장소에서만 만난다.
- 소각 흔적은 실제로 태운 종이에서, 호외 조사는 실제 게시한 호외에서, 빈집 조사는 실제 처형 이후에 이어진다.
- 새로 들어간 구현 수치: 진료소 공동 붕대 재고는 시작 인원×2; 돈을 넣은 영입 제안 2; NPC 노조 운영 자금 4. 원고의 확정 수치나 P가 직접 지정한 값이라고 주장하지 않는다. 선택지에 비용을 표시하고 실제 소지품에서 계산한다.
- NPC의 표나 인원을 플레이어 승패 계산에 넣지 않는다. 부상한 NPC의 체력 회복도 의사만 가능하다.

## 파일 연결

- `04Incidents.js`: 사건 데이터와 출처 줄.
- `06StoryDirector.js`: 발생 조건, 질문/행동 결과, 후속 열기, 개인 사건 기록.
- `07StoryActions.js`: 물건·신호·돈·NPC 행동과 상태 변경.
- `08StoryFlow.js`: 실제 날짜·장소·부상·재판·신문·폭발 후속.
- `00World.js`, `05Scenarios.js`, `10Session.js`: 기존 판정·행동 완료·턴 경계에 연결.
- `01Narrative.js`, `20Interface.js`: 상황에 따른 판정 서술, 현장 행동/대화 메뉴, 오른쪽 사건 기록.

## 읽기 범위와 규칙 재사용

이전 실행에서 보존한 원문을 재사용했다. 이번에 인터넷의 현재 머리를 다시 가져온 것은 아니다. 원문은 [원고 저장소의 고정 커밋](https://github.com/tjdgns3728-cloud/review-sandbox/tree/9a9291ffab1b677d7edae17ce7d40ab6c89d0790/story)에 있다. 해당 저장소 접근 권한이 필요하다.

- 이번에 전체 읽음: SETTING.md, scenes/README.md, scenes/side_incidents.md 1–1402줄.
- 이번에 선택 읽음: scenes/branches.md 147–354, nights.md 124–211, actions_combat.md 1–135, actions_social.md 9–72, jobs_expanded.md 1380–1495 및 1544–1798.
- jobs_expanded.md 1380–1657 조회 중 출력이 잘렸다. 1496–1543은 읽었다고 기록하지 않는다. 큰 파일 검색 출력도 일부 잘렸으며 표제 추출을 전체 의미 읽기로 계산하지 않는다.
- main_variants.md, places_encounters.md, npc_reactions.md와 기본 story_branches.md/story_jobs.md는 이전 구현·기록 및 보존된 자료의 해당 연결을 재사용했다. 이번에 전체를 다시 읽었다고 주장하지 않는다.
- 공통 규칙 판은 이전 작업 기록의 `61485f165179ce5e386ddbad05ee91d1beb31f91`을 재사용했다. 이번 적용: 자율 플레이 검증·별도 검증 AI·자기 성공 판정 없이, 요청된 원고 연결과 실행본 전달만 진행. 현재 P의 명시 지시를 원고보다 우선했다.
- D10-GA 관련 적용 행동: 시나리오 원고를 게임 자료와 코드로 연결하며, 시나리오 AI를 새로 만들거나 실행하지 않는다. 이전 A 원고를 이번 새 이야기 기준으로 되살리지 않는다.

## 실제 관측과 미확인

아래는 원고 연결 당시의 관측 기록이다. 이후 접속 복구 결과는 `../AI_HANDOFF.md`에 따로 적었다. 서버가 로컬 주소와 AI 설정 켜짐을 출력했다. 기존 8866 서버는 종료하지 않았다. 브라우저·한 판 플레이·테스트 묶음·검증용 AI 호출은 실행하지 않았다. 따라서 분기 도달, 화면 배치, 실제 AI 응답, 플레이 재미를 확인했다고 말하지 않는다. 코드 작성 사실과 서버 시작만 보고한다.
