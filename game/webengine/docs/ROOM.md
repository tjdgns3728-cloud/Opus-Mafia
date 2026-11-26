# 여럿이 함께 들어오는 방 (ROOM-1)

어느 게임이든, 사람 여럿이 저마다 자기 브라우저로 **주소 하나와 방 이름**으로 들어와 한 판을 함께 한다.
판의 상태는 서버가 쥔다. 화면은 제 자리가 봐도 되는 것만 받고, '이 자리의 뜻'만 보낸다. 엔진은 무슨 게임인지 모른다.

```
python -m server.play --game <게임 id 또는 폴더>     # 놀이용 서버 http://127.0.0.1:8790 (다른 문: --port 또는 WEBENGINE_PLAY_PORT)
python -m server.play --game editor/ui_cases/room_demo   # 본보기 판 (게임 낱말 없음)
python tool.py roomtest                                  # 화면 시험: 본보기 판을 창 여덟으로 처음부터 끝까지, "손님 화면이 남의 숨은 것을 받은 수"를 센다
python -m server.play --game <게임> --test               # /roomtest 쪽도 내준다: 한 쪽에 여덟 자리를 열어 손으로 해 본다
```
- 놀이용 서버는 게임 하나의 플레이 화면·엔진 틀 파일·그 게임 파일(읽기만)·방의 길(`/room/…`)만 내준다. 편집기 화면, 편집기 열쇠, 파일 쓰기·지우기·되돌리기, 화면이 AI를 부르는 길은 **없다**(`server/play.py`). AI는 방의 규칙만, 이 컴퓨터 안에서만 열었을 때만 부른다(아래 ROOM-3).
- 게임의 규칙은 서버 곁의 노드 프로그램(`server/room_host.js`)에서 돈다 — 브라우저가 읽는 것과 같은 `runtime/*.js`와 게임의 `scripts/*.js`를 읽는다. 노드가 없거나 규칙이 없으면 서버는 뜨지 않는다(화면 하나가 판정하는 길은 없다).
- 방은 기억 안에만 있다. 서버를 끄면 모든 방이 사라진다. 게임의 파일(`scripts/`, `assets/`)은 누구나 받을 수 있으니 숨길 것은 `room.state`에만 둔다.

## 게임이 쓰는 이름 ① 규칙 쪽 — 서버에서 돈다 (게임의 `scripts/*.js` 가운데 하나)
```js
WebEngine.room({
  min: 4, max: 8,                         // 사람 수 위아래 (수 또는 data => 수 — data("data/x.json")는 게임의 자료 파일)
  start(room) { … },                      // 방을 만든 사람이 [시작]을 눌렀다: 나누고, 첫 단계를 연다
  view(room, seatId) { return {…}; },     // 그 자리가 봐도 되는 것 전부 — 그 자리의 화면에만 간다 (꼭 있어야 함)
  chat(room, seatId, {text, to}) { return "all" /* 또는 [자리 id…] 또는 {to, tag} 또는 null(보내지 않음) */; },
  act(room, seatId, action) { … },        // 단계 밖에서 곧바로 하는 일 (선택). {ok: false, error: "까닭"}을 돌려주면 그 화면에 거절이 간다
  presence(room, seatId, on) { … },       // 그 자리의 화면이 끊김(false) / 돌아옴(true) (선택)
  reopen(room, seatId) { … },             // 끝난 방을 이 자리가 다시 열어도 되는가 (선택). false나 {ok: false, error}면 거절. 없으면 방을 만든 사람만
  texts: {phase_duplicate: "이미 골랐어요.", room_full: info => `자리가 다 찼어요 (${info.max}명).`}   // 거절 글을 게임의 말로 (선택, 아래 '거절의 이름')
});
```
| `room.` | 뜻 |
|---|---|
| `state` | 게임의 것. 서버에만 있다. 화면에는 `view`가 돌려준 것만 간다 |
| `seats()` · `seat(id)` | `{id: "s1", name, host, on}` — 들어온 차례대로. `on`이 거짓이면 끊긴 자리(자리는 비지 않는다) |
| `phase(name, {seats, seconds, done, showWaiting})` | 단계 하나를 연다: `seats`(기본 모두)가 저마다 뜻 하나를 낸다. **모두 냈거나, `seconds`가 지났거나, `closePhase()`를 부르면** 닫히고 `done(intents, {timeout, missing, raw, name})`을 부른다. `intents`는 `{자리 id: 뜻}` — 내지 않은 자리는 없다('아무것도 하지 않음'). 한 번에 한 단계만. `seats: []` + `seconds`는 시간만 재는 단계. `showWaiting`이 참이면 아직 안 낸 자리 목록이 모든 화면에 간다 |
| `phase`의 `check(seatId, intent)` | 뜻을 받을 때 게임이 살핀다: 아무것도 돌려주지 않으면 받고, `"까닭"`을 돌려주면 그 글로 거절한다(그 자리는 다시 낼 수 있다) |
| `phase`의 `showWaiting` | `true`: 아직 안 낸 자리의 id 목록이 **모든 화면**에 간다 — 단계에 드는 자리가 숨은 것으로 갈리는 게임에서는 쓰지 않는다. `"count"`: 수만 간다(`waitingCount`) |
| `current` · `closePhase()` | 열린 단계 `{name, seats, waiting, left, intents}` 또는 null — `intents`는 지금까지 낸 뜻 `{자리 id: 뜻}`(규칙이 `view`에서 골라 내보낼 때 쓴다) · 지금 닫기 |
| `reopen()` · `round` | 끝난 판(`end` 뒤)을 기다리는 방으로 되돌린다 · 이 방의 몇째 판인가(1부터) |
| `tell(to, data)` | 일 하나를 `to`("all" · 자리 id · 목록)에게만 보내고 방의 기록에 차례대로 남긴다. 다시 들어온 화면은 제가 받았던 것을 다시 받는다 |
| `end(result)` | 판을 끝낸다. `result`는 모든 화면에 간다 |
| `random()` · `seed` · `engine` | 방의 씨앗 난수 · 그 씨앗 · 방마다의 엔진(`engine.phase` `engine.actors` `engine.knowledge` `engine.timer`) |
| `data(path)` · `refresh()` | 게임 자료 파일 읽기 · (타이머 같은 데서 상태를 바꾼 뒤) 화면에 새 소식 보내기 |

