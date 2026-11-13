// 엔진 본보기 「함께 하는 방」의 화면 — 브라우저마다 돈다. engine.room으로 방을 만들고, 들어가고, 제 자리의 보기만 그린다.
// 판의 상태는 여기 없다: 서버가 보낸 소식(engine.bus의 "room")과 일(“room:event”)을 그릴 뿐이다.
WebEngine.script("함께판화면", class extends WebEngine.Component {
  static title = "함께 하는 방 본보기 화면";
  static help = "처음 화면 · 기다리는 방 · 판 화면을 소식에 맞춰 바꿔 보인다";

  start() {
    const f = p => this.node.find(p);
    this.first = f("처음"); this.wait = f("대기"); this.board = f("판");
    this.feed = f("판/이야기").get("Feed"); this.choices = f("판/선택지").get("Choices");
    this.to = new Set(); this.shown = ""; this.seatsKey = ""; this.notice = "";
    const room = this.engine.room, bus = this.engine.bus;
    const name = () => f("처음/이름칸").get("TextInput").props.value;
    const answer = r => { if (r && !r.ok) this.say(r.error || "하지 못했습니다."); };

    f("처음/만들기").on("click", async () => answer(await room.create(name())), this);
    f("처음/들어가기").on("click", async () => answer(await room.join(f("처음/방이름칸").get("TextInput").props.value, name())), this);
    f("대기/시작").on("click", async () => { const r = await room.start(); if (!r.ok) f("대기/안내").get("Text").set(r.error); }, this);
    const home = () => { room.leave(); this.feed.clear(); this.to.clear(); this.say(""); this.draw(null); };
    f("대기/나가기").on("click", home, this);
    f("대기/컴퓨터넣기").on("click", async () => { const r = await room.addBot(); if (!r.ok) f("대기/안내").get("Text").set(r.error); }, this);
    f("대기/컴퓨터빼기").on("click", async () => { const r = await room.removeBot(); if (!r.ok) f("대기/안내").get("Text").set(r.error); }, this);
    f("판/기록단추").on("click", async () => { const r = await room.act({type: "record"}); if (!r.ok) this.feed.say({kind: "note", text: r.error}); }, this);
    f("판/끝단추").on("click", home, this);
    f("판/한판더").on("click", async () => { const r = await room.reopen(); if (!r.ok) this.feed.say({kind: "note", text: r.error}); }, this);
    bus.on("room:reopened", () => { this.feed.clear(); this.to.clear(); this.shown = ""; this.seatsKey = ""; }, this);   // 방이 다시 열렸다: 새 판, 빈 기록
    f("판/입력").on("submit", async text => {
      const r = await room.chat(text, this.to.size ? [...this.to] : "all");
      if (!r.ok) this.feed.say({kind: "note", text: "보내지 못함: " + r.error});
    }, this);
    this.choices.node.on("pick", async hit => {
      const r = await room.submit({pick: hit.id});
      if (!r.ok) this.feed.say({kind: "note", text: "받지 않음: " + r.error});
    }, this);

    bus.on("room", now => this.draw(now), this);
    bus.on("room:event", ev => this.line(ev), this);
    bus.on("room:gone", why => { this.feed.clear(); this.say(why); this.draw(null); }, this);
    bus.on("room:offline", off => { this.offline = off; }, this);
    this.draw(null);
    this.engine.watch(room.resume().then(r => { if (!r.ok && r.error) this.say(r.error); }), this.where(), "다시 들어오기");
  }
  say(text) { this.notice = text; this.node.find("처음/알림").get("Text").set(text); }
  show(which) { for (const n of [this.first, this.wait, this.board]) n.get("Transform").props.visible = n === which; }
  nameOf(id) { const s = ((this.engine.room.now || {}).seats || []).find(x => x.id === id); return s ? s.name : id; }

  // 일 한 줄: 채팅(받은 사람이 모두가 아니면 누구에게 갔는지 붙인다) 또는 알림(나에게만 온 것은 표시한다).
  line(ev) {
    const me = this.engine.room.seat;
    if (ev.type === "chat") {
      const only = ev.to === "all" ? "" : ` → ${ev.to.filter(id => id !== ev.from).map(id => this.nameOf(id)).join(", ")}에게만`;
      this.feed.say({who: ev.name + only, text: ev.text, kind: ev.from === me ? "me" : "say"});
    } else this.feed.say({kind: "note", text: (ev.to === "all" ? "" : "(나에게만) ") + ((ev.data || {}).text || "")});
  }

  draw(now) {
    const f = p => this.node.find(p);
    if (!now) return this.show(this.first);
    if (now.status === "lobby") {
      this.show(this.wait);
      f("대기/방이름").get("Text").set(now.room);
      f("대기/사람수").get("Text").set(`들어온 사람 ${now.seats.length}명 (${now.min}~${now.max}명이 함께 합니다)`);
      f("대기/사람들").get("Text").set(now.seats.map((s, i) => `${i + 1}. ${s.name}${s.bot ? " (컴퓨터)" : ""}${s.host ? " (방을 만든 사람)" : ""}${s.id === now.me ? " ← 나" : ""}${s.on ? "" : " · 끊김"}`).join("\n"));
      f("대기/시작").get("Transform").props.visible = now.host;
      f("대기/컴퓨터넣기").get("Transform").props.visible = now.host && now.bots;
      f("대기/컴퓨터넣기").get("Button").props.disabled = now.seats.length >= now.max;
      f("대기/컴퓨터빼기").get("Transform").props.visible = now.host && now.bots && now.seats.some(s => s.bot);
      f("대기/시작").get("Button").props.disabled = now.seats.length < now.min;
      if (!now.host) f("대기/안내").get("Text").set("방을 만든 사람이 [시작]을 누르면 판이 시작됩니다.");
      else f("대기/안내").get("Text").set(now.seats.length < now.min ? `${now.min}명부터 시작할 수 있습니다.` : "모두 들어왔으면 [시작]을 누르세요.");
      return;
    }
    this.show(this.board);
    const v = now.view || {};
    f("판/숨은숫자").get("Text").set(`내 숨은 숫자\n${v.secret ?? "?"}`);
    f("판/끝단추").get("Transform").props.visible = now.status === "over";
    const t = v.talk;
    f("판/AI줄").get("Text").set(t && now.seats.some(s => s.bot) ? `컴퓨터 자리의 말 ${t.said} · 미리 써 둔 말 ${t.fallback} · AI ${{off: "꺼짐", on: "켜짐", fake: "가짜 답", fail: "장애 흉내"}[t.mode] || t.mode}: 물음 ${t.asked}, 한도에 막힘 ${t.blocked}${t.limit != null ? ` (한 판 ${t.limit}번까지)` : ""}` : "");
    f("판/한판더").get("Transform").props.visible = now.status === "over";
    // 사람들: 누르면 '받을 사람'에 넣거나 뺀다
    const waiting = now.phase && now.phase.waiting ? now.phase.waiting : null;
    const key = JSON.stringify([now.seats, waiting, [...this.to], now.me]);
    if (key !== this.seatsKey) {
      this.seatsKey = key;
      const box = f("판/사람들");
      [...box.children].forEach(c => c.destroy());
      for (const s of now.seats) {
        const mark = (s.on ? "" : " · 끊김") + (waiting ? (waiting.includes(s.id) ? "" : " · 고름") : "");
        const b = box.add({name: s.id, components: [{type: "Transform", props: {w: 0, h: 31}},
          {type: "Button", props: {label: `${this.to.has(s.id) ? "☑" : "☐"} ${s.name}${s.bot ? " (컴퓨터)" : ""}${s.id === now.me ? " (나)" : ""}${mark}`, size: 14, color: this.to.has(s.id) ? "#2f4470" : "#262b36", disabled: s.id === now.me}}]});
        b.on("click", () => { if (this.to.has(s.id)) this.to.delete(s.id); else this.to.add(s.id); this.draw(this.engine.room.now); }, this);
      }
      f("판/받는이").get("Text").set("채팅을 받을 사람: " + (this.to.size ? [...this.to].map(id => this.nameOf(id)).join(", ") + "에게만" : "모두에게"));
    }
    // 고를 것: 내가 이 단계에서 아직 고르지 않았을 때만
    const want = now.status === "play" && now.phase && now.phase.mine && !now.phase.sent ? now.phase.name : "";
    if (want !== this.shown) {
      this.shown = want;
      this.choices.show(want ? (v.options || []).map(o => ({id: o, label: `'${o}'를 고른다`})) : []);
    }
    if (now.fault) this.feed.say({kind: "note", text: "규칙 오류: " + now.fault});
  }

  update() {
    const room = this.engine.room, now = room.now;
    if (!now || now.status === "lobby") return;
    const left = room.left();
    const head = now.status === "over" ? "판이 끝났습니다" : now.phase ? `${now.phase.name}${now.phase.mine ? (now.phase.sent ? ` · '${(now.phase.own || {}).pick}'를 골랐음, 다른 사람을 기다림` : " · 고르세요") : ""}` : "";
    const text = `방 ${now.room} · ${head}${left != null ? ` · 남은 시간 ${Math.ceil(left)}초` : ""}${this.offline ? " · 서버와 끊김, 다시 잇는 중" : ""}`;
    if (text !== this.head) { this.head = text; this.node.find("판/윗줄").get("Text").set(text); }
  }
});
