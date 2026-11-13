// 퀴즈 진행: 문제를 차례로 보여 주고, '답' 신호로 답을 받아 점수를 매긴다. 끝나면 '결과' 화면으로.
WebEngine.script("퀴즈진행", class extends WebEngine.Component {
  static title = "퀴즈 진행";
  static help = "문제를 보여 주고 답을 받는다";
  static props = {문제들: {type: "list", default: [], label: "문제 목록", help: "[{q: 문제, a: [보기들], 정답: 번호(0부터)}]"}};

  start() {
    this.i = 0;
    this.engine.state.set("점수", 0);
    this.engine.bus.on("답", n => this.answer(n), this);
    this.show();
  }

  show() {
    const p = this.props.문제들[this.i];
    this.scene.find("문제").get("Text").set(`${this.i + 1}. ${p.q}`);
    ["답1", "답2", "답3"].forEach((name, k) => { this.scene.find(name).get("Button").props.label = p.a[k] || ""; });
    this.scene.find("점수").get("Text").set(`점수 ${this.engine.state.get("점수")}`);
  }

  answer(n) {
    if (this.locked) return;
    const p = this.props.문제들[this.i], ok = n === p.정답;
    if (ok) this.engine.state.add("점수", 1);
    this.engine.audio.beep(ok ? 880 : 220);
    this.scene.find("점수").get("Text").set(ok ? "정답!" : "아쉬워요");
    this.locked = true;
    this.engine.timer.after(0.6, () => {
      this.locked = false;
      this.i++;
      if (this.i >= this.props.문제들.length) { this.engine.state.set("문제수", this.props.문제들.length); this.engine.change("결과"); }
      else this.show();
    }, this);
  }
});
