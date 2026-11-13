# 글로 주고받는 이야기 도구 (ENGINE-TALK-1)

어느 게임이든 붙여 쓰는 부품 넷(`runtime/talk.js`)과 `engine.ai`의 세 도구(`runtime/ai.js`). 엔진은 누가 말하는지, 무엇을 고를 수 있는지, 구역이 무엇인지 모른다 — 모두 게임이 준다.
본보기: 편집기 화면 사례 `editor/ui_cases/talk_tools.json` (`python tool.py uitest talk_tools`, AI를 부르지 않음).

## 부품 (편집기 ＋ 기능 추가 · 코드에서는 `node.get("이름")`)
| 부품 | 쓰는 법 | 신호 (그 오브젝트에서 `node.on`) | 사람이 바꾸는 값 |
|---|---|---|---|
| 💬 이야기 칸 `Feed` | `await feed.say({who, text, kind})` — kind: `say` 말 · `narr` 서술 · `me` 내 말 · `note` 알림. `skip()` `clear()` `wait()` | `line` 한 줄이 다 나옴 · `skip` | 글 빠르기(글자/초 0~200) · 남겨 둘 줄 수 · 색 |
| 🔢 번호 선택지 `Choices` | `show([{id, label, desc?, disabled?}])` · `await ask(목록)` → 고른 것 · `await confirm("할 일")` → 참/거짓 | `pick` {id, index, item, by} · `hover` item 또는 null | 선택지 최대 수(1~9, 기본 4) · 길게 누르기 시간(초) · 되묻는 글 |
| 📊 막대 `Gauge` | `set(값)` · `preview("up" 또는 "down" 또는 null, 크기?)` | `change` {value, old, dir} | 번쩍임 길이(초 0~3) · 가장 큰 값 · 오름·내림 색 |
| 🗺 그림 위 구역 `Hotspots` | 칸 '구역들' 또는 `set([{id, label, note?, rect: [x, y, w, h] 또는 points, disabled?}])` — 숫자는 퍼센트 | `pick` {id, zone, by} · `hover` zone 또는 null | 밝아지는 색·밝기 · 구역 늘 보이기 |

- 이야기 칸은 엔진 Text 부품의 '한 글자씩 나오기'로 쓴다. 칸을 한 번 누르면 나오던 줄과 기다리던 줄이 모두 보인다.
- 선택지는 숫자 키로도 고른다(입력칸에 글을 쓰는 동안은 먹지 않는다). 터치로 길게 누르면 고르지 않고 `hover`만 보낸다.
- 글자 크기를 0으로 두면 배치만 하고 모양은 게임의 스타일 시트가 정한다(`we-feed` `we-line-<kind>` `we-choice` `we-gauge` `we-zone` …).

## engine.ai의 세 도구 — AI는 정하지 않고 옮기기만 한다
```js
const p = await engine.ai.propose(글, [{id, label, words?}]);          // → {candidateId, candidate, by, seconds} 또는 null
if (p && await choices.confirm(p.candidate.label)) 실행(p.candidateId);  // 누른 뒤에만 실행 — 실행과 판정은 게임 코드

const r = await engine.ai.narrate({facts, speaker, style, forbid, fallback, limitSeconds, names});
const a = await engine.ai.speakAs({persona, knows, hide, say, question, forbid, fallback, limitSeconds, names});
// r, a → {text, usedFallback, seconds, reason}
```
- `propose`: 후보 목록 밖의 답, 꼴이 다른 답은 버린다(null). AI가 없으면 후보의 `words`로만 찾고(`by: "words"`), 하나로 정해지지 않으면 null.
- `narrate`: `facts`만 AI에 넘긴다. 돌아온 글에 `names`(게임의 모든 이름) 가운데 `facts`·`speaker`에 없는 이름이 있거나, `forbid`(`"글"` 또는 `{pattern: "정규식"}`)에 걸리거나, 너무 길면 버리고 `fallback`(글 또는 `facts => 글`, 없으면 facts 그대로)을 쓴다.
- `speakAs`: 성격·아는 것·숨길 것·말할 것·물음만 넘긴다. `hide`(`"글"` 또는 `{text, words}`)를 말한 답은 버린다. 틀 글을 주지 않으면 `say`를 쓴다.
- 늦으면(`limitSeconds`, 기본 60초) 기다리지 않고 틀 글. 틀 글을 쓴 까닭은 `reason`에 있다 — 화면에 한 줄로 알릴 수 있다.
- 세 도구는 `engine.ai.ask`를 탄다: 한 판 상한·호출 기록(`logs/ai_calls.jsonl`)·장애 흉내(`?ai=fail`)가 그대로다. 걸린 시간은 `engine.ai.calls`와 신호 `ai:tool`.
- `engine.ai.check(글, {facts, speaker, names, forbid, hide})` → 버릴 까닭 또는 null: 게임이 제 글에도 같은 검사를 쓴다.
- 시험·본보기: `engine.ai.fake((prompt, {purpose}) => "답")` — 서버를 부르지 않고 정한 답으로 돈다.
