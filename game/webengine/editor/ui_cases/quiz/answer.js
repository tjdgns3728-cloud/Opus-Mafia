// 답 버튼: 누르면 '답' 신호에 자기 보기 번호를 실어 보낸다.
WebEngine.script("답버튼", class extends WebEngine.Component {
  static title = "답 버튼";
  static help = "누르면 '답' 신호에 자기 번호를 실어 보낸다";
  static props = {번호: {type: "number", default: 0, label: "보기 번호", help: "0부터"}};

  start() {
    this.node.on("click", () => this.engine.bus.emit("답", this.props.번호), this);
  }
});