- 단계의 뜻은 `engine.actors`의 새 입력원 **"room"** 으로 `engine.phase`에 들어간다(자리 열쇠를 확인한 뒤에만). 뜻은 단계당 하나, 늦거나 둘째 것은 거절된다.
- 채팅 글은 고치지 않고 전한다(빈 글·500자 넘는 글은 받지 않음). 받을 자리는 `chat`이 돌려준 것뿐이다. 화면이 보낸 `to`는 '바라는 것'일 뿐이다.
- `act`와 `chat`은 판이 진행 중일 때와 끝난 뒤(`room.status === "over"`)에 게임에 온다. 기다리는 방에서는 받지 않는다.
- 방의 엔진에는 `phase` `actors` `knowledge` `timer` `state` `korean` `cond` `match`가 실린다(`room.engine.korean.josa(…)`).
- 규칙 코드가 오류를 내면 방은 죽지 않고, 까닭이 서버 기록과 모든 화면의 `fault`에 남는다.

## 게임이 쓰는 이름 ② 화면 쪽 — 브라우저마다 돈다 (`engine.room`)
```js
const r = await engine.room.create("부를 이름");        // → {ok, room: "K7QM", seat: "s1"} 또는 {ok: false, error}
const r = await engine.room.join("k7qm", "부를 이름");  // 방 이름은 대소문자를 가리지 않는다
const r = await engine.room.resume();                   // 주소에 ?room=&seat=가 있고 이 브라우저에 그 자리 열쇠가 있으면 같은 자리로
await engine.room.start();                               // 방을 만든 사람만
await engine.room.submit(뜻);                            // 열린 단계에 내 뜻 하나
await engine.room.act(행동);  await engine.room.chat("글", "all" 또는 [자리 id…]);
await engine.room.reopen();                              // 끝난 방을 기다리는 방으로 (같은 사람들, 같은 방 이름)
engine.room.leave();                                     // 나간다: 이 브라우저에서 자리 열쇠를 지우고, 기다리는 방이면 자리가 곧바로 비워진다
engine.bus.on("room", now => …);                         // 새 소식 (아래)
engine.bus.on("room:event", (ev, old) => …);             // 일 하나: {i, type: "chat", from, name, text, to, tag?} 또는 {i, type: "tell", data, to} — old: 다시 들어와 받은 지난 일
engine.bus.on("room:gone", (까닭, 이름) => …);           // 방이 없다 (서버가 다시 켜짐: "room_gone") · 내 자리가 비워졌다 ("seat_gone")
engine.bus.on("room:reopened", 판 => …);                 // 끝난 방이 다시 열렸다: 지난 판의 일은 더 오지 않는다 (화면의 기록을 비울 때)
engine.bus.on("room:offline", 끊김 => …);
engine.room.left();                                      // 열린 단계의 남은 초 (모든 화면이 같은 값)
```
새 소식 `now`: `{room, game, status: "lobby" | "play" | "over", round, min, max, me, host, seats: [{id, name, host, on}], phase: {name, left, seconds, mine, sent, own, waiting?, waitingCount?} | null, view, result, fault}`
— `phase.mine`: 내가 이 단계에서 뜻을 내는 자리인가 · `phase.sent`: 이미 냈는가 · `phase.own`: 내가 낸 뜻(내 화면에만) · `view`: 규칙의 `view(room, 내 자리)`가 돌려준 것 · `round`: 이 방의 몇째 판.

