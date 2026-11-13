// render module: HTML/CSS 2D. Each node that shows something gets one element inside its parent's element, so the
// node tree is the drawing tree (elements keep the tree's order).
// Fit (project setting): "scale" — the stage has a design size and is scaled to fit its box; "window" — the stage is
// as big as its box (responsive: lay out with Transform anchors and style sheets).
// Style sheets: css(name, text) adds a project style sheet. Every selector is kept inside this engine's stage
// (":root", "html" and "body" mean the stage itself), so a game's styles never leak into the editor around it.
// Nodes show their style classes (node.style) on their element.
// Without a DOM (tests, servers) the module still works and simply draws nothing.
WebEngine.module("render", engine => {
  const doc = typeof document !== "undefined" ? document : null;
  const box = engine.opts.stage || null;
  const fitMode = engine.opts.fit === "window" ? "window" : "scale";
  const size = {w: engine.opts.width || 960, h: engine.opts.height || 540};
  const scope = "we-s" + Math.random().toString(36).slice(2, 8);      // one per engine, so two engines on a page stay apart
  const sheets = {};
  let stage = null;
  if (doc && box) {
    stage = doc.createElement("div");
    stage.className = "we-stage " + scope;
    Object.assign(stage.style, {position: "absolute", left: "0", top: "0", overflow: "hidden", transformOrigin: "0 0"});
    box.appendChild(stage);
    if (!doc.getElementById("we-base")) {         // defaults that style sheets can override (low specificity)
      const base = doc.createElement("style"); base.id = "we-base";
      base.textContent = ".we-node{position:absolute;left:0;top:0;box-sizing:border-box}";
      doc.head.appendChild(base);
    }
    const fit = () => {
      if (fitMode === "window") {
        size.w = box.clientWidth || size.w; size.h = box.clientHeight || size.h;
        Object.assign(stage.style, {width: "100%", height: "100%", transform: "none"});
      } else {
        const s = Math.min(box.clientWidth / size.w, box.clientHeight / size.h) || 1;
        Object.assign(stage.style, {width: size.w + "px", height: size.h + "px",
          transform: `translate(${(box.clientWidth - size.w * s) / 2}px, ${(box.clientHeight - size.h * s) / 2}px) scale(${s})`});
      }
      engine.bus.emit("resize", size.w, size.h);
    };
    fit();
    if (typeof window !== "undefined") window.addEventListener("resize", fit);
    engine.bus.on("unload", s => s.root.walk(n => { if (n._el) { n._el.remove(); delete n._el; } }));
  }

  // Keeps every rule of a style sheet inside the stage: selectors get the stage in front; @media and @supports are
  // scoped inside; @keyframes, @font-face and @import stay as they are.
  function scopeCss(text) {
    const S = "." + scope;
    const sel = list => list.split(",").map(s => s.trim()).filter(Boolean).map(s => {
      const own = s.replace(/^(:root|html|body)(?=$|[\s.:#[>~+])/, "");
      return own === s ? `${S} ${s}` : `${S}${own}`;
    }).join(", ");
    let out = "", i = 0;
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) { out += text.slice(i).match(/@import[^;]+;/g)?.join("\n") || ""; break; }
      const head = text.slice(i, open).trim();
      if (head.startsWith("@import")) {           // the address may hold ";" (font URLs do): skip url(…) and quotes
        const m = /@import\s*(?:url\((?:"[^"]*"|'[^']*'|[^)]*)\)|"[^"]*"|'[^']*')[^;]*;/y; m.lastIndex = text.indexOf("@import", i);
        const hit = m.exec(text), end = hit ? m.lastIndex : text.indexOf(";", i) + 1;
        out += text.slice(text.indexOf("@import", i), end) + "\n"; i = end; continue;
      }
      let depth = 1, j = open + 1;
      for (; j < text.length && depth; j++) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; }
      const body = text.slice(open + 1, j - 1);
      if (/^@(media|supports|container)/.test(head)) out += `${head}{${scopeCss(body)}}\n`;
      else if (head.startsWith("@")) out += `${head}{${body}}\n`;
      else out += `${sel(head)}{${body}}\n`;
      i = j;
    }
    return out;
  }

  const api = {
    size, fit: fitMode,
    stage: () => stage,
    // Adds (or replaces) a project style sheet. Returns the scoped text (for checks).
    css(name, text) {
      const scoped = scopeCss(String(text || ""));
      if (doc && stage) {
        if (!sheets[name]) { sheets[name] = doc.createElement("style"); sheets[name].dataset.weSheet = name; doc.head.appendChild(sheets[name]); }
        sheets[name].textContent = scoped;
      }
      return scoped;
    },
    // The element of a node (made on first use, inside the parent's element, at the node's place among its siblings).
    el(node) {
      if (!doc || !stage) return null;
      if (node._el) return node._el;
      const el = doc.createElement("div");
      el.dataset.node = node.path();
      el.dataset.id = node.id;
      const parent = node.parent && node.parent.parent ? api.el(node.parent) : stage;
      node._el = el;
      api.restyle(node);
      const sibs = node.parent ? node.parent.children : [];
      const after = sibs.slice(sibs.indexOf(node) + 1).find(s => s._el && s._el.parentNode === parent);
      parent.insertBefore(el, after ? after._el : null);
      return el;
    },
    // Where a node is drawn, in the stage's own pixels: {x, y, w, h} (null when it is not on screen).
    rect(node) {
      if (!stage || !node || !node._el || !node._el.getBoundingClientRect) return null;
      const r = node._el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / (stage.offsetWidth || s.width) || 1;
      return r.width || r.height ? {x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k} : null;
    },
    restyle(node) {
      if (!node._el) return;
      const keep = [...node._el.classList].filter(c => c.startsWith("we-") && c !== "we-node");   // states set by components
      node._el.className = ["we-node", ...(node.style ? node.style.split(/\s+/) : []), ...keep].join(" ");
      for (const [k, v] of Object.entries(node._vars || {})) node._el.style.setProperty(k.startsWith("--") ? k : "--" + k, v);
    },
    remove(node) { if (node._el) { node._el.remove(); delete node._el; } }
  };
  // Removed nodes take their element with them.
  const destroy = WebEngine.Node.prototype.destroy;
  if (!WebEngine.Node.prototype._renderPatched) {
    WebEngine.Node.prototype.destroy = function () { this.walk(n => n.engine.render && n.engine.render.remove(n)); return destroy.call(this); };
    WebEngine.Node.prototype._renderPatched = true;
  }
  return api;
});
