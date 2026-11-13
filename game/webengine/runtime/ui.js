// ui module: built-in visual components. Each one only styles its node's element (render module) and emits
// signals on its node; game code listens (node.on("click", …)).
// What the editor shows comes from here too: icon, title, help, and for each prop a Korean label, help and
// option labels. The English names stay as the names code uses.
(function () {
  const {Component, define} = WebEngine;
  const el = c => c.engine.render ? c.engine.render.el(c.node) : null;
  const changed = c => { const k = JSON.stringify(c.props); if (k === c._last) return false; c._last = k; return true; };

  define("Transform", class extends Component {
    static icon = "📐"; static title = "위치와 크기";
    static help = "화면에서 어디에, 얼마나 크게 놓일지 (부모 기준, 픽셀). 부모가 '가로로 나란히'·'세로로 쌓기'면 순서대로 놓인다";
    static props = {
      x: {type: "number", default: 0, label: "가로 위치", help: "왼쪽에서부터", unit: "px"}, y: {type: "number", default: 0, label: "세로 위치", help: "위에서부터", unit: "px"},
      w: {type: "number", default: 100, label: "너비", help: "0 = 부모에 맞춤", unit: "px", min: 0}, h: {type: "number", default: 40, label: "높이", help: "0 = 내용에 맞춤", unit: "px", min: 0},
      rotation: {type: "number", default: 0, label: "회전", help: "시계 방향", unit: "도"}, scale: {type: "number", default: 1, label: "크기 배율", help: "1 = 그대로", unit: "배", min: 0},
      opacity: {type: "number", default: 1, label: "불투명도", help: "0 = 안 보임 · 1 = 또렷", min: 0, max: 1}, z: {type: "number", default: 0, label: "앞뒤 순서", help: "클수록 앞"},
      visible: {type: "bool", default: true, label: "보이기"},
      anchor: {type: "text", default: "none", label: "기준점", help: "창 크기가 바뀔 때 어디에 붙을지. 붙이면 가로·세로 위치는 가장자리에서 띄우는 거리",
               options: ["none", "fill", "top", "bottom", "left", "right", "center", "css"],
               labels: {none: "고정 위치 (왼쪽 위 기준)", fill: "꽉 채움", top: "위쪽에 가로로 꽉", bottom: "아래쪽에 가로로 꽉", left: "왼쪽에 세로로 꽉",
                        right: "오른쪽에 세로로 꽉", center: "가운데", css: "스타일 시트가 정함 (위치·크기를 쓰지 않음)"}}};
    start() { this.apply(); }
    // Other parts of the same object (Panel, Button, Feed …) set the element's display for their layout. '보이기' wins:
    // when it changes they lay out again (shown), and a hidden object stays hidden whatever they set.
    update() {
      if (changed(this)) {
        this.apply();
        if (this.props.visible) for (const c of this.node.components) if (c !== this && c._started && typeof c.apply === "function") c.apply();
      }
      if (!this.props.visible) { const e = el(this); if (e && e.style.display !== "none") e.style.display = "none"; }
    }
    apply() {
      const e = el(this); if (!e) return;
      const p = this.props, a = p.anchor || "none", px = v => v + "px";
      const common = {transform: `rotate(${p.rotation}deg) scale(${p.scale})`, opacity: String(p.opacity), zIndex: p.z ? String(p.z) : "", display: p.visible ? "" : "none"};
      const reset = {position: "", left: "", top: "", right: "", bottom: "", width: "", height: "", alignSelf: "", flex: "", translate: ""};
      if (a === "css") return Object.assign(e.style, reset, common, {zIndex: p.z ? String(p.z) : ""});
      const flowed = a === "none" && this.node.parent && this.node.parent.get && this.node.parent.get("Panel") && this.node.parent.get("Panel").props.layout !== "none";
      if (flowed || a === "none") return Object.assign(e.style, reset, common, {position: flowed ? "relative" : "absolute", left: flowed ? "" : px(p.x), top: flowed ? "" : px(p.y),
        width: p.w ? px(p.w) : (flowed ? "auto" : "100%"), height: p.h ? px(p.h) : "auto", alignSelf: !p.w && flowed ? "stretch" : "", flex: "none"});
      const edge = {fill: {left: px(p.x), right: px(p.x), top: px(p.y), bottom: px(p.y)},
                    top: {left: px(p.x), right: px(p.x), top: px(p.y), height: p.h ? px(p.h) : "auto"},
                    bottom: {left: px(p.x), right: px(p.x), bottom: px(p.y), height: p.h ? px(p.h) : "auto"},
                    left: {top: px(p.y), bottom: px(p.y), left: px(p.x), width: p.w ? px(p.w) : "auto"},
                    right: {top: px(p.y), bottom: px(p.y), right: px(p.x), width: p.w ? px(p.w) : "auto"},
                    center: {left: `calc(50% + ${px(p.x)})`, top: `calc(50% + ${px(p.y)})`, width: p.w ? px(p.w) : "auto", height: p.h ? px(p.h) : "auto", translate: "-50% -50%"}}[a];
      Object.assign(e.style, reset, common, {position: "absolute"}, edge);
    }
  }, "builtin", "ui");

  define("Panel", class extends Component {
    static icon = "▭"; static title = "상자 (배경·배치)";
    static help = "배경색·테두리·둥근 모서리, 그리고 안에 든 오브젝트를 어떻게 놓을지";
    static props = {
      color: {type: "color", default: "", label: "배경색", help: "비우면 투명"}, border: {type: "color", default: "", label: "테두리 색", help: "비우면 없음"},
      radius: {type: "number", default: 0, label: "모서리 둥글기", unit: "px", min: 0}, padding: {type: "number", default: 0, label: "안쪽 여백", unit: "px", min: 0},
      layout: {type: "text", default: "none", label: "안의 것 배치", options: ["none", "row", "column", "css"],
               labels: {none: "자유 배치 (위치 직접)", row: "가로로 나란히", column: "세로로 쌓기", css: "스타일 시트가 정함 (이 상자의 칸은 스크롤만 씀)"}},
      gap: {type: "number", default: 0, label: "사이 간격", help: "나란히·쌓기일 때", unit: "px", min: 0}, wrap: {type: "bool", default: false, label: "넘치면 다음 줄로", help: "가로로 나란히일 때"},
      align: {type: "text", default: "stretch", label: "가로세로 맞춤", help: "나란히·쌓기일 때, 줄의 직각 방향", options: ["stretch", "start", "center", "end"],
              labels: {stretch: "꽉 채우기", start: "앞쪽(왼쪽·위)", center: "가운데", end: "뒤쪽(오른쪽·아래)"}},
      justify: {type: "text", default: "start", label: "줄 방향 맞춤", help: "나란히·쌓기일 때, 줄 방향", options: ["start", "center", "end", "between"],
                labels: {start: "앞쪽부터", center: "가운데로 모으기", end: "뒤쪽으로 모으기", between: "고르게 벌리기"}},
      scroll: {type: "bool", default: false, label: "넘치면 스크롤"}};
    start() { this.apply(); }
    update() { if (changed(this)) this.apply(); }
    apply() {
      const e = el(this); if (!e) return;
      const p = this.props;
      if (p.layout === "css") { e.style.overflow = p.scroll ? "auto" : ""; return; }   // the style sheet lays it out
      Object.assign(e.style, {background: p.color || "", border: p.border ? `1px solid ${p.border}` : "", borderRadius: p.radius ? p.radius + "px" : "",
        padding: p.padding + "px", display: p.layout === "none" ? "block" : "flex", flexDirection: p.layout === "row" ? "row" : "column",
        gap: p.gap + "px", flexWrap: p.wrap ? "wrap" : "nowrap", alignContent: "flex-start", overflow: p.scroll ? "auto" : "hidden",
        alignItems: {start: "flex-start", center: "center", end: "flex-end"}[p.align] || "stretch",
        justifyContent: {center: "center", end: "flex-end", between: "space-between"}[p.justify] || "flex-start"});
    }
    // For a scrolling box: code calls node.get("Panel").scrollToEnd() after adding things at the bottom.
    scrollToEnd(smooth) { const e = el(this); if (e) setTimeout(() => { if (smooth && e.scrollTo) e.scrollTo({top: e.scrollHeight, behavior: "smooth"}); else e.scrollTop = e.scrollHeight; }, 0); }
    atEnd() { const e = el(this); return !e || e.scrollHeight - e.scrollTop - e.clientHeight < 40; }
  }, "builtin", "ui");

  define("Text", class extends Component {
    static icon = "🔤"; static title = "글자";
    static help = "글을 보여 준다. 코드에서 바꾸려면 node.get(\"Text\").set(\"새 글\") — 한 글자씩 나오게 했으면 다 나올 때까지 기다릴 수 있다(await)";
    static props = {
      text: {type: "text", default: "", label: "내용"}, size: {type: "number", default: 18, label: "글자 크기", help: "0 = 스타일 시트를 따름", unit: "px", min: 0},
      color: {type: "color", default: "#ffffff", label: "글자 색", help: "비우면 스타일 시트를 따름"},
      align: {type: "text", default: "left", label: "정렬", options: ["left", "center", "right"], labels: {left: "왼쪽", center: "가운데", right: "오른쪽"}},
      bold: {type: "bool", default: false, label: "굵게"}, font: {type: "text", default: "", label: "글꼴", help: "비우면 기본"},
      wrap: {type: "bool", default: true, label: "줄 바꿈", help: "넘치면 다음 줄로"},
      reveal: {type: "number", default: 0, label: "한 글자씩 나오기", help: "0 = 바로 다 나옴", unit: "글자/초", min: 0},
      markup: {type: "bool", default: false, label: "강조 표시 쓰기", help: "**이렇게** 쓰면 굵게"}};
    start() { this._shown = Infinity; this.apply(); }
    update(dt) {
      if (this._shown < this.props.text.length) {           // revealing letter by letter
        this._shown = Math.min(this.props.text.length, this._shown + this.props.reveal * dt);
        this.paint();
        if (this._shown >= this.props.text.length) this._finish();
      }
      if (changed(this)) this.apply();
    }
    // New text. With reveal on, the returned promise resolves when every letter is out (or after skip()).
    set(text) {
      this.props.text = String(text);
      this._last = JSON.stringify(this.props);
      if (this._finish) this._finish();
      if (this.props.reveal > 0 && this.props.text) {
        this._shown = 0; this.apply();
        return new Promise(ok => { this._finish = () => { this._finish = null; this._shown = Infinity; this.paint(); ok(); }; });
      }
      this._shown = Infinity; this.apply();
      return Promise.resolve();
    }
    skip() { if (this._finish) this._finish(); }
    get revealing() { return this._shown < this.props.text.length; }
    paint() {
      if (!this._span) return;
      const p = this.props, all = this._shown >= p.text.length;
      if (this.node._el) this.node._el.classList.toggle("we-revealing", !all);   // style sheets can draw a caret while it types
      const shown = all ? p.text : p.text.slice(0, Math.floor(this._shown));
      if (p.markup && all) {
        const esc = s => s.replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));
        this._span.innerHTML = esc(shown).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      } else this._span.textContent = p.markup ? shown.replace(/\*\*/g, "") : shown;
    }
    apply() {
      const e = el(this); if (!e) return;
      const p = this.props;
      if (!this._span) { this._span = e.ownerDocument.createElement("span"); e.appendChild(this._span); }
      this.paint();
      const css = !p.size;           // size 0: the style sheet decides the look (font, colour, line height)
      Object.assign(e.style, {fontSize: css ? "" : p.size + "px", color: p.color || "", textAlign: css && p.align === "left" ? "" : p.align,
        fontWeight: p.bold ? "700" : css ? "" : "400", fontFamily: p.font || "", whiteSpace: !p.wrap ? "nowrap" : css ? "" : "pre-wrap", lineHeight: css ? "" : "1.5"});
    }
  }, "builtin", "ui");

  define("Canvas", class extends Component {
    static icon = "🎨"; static title = "그리기 판";
    static help = "코드로 자유롭게 그리는 판 (풍경·효과·도형). 코드에서 const g = this.node.get(\"Canvas\"); g.ctx로 그린다 (크기: g.width, g.height). 매 프레임 'draw' 신호(ctx, dt)도 보낸다";
    static props = {background: {type: "color", default: "", label: "바탕색", help: "비우면 투명. 매 프레임 이 색으로 지운다"},
                    clear: {type: "bool", default: true, label: "매 프레임 지우기", help: "끄면 그린 것이 남는다"},
                    sharp: {type: "number", default: 1, label: "선명도", help: "1 = 보통, 2 = 고해상도 (무거움)", unit: "배", min: 1, max: 3}};
    start() {
      const e = el(this);
      if (e) { this._cv = e.ownerDocument.createElement("canvas"); Object.assign(this._cv.style, {width: "100%", height: "100%", display: "block"}); e.appendChild(this._cv); this.ctx = this._cv.getContext("2d"); }
      this.width = 0; this.height = 0; this.resize();
    }
    resize() {
      const t = this.node.get("Transform"), k = Math.max(0.5, this.props.sharp || 1), e = this.node._el;
      // The element's real size when it has one (anchors, style sheets, window fit); else the Transform's.
      this.width = (e && e.clientWidth) || (t && t.props.w) || 100; this.height = (e && e.clientHeight) || (t && t.props.h) || 100;
      if (this._cv && (this._cv.width !== this.width * k || this._cv.height !== this.height * k)) {
        this._cv.width = this.width * k; this._cv.height = this.height * k; this.ctx.setTransform(k, 0, 0, k, 0, 0);
      }
    }
    clearAll() { if (!this.ctx) return; this.ctx.clearRect(0, 0, this.width, this.height); if (this.props.background) { this.ctx.fillStyle = this.props.background; this.ctx.fillRect(0, 0, this.width, this.height); } }
    update(dt) {
      this.resize();
      if (this.props.clear) this.clearAll();
      if (this.ctx) this.node.emit("draw", this.ctx, dt, this);
    }
  }, "builtin", "ui");

  define("Image", class extends Component {
    static icon = "🖼"; static title = "그림";
    static help = "파일 창의 자원(그림)을 보여 준다. 없으면 점선 칸. 코드가 만든 그림(SVG 글 등)은 '직접 주소'에 넣는다: node.get(\"Image\").props.url = \"data:image/svg+xml,…\"";
    static props = {
      asset: {type: "asset", default: "", label: "그림 파일"},
      url: {type: "text", default: "", label: "직접 주소", help: "비우면 위의 그림 파일. 코드가 만든 그림(data: 주소)이나 인터넷 주소"},
      fit: {type: "text", default: "contain", label: "맞추는 방법", options: ["contain", "cover", "fill"], labels: {contain: "다 보이게 맞춰 넣기", cover: "꽉 채우기 (잘릴 수 있음)", fill: "늘려서 채우기"}}};
    start() { this.apply(); }
    update() { if (changed(this)) this.apply(); }
    apply() {
      const e = el(this); if (!e) return;
      const url = this.props.url || (this.props.asset && this.engine.assets ? this.engine.assets.url(this.props.asset) : "");
      if (url && !this.props.url && !this._probe && typeof Image !== "undefined") {   // say so when the file is missing
        this._probe = new window.Image();
        this._probe.onerror = () => this.engine.error(this.where(), "그림", new Error(`그림 파일이 없음: ${this.props.asset}`));
        this._probe.src = url;
      }
      Object.assign(e.style, {backgroundImage: url ? `url("${url}")` : "none", backgroundSize: this.props.fit === "fill" ? "100% 100%" : this.props.fit,
        backgroundRepeat: "no-repeat", backgroundPosition: "center", outline: url ? "none" : "1px dashed #666"});
    }
  }, "builtin", "ui");

  define("Button", class extends Component {
    static icon = "🔘"; static title = "버튼";
    static help = "누르면 이 오브젝트에 'click' 신호를 보낸다. 코드에서 받기: this.node.on(\"click\", () => { … })";
    static props = {
      label: {type: "text", default: "버튼", label: "버튼 글자"}, color: {type: "color", default: "#2f4470", label: "버튼 색"},
      textColor: {type: "color", default: "#ffffff", label: "글자 색"}, size: {type: "number", default: 16, label: "글자 크기", help: "0 = 스타일 시트를 따름 (모양 전부)", unit: "px", min: 0},
      disabled: {type: "bool", default: false, label: "누를 수 없게"},
      padding: {type: "number", default: 0, label: "좌우 여백", help: "글자 양옆 빈칸. 너비를 0(글에 맞춤)으로 두면 글 길이 + 여백만큼 넓어진다", unit: "px", min: 0}};
    start() {
      const e = el(this);
      if (e) { e.style.cursor = "pointer"; e.onclick = ev => { ev.stopPropagation(); this.click(); }; }
      this.apply();
    }
    update() { if (changed(this)) this.apply(); }
    click() { if (!this.props.disabled) this.node.emit("click", this); }   // tests and keyboard can press it too
    apply() {
      const e = el(this); if (!e) return;
      const p = this.props;
      if (!this.node.children.length) e.textContent = p.label;     // a button made of child objects keeps them
      if (!p.size) {                 // size 0: the style sheet decides the look; only the state is set here
        e.style.opacity = p.disabled ? "0.5" : ""; e.style.background = p.color || ""; e.style.color = p.textColor || "";
        e.classList.toggle("disabled", !!p.disabled); return;
      }
      Object.assign(e.style, {background: p.color, color: p.textColor, fontSize: p.size + "px", borderRadius: "8px", display: "flex",
        alignItems: "center", justifyContent: "center", opacity: p.disabled ? "0.5" : "1", userSelect: "none",
        padding: `0 ${p.padding}px`, boxSizing: "border-box", whiteSpace: p.padding ? "nowrap" : ""});
    }
  }, "builtin", "ui");

  define("TextInput", class extends Component {
    static icon = "⌨"; static title = "글 입력칸";
    static help = "글을 쓰고 Enter를 누르면 'submit' 신호(쓴 글)를, 쓰는 중에는 'change' 신호를 보낸다";
    static props = {
      placeholder: {type: "text", default: "", label: "안내 글", help: "비어 있을 때 흐리게 보이는 글"},
      value: {type: "text", default: "", label: "처음 내용"}, size: {type: "number", default: 16, label: "글자 크기", help: "0 = 스타일 시트를 따름 (모양 전부)", unit: "px", min: 0},
      disabled: {type: "bool", default: false, label: "쓸 수 없게", help: "켜면 글을 쓸 수 없고 흐리게 보인다"},
      maxLength: {type: "number", default: 0, label: "가장 긴 글", help: "이보다 길게 쓸 수 없다. 0 = 한도 없음", unit: "자", min: 0},
      lines: {type: "number", default: 1, label: "줄 수", help: "2부터는 여러 줄 칸: Enter로 보내고 Shift+Enter로 줄을 바꾼다", unit: "줄", min: 1, max: 20}};
    start() {
      const e = el(this);
      if (e) {
        const many = this.props.lines > 1;
        const input = this._input = e.ownerDocument.createElement(many ? "textarea" : "input");
        if (this.props.size) Object.assign(input.style, {width: "100%", height: "100%", boxSizing: "border-box", fontSize: this.props.size + "px", padding: many ? "8px 10px" : "0 10px",
          background: "#15171b", color: "#eee", border: "1px solid #444", borderRadius: "8px", resize: "none", fontFamily: "inherit"});
        input.value = this.props.value;
        input.oninput = () => { this.props.value = input.value; this.node.emit("change", input.value); };
        input.onkeydown = ev => { if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { if (many) ev.preventDefault(); this.submit(); } };
        e.appendChild(input);
        this.apply();
      }
    }
    update() { if (this._input && changed(this)) this.apply(); }
    apply() {
      const input = this._input, p = this.props; if (!input) return;
      input.placeholder = p.placeholder;
      const set = `${!!p.disabled}|${Math.floor(p.maxLength) || 0}`;      // only when these two change (typing changes props.value on every key)
      if (set !== this._set) {
        this._set = set;
        input.disabled = !!p.disabled;
        if (p.maxLength > 0) input.maxLength = Math.floor(p.maxLength); else input.removeAttribute("maxlength");
        if (p.size) input.style.opacity = p.disabled ? "0.5" : "";
      }
      if (input.value !== p.value) input.value = p.value;          // code may set the text (props.value = "…")
    }
    submit(text) {
      const v = text != null ? String(text) : this.props.value;
      this.props.value = ""; if (this._input) this._input.value = "";
      if (v.trim()) this.node.emit("submit", v);
    }
  }, "builtin", "ui");
})();