## 기다리는 방 · 끝난 뒤
- **나간 자리는 비워진다(기다리는 방에서만).** `leave()`는 곧바로. 창을 닫거나 사라진 자리는 "끊김"으로 보이다가 20초(`--lobby-grace`) 뒤에 비워진다 — 그 안에 같은 주소로 돌아오면(새로고침) 제 자리다. 방이 가득 찼을 때 새 사람이 오면 끊긴 자리를 곧바로 내준다. [시작]을 누를 때 끊겨 있는 자리는 판에 끼지 않는다(나눔을 받지 않는다). 비워진 자리의 열쇠는 더 통하지 않는다(`seat_gone`). 자리 id는 다시 쓰지 않는다(s1, s2, s4 …처럼 빈 번호가 생길 수 있다).
- 방을 만든 사람이 나가면 남은 사람 가운데 먼저 들어온 사람이 시작을 맡는다. 아무도 남지 않으면 방을 닫는다.
- **끝난 방 다시 열기.** `room.end()` 뒤에 화면의 `engine.room.reopen()`(또는 규칙의 `room.reopen()`)이 방을 기다리는 방으로 되돌린다: 같은 자리·같은 열쇠·같은 방 이름, `room.state`는 비고, 지난 판의 일은 다시 오지 않고, 방 이름으로 새 사람이 들어올 수 있고, [시작]으로 새 판을 연다. 방을 만든 사람의 화면이 없으면 남은 사람이 열 수 있고 그 사람이 시작을 맡는다. 판 중(시작 뒤 ~ 끝 앞)에는 새 사람이 들어올 수 없다.

## 컴퓨터가 맡는 자리 · 방의 규칙이 AI를 부르는 길 (ROOM-3)
```
python -m server.play --game <게임> --ai on --open     # 혼자 하는 판: 이 컴퓨터 안에서만 열고, 방의 규칙이 AI(구독 명령줄)를 부를 수 있고, 브라우저를 연다
python -m server.play --game <게임>                    # --ai를 주지 않으면 꺼짐: 방의 규칙이 물으면 곧바로 '답 없음'
python -m server.play --game <게임> --ai fake          # 가짜 답(게임이 room.ai.fake로 정한 것) · --ai fail = 장애 흉내 — AI를 부르지 않는다
```
- `--ai`(off가 아닌 것)는 이 컴퓨터 안에서만 열 때만 된다. `--host`로 바깥에 열면서 주면 서버가 뜨지 않는다: "바깥에 여는 서버에서는 AI를 켤 수 없습니다".
- 화면이 서버의 AI를 바로 부르는 길은 놀이용 서버에 없다. AI는 방의 규칙(서버)만 부른다.

**컴퓨터 자리** — 규칙에 `bot`을 적은 게임만:
```js
WebEngine.room({ …,
  bot: {
    name(room, n, taken) { return "이름"; },          // 컴퓨터 자리의 이름은 게임이 정한다 (없거나 겹치면 "컴퓨터 n")
    decide(view, ctx) { return 뜻; },                  // 그 자리의 보기(view(room, 그 자리)가 돌려준 것)만 받는다. ctx: {id, phase, pick(table)}. 방의 상태·남의 보기는 오지 않는다
    delay: 0                                           // 단계가 열린 뒤 몇 초에 내는가 (수 또는 생략 = 곧바로). 단계마다 phase의 bots로 덮는다
  } });
room.phase(name, {…, closeOn: "humans", bots: seatId => 초});   // closeOn "humans": 사람 자리가 모두 내면 닫는다(그때 안 낸 컴퓨터 자리는 그 자리에서 낸다) · bots: 초 | 자리 => 초 | false(저절로 내지 않음)
room.say(컴퓨터자리, "글", "all" 또는 [자리…]);       // 컴퓨터 자리의 채팅: 사람의 채팅과 같은 길(규칙의 chat이 받을 자리를 정함), 같은 기록. 사람 자리에는 쓸 수 없다(오류)
room.after(초, () => { … });                           // 방의 시계로 나중에 (돌려주는 함수를 부르면 거둔다)
```
- 넣고 빼기: 화면의 `await engine.room.addBot()` · `await engine.room.removeBot(자리 id?)` — 방을 만든 사람만, 기다리는 방에서만(`no_bots` `not_host` `not_lobby` `room_full` `no_such_bot`). 사람 수 위아래에 자리 하나로 센다.
- 자리 목록의 `bot: true`가 모든 화면에 간다(`now.seats[i].bot`, 규칙의 `room.seats()`에도). `now.bots`: 이 게임에 컴퓨터 자리가 있는가.
- 컴퓨터 자리의 뜻은 엔진 `actors`의 봇 길로 들어간다(들어온 길 이름 "bot" — 사람은 "room"). `decide`가 오류를 내면 그 자리는 '아무것도 하지 않음'이고 까닭이 서버 기록에 남는다. 판은 멈추지 않는다.
- 끝난 방을 다시 열어도 컴퓨터 자리는 남는다. 사람 자리가 하나도 없으면(모두 끊김) 그 방의 AI 물음은 '답 없음'이 되고 5분 뒤 방을 닫는다.

