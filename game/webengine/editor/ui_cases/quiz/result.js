// 결과 표시: 몇 문제 맞혔는지 보여 주고, 서서히 나타난다.
WebEngine.script("결과표시", class extends WebEngine.Component {
  static title = "결과 표시";
  static help = "점수를 글자로 보여 준다";
  static props = {};

  start() {
    const s = this.engine.state.get("점수", 0), n = this.engine.state.get("문제수", 0);
    this.node.get("Text").set(`${n}문제 중 ${s}문제 맞혔습니다`);
    const t = this.node.get("Transform");
    t.props.opacity = 0;
    this.engine.tween.to(t.props, {opacity: 1}, 0.6);
  }
});
