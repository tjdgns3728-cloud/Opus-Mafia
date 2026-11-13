// Interface test: drives the editor's real buttons and fields, the way a person would, from a scenario in
// editor/ui_cases/<name>.json (open the editor with ?uitest=<name>). The result goes to <pre id="uiResult">.
// The scenario may set "budget" (seconds of browser time, default 120) for long runs.
// Steps: {do:"click", sel} · {do:"set", sel, value} (fires input + change) · {do:"wait", sel} · {do:"expect", sel, text}
//        {do:"answer", value} (next prompt() gets this) · {do:"node", name} (select in the hierarchy)
//        {do:"name", value} (rename the selected object) · {do:"prop", comp, key, value} (a component field)
//        {do:"preset", name} (＋ 만들기 menu) · {do:"addComp", type} · {do:"code", text} (replace the open script)
//        {do:"expectGame", text} · {do:"clickGame", sel} (inside the game view) · {do:"note", text}
//        {do:"style", sel, prop, value, game} (computed CSS of an element; game: true = in the game view)
//        {do:"compareText", sel, file, replace:[[원래, 바뀐]], game} (element text vs a text file, with intended differences)
//        {do:"checkFile", path, expr, msg} (a saved file as the server has it: v = its JSON, or the script text)
//        {do:"pause", s} · {do:"dump", sel, game} (for finding out why)
(async function () {
  const name = new URLSearchParams(location.search).get("uitest");
  const out = document.createElement("pre"); out.id = "uiResult"; out.hidden = true; document.body.appendChild(out);
  const res = {ok: false, scenario: name, done: 0, total: 0, failed: null, log: []};
  const answers = [], saved = {};      // saved: game state kept by saveState, for checkState
  window.prompt = msg => { res.log.push("prompt: " + String(msg).slice(0, 30)); return answers.length ? answers.shift() : "시험"; };
  window.confirm = () => true;
  window.alert = m => res.log.push("alert: " + m);
  let pending = 0;
  const realFetch = window.fetch.bind(window);
  window.fetch = (...a) => { pending++; return realFetch(...a).finally(() => pending--); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const idle = async () => { for (let i = 0; i < 600; i++) { await sleep(15); if (!pending) { await sleep(40); if (!pending) return; } } throw new Error("응답을 기다리다 멈춤"); };
  const q = s => document.querySelector(s);
  const need = (s, what) => { const el = q(s); if (!el) throw new Error("화면에 없음: " + (what || s)); return el; };
  const click = el => el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
  const setValue = (el, v) => { if (el.type === "checkbox") el.checked = !!v; else el.value = v; el.dispatchEvent(new Event("input", {bubbles: true})); el.dispatchEvent(new Event("change", {bubbles: true})); };
  const until = async (fn, what, ms = 8000) => { for (let t = 0; t < ms; t += 50) { const v = fn(); if (v) return v; await sleep(50); } throw new Error("나타나지 않음: " + what); };
  const game = () => { const f = q("#gv iframe"); return f && f.contentDocument; };
  // written after every step, so a run cut off by the time budget still shows how far it got
  const progress = () => { out.textContent = JSON.stringify({...res, failed: {step: res.done + 1, error: "시간 예산 안에 끝나지 않음 (시나리오의 budget을 늘리세요)"}}); };
  progress();
  try {
    const steps = (await (await realFetch(`/cases/${encodeURIComponent(name)}.json`)).json()).steps;
    res.total = steps.length;
    await idle();
    for (const st of steps) {
      switch (st.do) {
        case "click": click(need(st.sel)); break;
        case "set": setValue(need(st.sel), st.value); break;
        case "wait": await until(() => q(st.sel), st.sel); break;
        case "expect": { const el = need(st.sel); if (!el.textContent.includes(st.text)) throw new Error(`'${st.text}'이(가) 안 보임. 보이는 것: ${el.textContent.slice(0, 200)}`); break; }
        case "answer": answers.push(st.value); break;
        case "node": click(await until(() => [...document.querySelectorAll("#hierBody .row")].find(r => r.querySelector(".nm").textContent === st.name), `계층의 '${st.name}'`)); break;
        case "name": setValue(need('#inspBody [data-n="name"]', "인스펙터의 이름 칸"), st.value); break;
        case "prop": setValue(need(`#inspBody [data-p='${JSON.stringify([st.comp, st.key])}']`, `인스펙터의 ${st.comp}번 컴포넌트 '${st.key}' 칸`), st.value); break;
        case "preset": click(need(`#addMenu [data-preset="${st.name}"]`, `＋ 만들기 › ${st.name}`)); break;
        case "addComp": setValue(need("#addComp", "컴포넌트 붙이기"), st.type); break;
        case "code": case "codeFile": {   // type into the open code (codeFile: the text of a file next to the scenario)
          const ta = need("#code", "코드 편집기");
          ta.value = st.do === "code" ? st.text : await (await realFetch(`/cases/${st.file}`)).text();
          ta.dispatchEvent(new Event("input", {bubbles: true})); break;
        }
        case "expectGame": {
          let seen = "";
          try { await until(() => { const d = game(); seen = d && d.body ? d.body.textContent.replace(/\s+/g, " ") : ""; return seen.includes(st.text); }, "", st.ms || 15000); }
          catch { const f = q("#gv iframe"); throw new Error(`게임 화면에 '${st.text}'이(가) 없음. 보이는 글: ${seen.slice(0, 200)} · 게임 칸 ${q("#gv").hidden ? "숨김" : "보임"} · 게임 오류: ${f && f.contentWindow.engine ? JSON.stringify(f.contentWindow.engine.errors).slice(0, 300) : "?"}`); }
          break;
        }
        case "clickGame": { const el = await until(() => game() && game().querySelector(st.sel), `게임 화면의 ${st.sel}`); el.click(); break; }
        case "play": {   // run the saved game in the game view with a fixed seed (same seed, same game); params = the game's own address options ("a=1&b")
          click(need('#viewTabs [data-view="game"]'));
          q("#gv").innerHTML = `<iframe src="/play?seed=${st.seed || 1}${st.params ? "&" + st.params : ""}&kind=${encodeURIComponent("시험")}&session=${encodeURIComponent(`test:${name}:${Date.now()}`)}&v=${Date.now()}"></iframe>`;   // AI calls count toward the test's cap
          break;
        }
        case "autoGame": {   // keep choosing (the first option, or option number `pick`) until `until` shows up
          let rounds = 0, seen = "";
          for (; rounds < (st.max || 300); rounds++) {
            const d = game(); seen = d && d.body ? d.body.textContent : "";
            if (seen.includes(st.until)) break;
            const opts = d ? [...d.querySelectorAll(st.sel || '[data-node*="/선택:"]')] : [];
            if (opts.length) opts[Math.min(st.pick || 0, opts.length - 1)].click();
            await sleep(250);
          }
          if (!seen.includes(st.until)) {            // what a person would see (not script text), and what could be clicked
            const d = game(), vis = d && d.body ? (d.body.innerText || "").replace(/\s+/g, " ") : "", opts = d ? [...d.querySelectorAll(st.sel || '[data-node*="/선택:"]')].map(e => e.innerText.trim().slice(0, 30)) : [];
            const g = q("#gv iframe"), errs = g && g.contentWindow.engine ? g.contentWindow.engine.errors : [];
            throw new Error(`${rounds}번 골랐지만 '${st.until}'이(가) 나오지 않음. 보이는 글 끝: ${vis.slice(-1200)} · 누를 수 있는 것: ${JSON.stringify(opts.slice(0, 8))} · 게임 오류: ${JSON.stringify((errs || []).slice(0, 3))} · 게임 기록: ${JSON.stringify(g && g.contentWindow.engine ? g.contentWindow.engine.logs.slice(-6).map(l => l.msg) : [])}`);
          }
          res.log.push(`자동 진행: ${rounds}번 만에 '${st.until}'`);
          break;
        }
        case "style": {   // the computed CSS value of an element (game: true = inside the game view)
          let seen = "";
          try { await until(() => { const d = st.game ? game() : document, e = d && d.querySelector(st.sel); seen = e ? getComputedStyle(e)[st.prop] : "(없음)"; return seen === st.value; }, "", 8000); }
          catch { throw new Error(`${st.sel}의 ${st.prop}: '${st.value}'이(가) 아님 — 지금 '${seen}'`); }
          break;
        }
        case "pause": await sleep((st.s || 1) * 1000); break;   // let an animation finish (screenshots)
        case "noGameErrors": {   // the running game has reported no errors (scripts, timers, signals)
          const f = q("#gv iframe"), errs = f && f.contentWindow.engine ? f.contentWindow.engine.errors : null;
          if (!errs) throw new Error("실행 중인 게임이 없음");
          if (errs.length) throw new Error(`게임 오류 ${errs.length}개: ${errs.slice(0, 3).map(e => `${e.where} — ${e.what}: ${e.message}`).join(" | ")}`);
          res.log.push("게임 오류 없음"); break;
        }
        case "compareText": {   // the text of an element (game: true = in the game view) against a text file next to the scenario
          const d = st.game ? game() : document, e = d && d.querySelector(st.sel);
          if (!e) throw new Error("화면에 없음: " + st.sel);
          const leaves = [], tw = d.createTreeWalker(e, NodeFilter.SHOW_TEXT);       // every piece of text, in order
          for (let t = tw.nextNode(); t; t = tw.nextNode()) { const s = t.nodeValue.trim(); if (s) leaves.push(s); }
          const norm = s => s.replace(/\s+/g, " ").trim();
          let want = norm(await (await realFetch(`/cases/${encodeURIComponent(st.file)}`)).text());
          for (const [a, b] of st.replace || []) { if (!want.includes(norm(a))) throw new Error(`기준 글에 바꿀 부분이 없음: ${a.slice(0, 40)}`); want = want.split(norm(a)).join(norm(b)); }
          const got = norm(leaves.join(" "));
          if (got !== want) {
            let i = 0; while (i < got.length && got[i] === want[i]) i++;
            throw new Error(`글이 다름 (${i}번째 글자부터). 기준: …${want.slice(Math.max(0, i - 30), i + 60)}… / 화면: …${got.slice(Math.max(0, i - 30), i + 60)}…`);
          }
          res.log.push(`글 비교: ${got.length}자 같음 (의도한 차이 ${(st.replace || []).length}곳 반영)`);
          break;
        }
        // The running game's state (engine.state): wait for it, keep it, check it. expr is JavaScript over v (the value)
        // and saved (kept values), e.g. {"do": "checkState", "key": "trace", "expr": "v.persona !== null", "msg": "…"}.
        case "waitState": {
          const f = () => { const g = q("#gv iframe"), e = g && g.contentWindow.engine; return e ? e.state.get(st.key) : undefined; };
          const test = new Function("v", "saved", `return (${st.expr})`);
          try { await until(() => { try { return test(f(), saved); } catch { return false; } }, "", st.ms || 60000); }
          catch { throw new Error(`게임 상태 '${st.key}'이(가) ${st.expr} 이(가) 되지 않음 — 지금 ${JSON.stringify(f()).slice(0, 300)}`); }
          break;
        }
        case "saveState": { const g = q("#gv iframe"); saved[st.as || st.key] = JSON.parse(JSON.stringify(g.contentWindow.engine.state.get(st.key) ?? null)); res.log.push(`상태 저장: ${st.as || st.key}`); break; }
        case "checkState": {
          const g = q("#gv iframe"), v = g && g.contentWindow.engine ? g.contentWindow.engine.state.get(st.key) : undefined;
          let ok = false, err = "";
          try { ok = !!new Function("v", "saved", `return (${st.expr})`)(v, saved); } catch (e) { err = e.message; }
          if (!ok) throw new Error(`${st.msg || st.expr}: 맞지 않음${err ? " (" + err + ")" : ""} — ${JSON.stringify(v).slice(0, 400)}`);
          res.log.push(`✔ ${st.msg || st.expr}`); break;
        }
        case "checkFile": {   // a file as the server has it now (not the editor's unsaved copy): v = JSON, or text for a script
          const d = await api(`/api/file?path=${encodeURIComponent(st.path)}`);
          let v = d.content, ok = false, err = "";
          if (typeof v === "string" && st.path.endsWith(".json") && st.path.startsWith("assets/")) v = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(v), ch => ch.charCodeAt(0))));
          try { ok = !!new Function("v", "saved", `return (${st.expr})`)(v, saved); } catch (e) { err = e.message; }
          if (!ok) throw new Error(`${st.msg || st.expr}: 맞지 않음${err ? " (" + err + ")" : ""} — 서버의 ${st.path}: ${JSON.stringify(v ?? d).slice(0, 300)}`);
          res.log.push(`✔ ${st.msg || st.expr}`); break;
        }
        case "checkGame": {   // check the running game's code directly: expr gets the game's engine (e.g. call a component's function)
          const g = q("#gv iframe"), eng = g && g.contentWindow.engine;
          if (!eng) throw new Error("실행 중인 게임이 없음");
          let out, err = "";
          try { out = await new Function("engine", "saved", `return (${st.expr})`)(eng, saved); } catch (e) { err = e.message; }   // may be async
          if (!out) throw new Error(`${st.msg || st.expr}: 맞지 않음${err ? " (" + err + ")" : ""}`);
          res.log.push(`✔ ${st.msg || st.expr}`); break;
        }
        case "logState": {   // write (a part of) the game state into the log — for measuring; expr shapes it, e.g. "v.current"
          const g = q("#gv iframe"), v = g && g.contentWindow.engine ? g.contentWindow.engine.state.get(st.key) : undefined;
          let out; try { out = st.expr ? new Function("v", "saved", `return (${st.expr})`)(v, saved) : v; } catch (e) { out = "(오류: " + e.message + ")"; }
          res.log.push(`${st.label || st.key}: ${JSON.stringify(out)}`); break;
        }
        case "dump": { const d = st.game ? game() : document, e = d && d.querySelector(st.sel); res.log.push(`dump ${st.sel}: ${e ? e.outerHTML.slice(0, st.max || 600) : "(없음)"}`); break; }   // for finding out why
        case "note": res.log.push("— " + st.text); break;
        default: throw new Error("모르는 단계 " + st.do);
      }
      await idle();
      res.done++;
      progress();
    }
    res.ok = true;
  } catch (e) { res.failed = {step: res.done + 1, error: e.message}; }
  res.console = (q("#dockBody") || {}).innerText?.slice(0, 500) || "";
  out.textContent = JSON.stringify(res);
})();
