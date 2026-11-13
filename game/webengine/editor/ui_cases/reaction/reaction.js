// 반응 속도 재기: 기다렸다가 버튼이 초록으로 바뀌면 누른다(스페이스바도 됨). 가장 빠른 기록을 저장한다.
WebEngine.script("반응속도", class extends WebEngine.Component {
  static title = "반응 속도 재기";
  static help = "무작위로 기다린 뒤 '지금 누르세요!'가 되면 누른다. 최고 기록은 저장된다";
  static props = {
    최소대기: {type: "number", default: 1, label: "최소 기다림 (초)"},
    최대대기: {type: "number", default: 2, label: "최대 기다림 (초)"}
  };

  start() {
    this.engine.state.load("기록");
    this.btn = this.node.get("Button");
    this.info = this.scene.find("안내").get("Text");
    this.node.on("click", () => this.press(), this);
    this.engine.bus.on("key", k => { if (k === "Space") this.press(); }, this);
    this.ready();
  }

  ready() {
    this.phase = "wait";
    this.btn.props.label = "기다리세요…";
    this.btn.props.color = "#7a2e2e";
    const wait = this.props.최소대기 + this.engine.random() * (this.props.최대대기 - this.props.최소대기);
    this.cancel = this.engine.timer.after(wait, () => {
      this.phase = "go";
      this.t0 = this.engine.time;
      this.btn.props.label = "지금 누르세요!";
      this.btn.props.color = "#2e7a45";
      this.engine.audio.beep(990);
    }, this);
  }

  press() {
    if (this.phase === "wait") { this.cancel(); this.info.set("너무 빨랐어요! 다시 기다리세요"); return this.ready(); }
    if (this.phase !== "go") return;
    const ms = Math.round((this.engine.time - this.t0) * 1000);
    const best = this.engine.state.get("최고", null);
    if (best === null || ms < best) { this.engine.state.set("최고", ms); this.engine.state.save("기록"); }
    this.info.set(`${ms}ms · 최고 기록 ${this.engine.state.get("최고")}ms`);
    this.phase = "done";
    this.btn.props.label = "잘했어요";
    const t = this.node.get("Transform").props;
    this.engine.tween.to(t, {scale: 1.08}, 0.1).then(() => this.engine.tween.to(t, {scale: 1}, 0.15));
    this.engine.timer.after(1.2, () => { if (this.phase === "done") this.ready(); }, this);
  }
});