**방의 규칙이 쓰는 AI 도구** — `room.ai`는 화면 쪽 `engine.ai`와 같은 이름·같은 쓰는 법이다(`TALK.md`): `propose` `narrate` `speakAs` `check` `fake` `calls`.
```js
room.ai.speakAs({persona, knows, hide, say, question, fallback, limitSeconds}).then(r => room.say(자리, r.text));   // r: {text, usedFallback, seconds, reason}
room.ai.mode    // "off" | "on" | "fake" | "fail" (서버를 띄운 방식)
room.ai.stats   // 이 판(시작부터 끝까지)의 {asked 물은 수, sent 보낸 수, answered 답 받은 수, blocked 한도에 막힌 수, failed 답 없음, seconds 걸린 초, limit 번수 한도}
```
- 답을 기다리는 동안 판은 멈추지 않는다(단계·채팅·시계가 돈다). 답이 없으면(꺼짐·장애·한도·늦음·버린 답) 도구가 게임의 틀 글(`fallback`)을 돌려준다.
- **한 판 한도는 게임의 값**이다 — `project.json › settings › ai_limits`: `"한판"`(원어치, 엔진의 기존 한도. 기본 `ai.json`의 10) · `"한판_호출"`(한 판에 보낼 수 있는 물음 수. 없으면 번수 한도 없음). 한도에 닿으면 AI를 부르지 않고 '답 없음'(`reason: "상한에 닿음"`)을 돌려주고 `blocked`가 1 오른다. 끝난 방을 다시 열어 새 판을 시작하면 셈이 새로 시작된다.
- 호출 기록은 엔진의 것 그대로 `logs/ai_calls.jsonl`: 판마다 `session: "play:room:<방 이름>:<몇째 판>"`, 판의 시작·끝 줄(`role: "판"`, 끝 줄에 물은 수·막힌 수·걸린 초), 물음마다 한 줄(막힌 것은 `budget: true`).
- `room.record(묶음)` → 참/거짓: 게임이 준 묶음(JSON)을 이 컴퓨터의 `logs/room_records/<게임 폴더 이름>.jsonl`에 한 줄로 덧붙인다. 서버가 이 컴퓨터 안에서만 열렸을 때만 된다(아니면 거짓). 화면에서 바로 쓰는 길은 없다 — 규칙의 `act` 같은 데서 부른다.

