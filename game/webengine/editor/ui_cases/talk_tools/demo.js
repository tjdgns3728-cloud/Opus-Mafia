// 엔진 본보기: 글로 주고받는 이야기 부품(이야기 칸 · 번호 선택지 · 막대 · 그림 위 구역)과 engine.ai의 세 도구
// (propose · narrate · speakAs)를 한 화면에서 써 본다. 어느 게임의 것도 아닌 작은 장면이다.
// 주소 옵션: talk_ai=fake → 정해 둔 가짜 답으로 돈다 (AI를 부르지 않음. 일부러 틀린 답도 섞여 있다 — 엔진이 버리는지 보려고)
//            ai=fail      → AI가 죽은 것처럼 돈다 (같은 자리에 틀 글이 나와야 한다)
//            옵션 없음     → 엔진 서버의 실제 AI (구독 명령줄)
WebEngine.script("이야기본보기", class extends WebEngine.Component {
  static title = "이야기 본보기";
  static help = "이야기 칸·번호 선택지·막대·그림 위 구역·engine.ai 세 도구를 한 화면에서 써 보는 본보기";
  static props = {
    쉬는양: {type: "number", default: 2, label: "쉬면 오르는 기운", help: "'잠깐 쉰다'를 고르면 막대가 이만큼 오른다", unit: "칸", min: 0, max: 5},
    드는양: {type: "number", default: 1, label: "두드리면 드는 기운", help: "'문을 두드린다'를 고르면 막대가 이만큼 내린다", unit: "칸", min: 0, max: 5}};

  start() {
    const f = n => this.scene.find(n);
    this.feed = f("이야기").get("Feed"); this.choices = f("선택지").get("Choices"); this.gauge = f("막대").get("Gauge");
    this.spots = f("지도"); this.log = f("기록").get("Text"); this.busy = false;
    this.NAMES = ["길잡이", "가람", "나래"];                                   // 이 장면에 있는 모든 이름 (엔진은 이름을 모른다)
    this.FORBID = ["틀림없이", {pattern: "당신(은|이)\\s?[^.]{0,20}(생각|느꼈)"}];   // 이 장면이 정한 금지 표현
    this.ACTS = [
      {id: "look", label: "둘러본다", desc: "방 안을 천천히 본다", words: ["둘러", "살펴"], gain: 0,
       facts: ["탁자 위에 등불 하나가 켜져 있다.", "창문은 안쪽에서 잠겨 있다."]},
      {id: "knock", label: "문을 두드린다", desc: "기운이 조금 든다", words: ["두드", "노크"], gain: -this.props.드는양,
       facts: ["문을 두드리자 안에서 발소리가 났다.", "문은 열리지 않았다."]},
      {id: "rest", label: "잠깐 쉰다", desc: "기운이 돌아온다", words: ["쉰다", "쉬어", "쉬자"], gain: this.props.쉬는양,
       facts: ["의자에 앉아 숨을 골랐다.", "밖에서는 바람 소리만 들렸다."]},
      {id: "ask", label: "길잡이에게 묻는다", desc: "길잡이가 제 말로 대답한다", words: ["묻", "물어"], gain: 0}];
    this.PLACES = {well: ["우물의 두레박이 젖어 있다.", "우물가에 발자국이 한 줄 나 있다."], shed: ["창고 문에 자물쇠가 걸려 있다.", "자물쇠는 새것이다."],
                   bridge: ["다리 난간에 밧줄이 묶여 있다.", "밧줄 끝은 물에 잠겨 있다."]};
    if ((this.engine.opts.params || {}).talk_ai === "fake") this.engine.ai.fake(p => this.fakeAnswer(p));

    this.spots.get("Image").props.url = "data:image/svg+xml," + encodeURIComponent(this.picture());
    this.choices.node.on("pick", h => this.act(h.id), this);
    this.choices.node.on("hover", item => this.gauge.preview(item && item.gain ? (item.gain > 0 ? "up" : "down") : null, item ? Math.abs(item.gain) : 0), this);
    this.spots.on("pick", h => this.visit(h.zone), this);
    f("입력").on("submit", t => this.typed(t), this);
    this.engine.bus.on("ai:tool", () => this.showCalls(), this);
    this.engine.watch(this.open(), this.where(), "시작");
  }
  async open() {
    this.feed.say({who: "길잡이", text: "어서 오세요. 이 칸은 글을 한 글자씩 써 내려갑니다. 칸을 한 번 누르면 남은 글이 모두 보입니다."});
    await this.feed.say({text: "아래에서 번호를 누르거나 숫자 키를 치세요. 글로 써도 됩니다. 오른쪽 그림의 밝아지는 곳을 눌러도 됩니다."});
    this.offer();
  }
  offer() { this.busy = false; this.choices.show(this.ACTS); }

  // 고른 일을 한다. 일어난 일(사실)은 이 장면이 정하고, engine.ai.narrate는 그 사실을 글로 옮기기만 한다.
  async act(id) {
    const a = this.ACTS.find(x => x.id === id); if (!a) return;
    this.busy = true; this.choices.hide();
    if (a.id === "ask") return this.ask("여기는 어떤 곳입니까?");
    if (a.gain) this.gauge.set(this.gauge.value + a.gain);
    await this.tell(a.facts);
    this.offer();
  }
  async tell(facts) {
    const r = await this.engine.ai.narrate({facts, speaker: "길잡이", style: "차분하게, 세 줄 아래", names: this.NAMES, forbid: this.FORBID, fallback: facts.join(" "), limitSeconds: 60});
    if (r.usedFallback) this.feed.say({kind: "note", text: `길잡이가 지금 대답하지 못해 짧게 전한다 (${r.reason})`});
    await this.feed.say({who: "길잡이", text: r.text});
  }
  async ask(question) {
    const r = await this.engine.ai.speakAs({persona: "길잡이. 말수가 적고 공손하다.", knows: ["이 방은 길손이 쉬어 가는 곳이다.", "문은 해가 지면 잠근다."],
      hide: [{text: "열쇠는 길잡이의 주머니에 있다.", words: ["열쇠", "주머니"]}], say: ["이곳은 길손이 쉬어 가는 방입니다."], question, names: this.NAMES, forbid: this.FORBID,
      fallback: "이곳은 길손이 쉬어 가는 방입니다."});
    if (r.usedFallback) this.feed.say({kind: "note", text: `길잡이가 지금 대답하지 못해 짧게 전한다 (${r.reason})`});
    await this.feed.say({who: "길잡이", text: r.text});
    this.offer();
  }
  // 글로 쓴 것: 허락된 후보 가운데 하나로 옮기고(engine.ai.propose), "이렇게 할까요?"에 누른 뒤에만 한다.
  async typed(text) {
    if (this.busy) return;
    this.busy = true;
    this.feed.say({kind: "me", text});
    const p = await this.engine.ai.propose(text, this.ACTS);
    if (!p) { await this.feed.say({kind: "note", text: "그 글을 할 수 있는 일로 옮기지 못했다. 아무 일도 일어나지 않았다. 번호로 골라 주세요."}); return this.offer(); }
    const yes = await this.choices.confirm(p.candidate.label);
    if (!yes) { await this.feed.say({kind: "note", text: "하지 않았다."}); return this.offer(); }
    return this.act(p.candidateId);
  }
  async visit(zone) {
    if (this.busy) return;
    this.busy = true; this.choices.hide();
    this.feed.say({kind: "note", text: `${zone.label} 쪽을 본다`});
    await this.tell(this.PLACES[zone.id] || [`${zone.label}에는 눈에 띄는 것이 없다.`]);
    this.offer();
  }
  showCalls() {
    const NAME = {propose: "글 → 후보", narrate: "사실 → 이야기", speakAs: "인물의 대답"};
    this.log.set("AI 도구 기록 (걸린 시간)\n" + this.engine.ai.calls.slice(-7).map(c => `· ${NAME[c.tool]} ${c.seconds.toFixed(2)}초 — ${c.usedFallback ? "AI 답 아님: " + c.reason : "AI 답"}`).join("\n"));
  }

  // 정해 둔 가짜 답 (talk_ai=fake). 맞는 답과 틀린 답이 섞여 있다: 틀린 답은 엔진이 버려야 한다.
  async fakeAnswer(prompt) {
    await new Promise(ok => setTimeout(ok, 350));
    if (prompt.includes('"candidates"')) {
      const t = (/"text":"([^"]*)"/.exec(prompt) || [])[1] || "";
      return t.includes("두드") ? '{"candidateId":"knock"}' : t.includes("쉬") ? '{"candidateId":"rest"}' : t.includes("날아") ? '{"candidateId":"fly"}' : "null";
    }
    if (prompt.includes("등불 하나가")) return "탁자 위에서 등불 하나가 조용히 타고 있습니다. 창문은 안쪽에서 잠겨 있습니다.";
    if (prompt.includes("발소리가 났다")) return "문을 두드리자 안에서 발소리가 났습니다. 나래가 문 뒤에 서 있는 모양입니다.";      // 준 적 없는 이름 → 버려져야 함
    if (prompt.includes("숨을 골랐다")) return "의자에 앉아 숨을 골랐습니다. 밖에서는 바람 소리만 들렸습니다.";
    if (prompt.includes("두레박")) return "우물의 두레박이 젖어 있습니다. 우물가에는 발자국이 한 줄 나 있습니다.";
    if (prompt.includes("자물쇠")) return "창고 문에는 틀림없이 누군가 새 자물쇠를 걸어 두었습니다.";                              // 금지 표현 → 버려져야 함
    if (prompt.includes("밧줄")) return "다리 난간에 밧줄이 묶여 있습니다. 밧줄 끝은 물에 잠겨 있습니다.";
    if (prompt.includes("인물:")) return "이곳은 길손이 쉬어 가는 방입니다. 문은 해가 지면 잠급니다.";
    return null;
  }
  picture() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 230"><rect width="340" height="230" fill="#22303a"/>
      <path d="M0 150 Q170 110 340 160 V230 H0Z" fill="#1a2630"/><path d="M180 120 L330 150 L310 215 L165 190Z" fill="#2c4a5c"/>
      <circle cx="75" cy="80" r="34" fill="#3b4b57" stroke="#8a9aa6" stroke-width="5"/><circle cx="75" cy="80" r="18" fill="#101820"/>
      <rect x="205" y="28" width="96" height="62" fill="#5a4a3a"/><path d="M197 30 L253 6 L309 30Z" fill="#7a5c40"/><rect x="243" y="56" width="20" height="34" fill="#2a2018"/>
      <path d="M190 150 L300 172" stroke="#c9b38a" stroke-width="9"/><path d="M186 162 L296 186" stroke="#a8946e" stroke-width="5"/>
      <path d="M20 170 L70 150 L110 200 L40 215Z" fill="#39424a"/>
      <g font-family="sans-serif" font-size="13" fill="#e8e6e1"><text x="58" y="134">우물</text><text x="238" y="106">창고</text><text x="232" y="212">다리</text><text x="48" y="190">벼랑</text></g></svg>`;
  }
});