## 보는 사람 · 관전 방 (ROOM-4, 2026-11-26)
컴퓨터 자리끼리만 하는 판을 사람이 보는 방이다. 규칙에 `bot`과 `watch`를 적은 게임만 열 수 있다(`info`의 `watch: true`).
```js
WebEngine.room({ …, bot: {…},
  watch(room) { return {…}; }      // 보는 사람의 보기 — 판 전체(모든 직업·모든 대화·밤 행동 등, 무엇을 넣을지는 게임이 정한다)
});
await engine.room.create("부를 이름", {watch: true});    // 관전 방을 만든다. 만든 사람은 방장(컴퓨터 자리를 넣고 빼고 시작한다)이지만 자리는 아니다
await engine.room.join("K7QM", "부를 이름", {watch: true}); // 관전 방에 보기로 들어온다(판 중에도 된다)
```
- **관전 방에는 사람 자리가 없다.** 사람 자리로 들어오려 하면 `watch_only`, 사람이 하는 방에 보기로 들어오려 하면 `not_watch_room`. 보는 사람은 모든 것을 보므로, 판에 낀 사람과 한 방에 두지 않는다.
- 보는 사람은 자리가 아니다: 나눔을 받지 않고, 사람 수 위아래에 들지 않고, `room.seats()`에도 없다. 뜻·행동·채팅은 받지 않는다(`watching`). 시작·다시 열기·컴퓨터 자리 넣고 빼기는 방장인 보는 사람이 한다.
- 새 소식 `now`: `watching: true`, `watchers`(지금 보는 사람 수), `me`(보는 사람 id, `w1` …), `view`는 규칙의 `watch(room)`이 준 것, `events`는 모든 사건.
- 보는 사람이 하나라도 화면을 열어 두면 방의 AI가 물음을 보낸다(사람 자리와 같다). 보는 사람이 `leave()`하면 곧바로 나간다 — 마지막 사람이 나가면 방이 닫힌다(AI도 멈춘다). 창을 닫으면 끊김으로 남고, 아무도 없으면 AI는 묻지 않고, 300초(`--emptyclose`) 뒤에 방이 닫힌다.
- 보는 사람은 한 방에 20명까지(`watch_full`).
## 거절의 이름
모든 거절은 `{ok: false, code, error}`다. `code`는 바뀌지 않는 이름, `error`는 방 도구의 글('-습니다')이다. 게임은 `texts: {code: "글" 또는 info => "글"}`로 글을 제 말로 바꾸거나, 화면에서 `code`로 갈라 제 글을 낸다. 엔진 안쪽의 말(단계·행위자·의도)은 화면에 가지 않는다.
| code | 언제 (info) |
|---|---|
| `name_empty` `name_long`(max) `name_taken` | 부를 이름 |
| `room_gone`(room) `room_started` `room_over` `room_full`(max) `rooms_limit` | 들어가기·만들기 |
| `no_key` `seat_gone`(room) `no_key_here`(화면 쪽: 이 브라우저에 열쇠 없음) | 자리 열쇠 |
| `not_host` `already_started` `too_few`(min, now) | 시작 |
| `not_playing` `game_over` `no_phase` `phase_late` `phase_not_actor` `phase_duplicate` `phase_refused`(게임의 `check`가 준 글) | 뜻 |
| `no_act` `act_refused`(게임이 준 글) · `chat_empty` `chat_long`(max) `no_chat` `chat_refused` | 행동 · 채팅 |
| `not_over` `cannot_reopen`(게임이 준 글) | 다시 열기 |
| `no_watch` `watch_only` `not_watch_room` `watch_full`(max) `watching` | 보는 사람 · 관전 방 |

- 자리 열쇠는 그 브라우저(localStorage, 방 이름과 자리마다)에만 남는다. 주소에는 `?room=&seat=`만 있다 — 같은 브라우저에서 같은 주소를 다시 열면 같은 자리로 돌아오고, 주소만 아는 다른 브라우저는 앉지 못한다.
- 한 브라우저의 창 여럿(한 기계에서 해 볼 때)도 된다: 브라우저는 한 서버에 요청을 여섯까지만 열어 두므로, 창 셋까지만 소식을 기다리는 요청을 열어 두고 나머지 창은 0.3초마다 묻는다(저절로 정해진다 — 그런 창은 소식이 1초 안쪽으로 늦을 수 있다).

## 서버가 지키는 것
- 화면이 보낸 것에서 믿는 것은 자리 열쇠 하나다. 자리 이름·역할·상태는 받지 않는다. 열쇠 없이 온 뜻·채팅·시작은 받지 않고 까닭을 서버 기록(`logs/room.log`, 채팅 글과 열쇠는 적지 않음)에 남긴다.
- 끊긴 자리는 비우지 않는다. 다른 화면에 `on: false`로 알리고, 그 자리의 뜻은 시간이 되면 '없음'으로 넘어간다. 방을 만든 사람이 끊겨도 판은 서버가 이어 간다.
- 판 중인 방에는 새로 들어올 수 없다. 30분 동안 아무도 오지 않은 방은 닫는다.

## 바깥에 열 때
`--host`의 기본은 이 기계 안(127.0.0.1)이다. 바깥에는 이 서버 앞에 암호로 싸는 길(https)을 두고 연다 — 채팅과 자리 열쇠가 오간다. 편집기 서버(`server.app`)는 바깥에 열지 않는다.

## 아직 없는 것
서버가 꺼져도 남는 방 · 방 목록 · 사람이 하는 판을 구경하는 자리 · 판 중에 들어오기(보는 사람 말고) · 한 주소에서 오는 요청 수 막기.
