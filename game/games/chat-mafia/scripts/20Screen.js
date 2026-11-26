// 8인 채팅 마피아 — 사람의 화면(브라우저마다 돈다). 서버가 보낸 내 자리의 보기(ChatMafia.view)만 그린다.
// AI 자리는 같은 보기를 ChatMafia.screenText로 글로 받는다: 여기 보이는 칸(사람들·대화·버튼·유언·규칙)이 그 글에도 같은 차례로 있다.
(function () {
  'use strict';
  if (typeof WebEngine === 'undefined') return;
  const E = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  WebEngine.script('채팅마피아화면', class extends WebEngine.Component {
    static title = '8인 채팅 마피아 화면';
    static help = '처음 화면 · 기다리는 방 · 판 화면';

    start() {
      if (typeof document === 'undefined') return;
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = '/project/assets/mafia.css';
      document.head.appendChild(link);
      this.root = document.createElement('main');
      this.root.id = 'cm';
      document.body.appendChild(this.root);
      this.rendered = new Set(); this.maxI = 0; this.mode = ''; this.lastTyping = 0; this.stick = true; this.notice = '';
      try { this.name = localStorage.getItem('cm-name') || ''; } catch (e) { this.name = ''; }
      const room = this.engine.room, bus = this.engine.bus;
      bus.on('room', now => this.draw(now), this);
      bus.on('room:gone', why => { this.notice = String(why || ''); this.draw(null); }, this);
      bus.on('room:reopened', () => { this.rendered.clear(); this.maxI = 0; this.mode = ''; }, this);
      this.timer = setInterval(() => this.tick(), 250);
      try { this.citizen = localStorage.getItem('cm-watch-citizen') === '1'; } catch (e) { this.citizen = false; }
      this.clicks();
      this.draw(null);
      this.engine.watch(room.resume().then(r => { if (r && !r.ok && r.error && !/열쇠/.test(r.error)) { this.notice = r.error; this.draw(room.now); } }), this.where(), '다시 들어오기');
    }

    // ── 처음 화면 ──
    home() {
      this.mode = 'home';
      this.root.innerHTML = `<section class="home">
        <h1>8인 채팅 마피아</h1>
        <p class="muted">여덟 명이 채팅으로 하는 마피아입니다. 빈자리는 AI가 채웁니다.</p>
        <label>부를 이름<input id="cm-name" maxlength="12" placeholder="예: 가람" value="${E(this.name)}"></label>
        <button id="cm-make" class="gold">방 만들기</button>
        <label>방 이름 (다른 사람이 만든 방)<input id="cm-code" maxlength="8" placeholder="예: K7QM"></label>
        <button id="cm-join">들어가기</button>
        <hr>
        <button id="cm-watch">AI끼리 하는 판 보기</button>
        <p class="muted small">AI 여덟이 판을 하고, 나는 보기만 합니다. 모든 직업·마피아끼리 대화·귓속말·밤 행동이 보입니다.</p>
        <p class="notice">${E(this.notice)}</p>
      </section>`;
      const room = this.engine.room, name = () => { const v = this.root.querySelector('#cm-name').value.trim(); this.name = v; try { localStorage.setItem('cm-name', v); } catch (e) {} return v; };
      const answer = r => { if (r && !r.ok) { this.notice = r.error || '하지 못했습니다.'; this.home(); } };
      this.root.querySelector('#cm-make').onclick = async () => answer(await room.create(name()));
      this.root.querySelector('#cm-join').onclick = async () => {
        const code = this.root.querySelector('#cm-code').value.trim(), nm = name();
        let r = await room.join(code, nm);
        if (r && r.code === 'watch_only') r = await room.join(code, nm || '관전', {watch: true});      // AI끼리 하는 판의 방이면 보기로 들어간다
        answer(r);
      };
      this.root.querySelector('#cm-watch').onclick = async () => {
        const r = await room.create(name() || '관전', {watch: true});
        if (!r || !r.ok) return answer(r);
        await this.fillAndStart();
      };
    }
    // 관전 방: 빈자리를 AI로 채우고 바로 시작한다
    async fillAndStart() {
      const room = this.engine.room, now = room.now;
      const empty = now ? Math.max(0, now.max - (now.seats || []).length) : 0;
      for (let i = 0; i < empty; i++) { const b = await room.addBot(); if (!b.ok) { this.notice = b.error; return this.draw(room.now); } }
      const s = await room.start();
      if (s && !s.ok) { this.notice = s.error; this.draw(room.now); }
    }

    // ── 기다리는 방 ──
    lobby(now) {
      const host = now.host === true, seats = now.seats || [];      // now.host: 내가 방장인가(참/거짓)
      this.mode = 'lobby';
      this.root.innerHTML = `<section class="lobby">
        <p class="muted">${now.watching ? 'AI끼리 하는 판을 보는 방 — 방 이름을 알려 주면 다른 사람도 같이 볼 수 있습니다' : '방 이름 — 함께 할 사람에게 알려 주세요'}</p>
        <div class="code">${E(now.room)}</div>
        <p>${seats.length} / ${now.max}명</p>
        <ol class="seats">${seats.map(s => `<li>${E(s.name)}${s.bot ? ' <span class="tag">AI</span>' : ''}${s.host ? ' <span class="tag">방장</span>' : ''}${s.on ? '' : ' <span class="muted">(끊김)</span>'}</li>`).join('')}</ol>
        <div class="row">
          ${host ? `<button id="cm-fill">AI로 빈자리 채우기</button><button id="cm-unbot">AI 한 자리 빼기</button><button id="cm-start" class="gold">시작</button>` : '<p class="muted">방장이 시작하기를 기다립니다.</p>'}
          <button id="cm-leave">처음 화면으로</button>
        </div>
        <p class="notice">${E(this.notice)}</p>
      </section>`;
      const room = this.engine.room, say = r => { if (r && !r.ok) { this.notice = r.error; this.lobby(room.now); } };
      const q = s => this.root.querySelector(s);
      if (q('#cm-fill')) q('#cm-fill').onclick = async () => {        // 지금 빈자리 수만큼만 넣는다(소식이 늦게 와도 한 번 더 넣지 않게)
        const empty = Math.max(0, now.max - seats.length);
        for (let i = 0; i < empty; i++) { const r = await room.addBot(); if (!r.ok) { say(r); break; } }
      };
      if (q('#cm-unbot')) q('#cm-unbot').onclick = async () => say(await room.removeBot());
      if (q('#cm-start')) q('#cm-start').onclick = async () => say(await room.start());
      q('#cm-leave').onclick = () => { room.leave(); this.notice = ''; this.draw(null); };
    }

    // ── 판 화면의 뼈대(한 번만 만들고, 칸마다 다시 그린다) ──
    frame() {
      this.mode = 'game';
      this.rendered.clear(); this.maxI = 0; this.stick = true;
      this.root.innerHTML = `<section class="game">
        <header><b>8인 채팅 마피아</b><span id="cm-stage"></span><span id="cm-time" class="time"></span><span id="cm-role" class="role"></span></header>
        <div class="cols">
          <aside class="players"><h3>사람들</h3><div id="cm-players"></div></aside>
          <div class="center">
            <div id="cm-banner" class="banner"></div>
            <div id="cm-log" class="log"></div>
            <form id="cm-say" class="say" autocomplete="off">
              <select id="cm-to"></select>
              <input id="cm-text" maxlength="300">
              <button>보내기</button>
            </form>
          </div>
          <aside class="side">
            <h3>내 직업</h3><div id="cm-me" class="card"></div>
            <h3>유언</h3><textarea id="cm-will" rows="3"></textarea><button id="cm-will-save">유언 저장</button><p id="cm-will-note" class="muted"></p>
            <details><summary>규칙 보기</summary><pre id="cm-rules"></pre></details>
          </aside>
        </div>
      </section>`;
      const room = this.engine.room, q = s => this.root.querySelector(s);
      const log = q('#cm-log');
      log.addEventListener('scroll', () => { this.stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30; });
      q('#cm-say').onsubmit = async e => {
        e.preventDefault();
        const input = q('#cm-text'), text = input.value.trim(), to = q('#cm-to').value;
        if (!text) return;
        const r = await room.chat(text, to ? [to] : 'all');
        if (r && !r.ok) this.note(r.error || '보내지 못했습니다.'); else input.value = '';
      };
      q('#cm-text').addEventListener('input', () => {
        const t = performance.now();
        if (!q('#cm-text').value.trim() || t - this.lastTyping < 2000) return;
        this.lastTyping = t;
        room.act({type: 'typing', to: q('#cm-to').value || undefined});
      });
      q('#cm-will-save').onclick = async () => {
        const r = await room.act({type: 'will', text: q('#cm-will').value});
        q('#cm-will-note').textContent = r && r.ok ? '저장했습니다.' : (r && r.error) || '저장하지 못했습니다.';
      };
    }
    // 판 화면의 버튼(data-act·data-room)은 뿌리에 한 번만 건다: 판 화면을 다시 만들 때마다 걸면 한 번 눌러도 여러 번 보낸다
    clicks() {
      const room = this.engine.room;
      this.root.addEventListener('click', async e => {
        const a = e.target.closest('[data-act]');
        if (a) { const r = await room.act(JSON.parse(a.dataset.act)); if (r && !r.ok) this.note(r.error); return; }
        const b = e.target.closest('[data-room]');
        if (!b) return;
        if (b.dataset.room === 'again') { const r = await room.reopen(); if (r && !r.ok) this.note(r.error); }
        if (b.dataset.room === 'again-watch') { const r = await room.reopen(); if (r && !r.ok) return this.note(r.error); await this.fillAndStart(); }
        if (b.dataset.room === 'home') { room.leave(); this.notice = ''; this.draw(null); }
      });
    }
    note(text) {
      this.flash = String(text || '');
      const b = this.root.querySelector('#cm-flash');
      if (b) b.textContent = this.flash;
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => { this.flash = ''; const x = this.root.querySelector('#cm-flash'); if (x) x.textContent = ''; }, 4000);
    }

    tick() {
      const t = this.root && this.root.querySelector('#cm-time');
      if (!t) return;
      const now = this.engine.room.now;
      const left = now && now.status === 'play' ? Math.ceil(this.engine.room.left() || 0) : 0;
      t.textContent = left ? `${left}초` : '';
      t.classList.toggle('low', left > 0 && left <= 5);
    }

    draw(now) {
      if (!this.root) return;
      if (!now) { this.rendered.clear(); return this.home(); }
      if (now.status === 'lobby') return this.lobby(now);
      const v = now.view;
      if (!v || v.missing) return;
      if (now.watching) return this.drawWatch(v, now);
      if (this.mode !== 'game') this.frame();
      const q = s => this.root.querySelector(s);
      q('#cm-stage').textContent = v.stageName;
      q('#cm-role').textContent = `${v.me.no}번 ${v.me.name} · ${v.me.role}${v.me.alive ? '' : ' · 죽음'}`;
      q('#cm-role').classList.toggle('mafia', v.me.team === '마피아 편');
      this.drawPlayers(v);
      this.drawBanner(v, now);
      this.drawLog(v);
      this.drawSay(v);
      q('#cm-me').innerHTML = `<b>${E(v.me.role)}</b> <span class="muted">${E(v.me.team)}</span><p>${E(v.me.roleDesc)}</p>`;
      const will = q('#cm-will');
      if (document.activeElement !== will && will.dataset.saved !== v.me.will) { will.value = v.me.will; will.dataset.saved = v.me.will; }
      will.disabled = !v.me.alive || v.stage === 'over'; q('#cm-will-save').disabled = will.disabled;
      will.maxLength = 120;
      q('#cm-rules').textContent = v.rules;
    }

    // 바뀐 칸만 다시 그린다: 소식(입력 중 표시 등)이 올 때마다 통째로 다시 그리면 누르는 사이 버튼이 바뀌어 클릭이 빠진다
    set(el, html) { if (el && el.__html !== html) { el.innerHTML = html; el.__html = html; } }

    drawPlayers(v) {
      const byAt = {};
      for (const b of v.buttons) if (b.at && !['verdict', 'will'].includes(b.at)) (byAt[b.at] = byAt[b.at] || []).push(b);
      const box = this.root.querySelector('#cm-players');
      if (box.childElementCount !== v.players.length)
        box.innerHTML = v.players.map(() => '<div class="p"><div class="pl"></div><div class="ps"></div><div class="pb"></div></div>').join('');
      v.players.forEach((p, i) => {
        const row = box.children[i], [pl, ps, pb] = row.children;
        row.className = `p${p.alive ? '' : ' dead'}${p.me ? ' me' : ''}`;
        const tags = [];
        if (p.role && !p.me && p.alive) tags.push(`<span class="tag${p.ally ? ' ally' : ''}">${E(p.role)}${p.ally ? ' · 같은 편' : ''}</span>`);
        if (p.accused) tags.push('<span class="tag hot">재판</span>');
        if (p.acquitted) tags.push('<span class="tag">오늘 풀려남</span>');
        const votes = v.stage === 'vote' && p.alive ? `<span class="votes${p.votes ? ' on' : ''}">${p.votes}/${v.need}</span>` : '';
        this.set(pl, `<span class="no">${p.no}</span><span class="nm">${E(p.name)}${p.me ? ' (나)' : ''}</span>${votes}`);
        this.set(ps, `${p.alive ? '' : `<span class="muted">죽음 · ${E(p.role || '')} · ${E(p.died || '')}</span>`}${tags.join('')}${p.typing ? '<span class="typing">입력 중…</span>' : ''}`);
        this.set(pb, (byAt[p.id] || []).map(b => `<button data-act='${E(JSON.stringify(b.act))}' class="${p.myVote ? 'gold' : ''}" title="${E(b.label)}">${E(b.label.replace(/^\d+번 \S+(님)? ?/, '').replace(/^에게 /, '') || b.label)}</button>`).join(''));
        pb.style.display = pb.__html ? '' : 'none';
      });
    }

    drawBanner(v, now) {
      const el = this.root.querySelector('#cm-banner'), parts = [];
      if (v.result) {
        parts.push(`<div class="result ${v.result.winner}"><b>${E(v.result.text)}</b><p>${v.result.roles.map(r => `${r.no}번 ${E(r.name)} ${E(r.role)}${r.alive ? '' : '(죽음)'}`).join(' · ')}</p>
          <button data-room="again" class="gold">한 판 더</button> <button data-room="home">처음으로</button></div>`);
      } else {
        if (v.stage === 'vote') parts.push(`<b>투표 시간</b> · 재판에 필요한 표 ${v.need}표 · 왼쪽 이름 옆 버튼으로 투표합니다.${v.buttons.some(b => b.act.type === 'unvote') ? ` <button data-act='${E(JSON.stringify({type: 'unvote'}))}'>투표 취소</button>` : ''}`);
        if (v.stage === 'defense') parts.push(`<b>최후 변론</b> · ${E(v.accused)}님만 말할 수 있습니다.`);
        if (v.stage === 'verdict') {
          const vb = v.buttons.filter(b => b.at === 'verdict');
          parts.push(`<b>찬반 투표</b> · ${E(v.accused)}님을 처형할까요? ${vb.map(b => `<button data-act='${E(JSON.stringify(b.act))}' class="${v.myVerdict === b.label ? 'gold' : ''}">${E(b.label)}</button>`).join(' ')}${v.myVerdict ? ` <span class="muted">내 표: ${E(v.myVerdict)}</span>` : ''}`);
        }
        if (v.stage === 'night') {
          const nb = v.buttons.filter(b => b.act.type === 'night');
          const talk = v.chat.channel === 'mafia' ? ' 마피아끼리 대화할 수 있습니다.' : v.chat.channel === 'dead' ? ' 죽은 사람끼리 대화할 수 있습니다.' : '';
          parts.push(`<b>밤</b> · ${nb.length ? '왼쪽 이름 옆 버튼으로 능력을 씁니다.' : v.me.alive ? '아침을 기다립니다.' : '산 사람들의 밤이 끝나기를 기다립니다.'}${talk}`);
        }
        if (v.stage === 'talk') parts.push(`<b>낮 대화</b>${v.chat.whisper ? ' · 받는 사람을 고르면 귓속말이 됩니다.' : ''}`);
        if (v.stage === 'morning' || v.stage === 'execution') parts.push(`<b>${E(v.stageName)}</b>`);
      }
      parts.push(`<span id="cm-flash" class="flash">${E(this.flash || '')}</span>`);
      this.set(el, parts.join(' '));
    }

    drawLog(v) {
      const el = this.root.querySelector('#cm-log');
      const fresh = v.log.filter(l => !this.rendered.has(l.i));
      if (fresh.some(l => l.i < this.maxI)) { el.innerHTML = ''; this.rendered.clear(); this.maxI = 0; return this.drawLog(v); }
      let key = el.dataset.key || '';
      for (const l of fresh) {
        const k = `${l.day}|${l.stage === 'night' ? '밤' : l.stage === 'morning' ? '아침' : '낮'}`;
        if (k !== key) { key = k; const d = document.createElement('div'); d.className = 'sep'; d.textContent = `${l.day}일째 ${k.split('|')[1]}`; el.appendChild(d); }
        const d = document.createElement('div');
        d.className = `l ${l.kind}${l.mine ? ' mine' : ''}`;
        if (l.kind === 'chat' || l.kind === 'mafia' || l.kind === 'dead') d.innerHTML = `${l.kind !== 'chat' ? `<i>${l.kind === 'mafia' ? '마피아끼리' : '죽은 사람끼리'}</i> ` : ''}<b>${E(l.name)}</b> ${E(l.text)}`;
        else if (l.kind === 'whisper') d.innerHTML = `<i>귓속말 ${E(l.name)} → ${E(l.toName)}</i> ${E(l.text)}`;
        else if (l.kind === 'me') d.innerHTML = `<i>나에게만</i> ${E(l.text)}`;
        else d.textContent = l.text;
        el.appendChild(d);
        this.rendered.add(l.i); this.maxI = Math.max(this.maxI, l.i);
      }
      el.dataset.key = key;
      if (fresh.length && this.stick) el.scrollTop = el.scrollHeight;
    }

    drawSay(v) {
      const q = s => this.root.querySelector(s), sel = q('#cm-to'), input = q('#cm-text');
      const opts = [['', v.chat.channel ? v.chat.label : '말할 수 없음'], ...v.chat.whisperTo.map(x => [x.id, `귓속말 → ${x.label}`])];
      const key = JSON.stringify(opts);
      if (sel.dataset.key !== key) {
        const was = sel.value;
        sel.innerHTML = opts.map(([id, t]) => `<option value="${E(id)}">${E(t)}</option>`).join('');
        sel.value = opts.some(o => o[0] === was) ? was : '';
        sel.dataset.key = key;
      }
      const can = !!(v.chat.channel || v.chat.whisper);
      input.disabled = !can; q('#cm-say button').disabled = !can; sel.disabled = !can;
      input.placeholder = can ? (sel.value ? '귓속말을 쓰고 Enter' : `${v.chat.label} · 글을 쓰고 Enter`) : (v.chat.why || '지금은 말할 수 없습니다');
    }

    // ── AI끼리 하는 판 보기 ── 서버가 보는 사람에게만 주는 판 전체의 보기(ChatMafia.watchView)를 그린다. 보내는 것은 없다.
    // "시민 눈으로 보기": 공개된 것(공개 대화·알림·죽은 사람의 직업)만 보인다 — 판에 낀 시민이 보는 만큼.
    watchFrame() {
      this.mode = 'watch';
      this.rendered.clear(); this.maxI = 0; this.stick = true;
      this.root.innerHTML = `<section class="game watch">
        <header><b>8인 채팅 마피아</b><span class="tag hot">관전</span><span id="cm-stage"></span>
          <label class="eye"><input type="checkbox" id="cm-citizen"${this.citizen ? ' checked' : ''}> 시민 눈으로 보기</label>
          <span id="cm-time" class="time"></span></header>
        <div class="cols">
          <aside class="players"><h3>AI 여덟</h3><div id="cm-players"></div></aside>
          <div class="center">
            <div id="cm-banner" class="banner"></div>
            <div id="cm-log" class="log"></div>
          </div>
          <aside class="side">
            <h3>밤 행동</h3><div id="cm-night" class="card"></div>
            <h3>AI 활동 <span class="muted small">(AI에게 물은 수 · 그 답으로 한 일)</span></h3><div id="cm-ai" class="card"></div>
            <details><summary>규칙 보기</summary><pre id="cm-rules"></pre></details>
            <p class="muted small" id="cm-watchers"></p>
            <button data-room="home">그만 보기</button>
          </aside>
        </div>
      </section>`;
      const log = this.root.querySelector('#cm-log');
      log.addEventListener('scroll', () => { this.stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30; });
      this.root.querySelector('#cm-citizen').onchange = e => {
        this.citizen = e.target.checked;
        try { localStorage.setItem('cm-watch-citizen', this.citizen ? '1' : '0'); } catch (err) {}
        log.innerHTML = ''; log.dataset.key = ''; this.rendered.clear(); this.maxI = 0; this.stick = true;
        const now = this.engine.room.now;
        if (now && now.view) this.drawWatch(now.view, now);
      };
    }

    drawWatch(v, now) {
      if (this.mode !== 'watch') this.watchFrame();
      const q = s => this.root.querySelector(s), full = !this.citizen;
      q('#cm-stage').textContent = v.stageName;
      this.drawWatchPlayers(v, full);
      this.drawWatchBanner(v, full);
      this.drawWatchLog(v, full);
      this.set(q('#cm-night'), !full ? '<span class="muted">시민 눈으로 볼 때는 숨깁니다.</span>'
        : v.night.length ? v.night.map(n => `<div><b>${E(n.role)}</b> ${E(n.text)}</div>`).join('') : '<span class="muted">밤이 되면 여기에 AI들이 고른 것이 보입니다. 밤이 끝나면 대화 기록에 밤에 일어난 일이 차례로 나옵니다.</span>');
      const ai = v.players.filter(p => p.ai);
      this.set(q('#cm-ai'), `<table class="ait"><tr class="h"><td></td><td>물음</td><td>말</td><td>귓말</td><td>누름</td><td>기다림</td><td>답없음</td></tr>${ai.map(p => `<tr class="${p.alive ? '' : 'dead'}"><td>${p.no} ${E(p.name)}</td>${['asks', 'said', 'whispers', 'pressed', 'waited', 'failed'].map(k => `<td>${p.ai[k]}</td>`).join('')}</tr>`).join('')}</table>`);
      q('#cm-rules').textContent = v.rules;
      q('#cm-watchers').textContent = `보는 사람 ${now.watchers || 1}명 · 방 이름 ${now.room}`;
    }

    drawWatchPlayers(v, full) {
      const box = this.root.querySelector('#cm-players');
      if (box.childElementCount !== v.players.length)
        box.innerHTML = v.players.map(() => '<div class="p"><div class="pl"></div><div class="ps"></div></div>').join('');
      v.players.forEach((p, i) => {
        const row = box.children[i], [pl, ps] = row.children;
        const showRole = full || !p.alive;
        row.className = `p${p.alive ? '' : ' dead'}${showRole ? ' t-' + p.team : ''}`;
        const votes = v.stage === 'vote' && p.alive ? `<span class="votes${p.votes ? ' on' : ''}">${p.votes}/${v.need}</span>` : '';
        this.set(pl, `<span class="no">${p.no}</span><span class="nm">${E(p.name)}</span>${showRole ? `<span class="tag ${p.team}">${E(p.role)}${p.contacted ? ' · 접선' : ''}</span>` : ''}${votes}`);
        const bits = [];
        if (!p.alive) bits.push(`<span class="muted">죽음 · ${E(p.died || '')}</span>`);
        if (p.accused) bits.push('<span class="tag hot">재판</span>');
        if (p.acquitted) bits.push('<span class="tag">오늘 풀려남</span>');
        if (p.votedFor) bits.push(`<span class="muted">→ ${E(p.votedFor)}</span>`);
        if (p.verdict && full) bits.push(`<span class="tag">${E(p.verdict)}</span>`);
        if (p.thinking && full) bits.push('<span class="thinking">생각 중…</span>');
        if (p.typing && (full || p.typing.pub)) bits.push(`<span class="typing">입력 중…${full && !p.typing.pub ? ` (${E(p.typing.to)})` : ''}</span>`);
        if (full && p.will && p.alive) bits.push(`<div class="will">유언: ${E(p.will)}</div>`);
        this.set(ps, bits.join(' '));
      });
    }

    drawWatchBanner(v, full) {
      const el = this.root.querySelector('#cm-banner'), parts = [];
      if (v.result) {
        parts.push(`<div class="result ${v.result.winner}"><b>${E(v.result.text)}</b> <span class="muted">${v.result.day}일째</span><p>${v.result.roles.map(r => `${r.no}번 ${E(r.name)} ${E(r.role)}${r.alive ? '' : '(죽음)'}`).join(' · ')}</p>
          <button data-room="again-watch" class="gold">한 판 더 보기</button> <button data-room="home">처음으로</button></div>`);
      } else {
        if (v.stage === 'talk') parts.push('<b>낮 대화</b>');
        if (v.stage === 'vote') parts.push(`<b>투표 시간</b> · 재판에 필요한 표 ${v.need}표`);
        if (v.stage === 'defense') parts.push(`<b>최후 변론</b> · ${E(v.accused)}`);
        if (v.stage === 'verdict') parts.push(`<b>찬반 투표</b> · ${E(v.accused)}${full && v.tally ? ` · 지금 찬성 ${v.tally.yes} · 반대 ${v.tally.no} · 안 누름 ${v.tally.voters - v.tally.yes - v.tally.no}` : ''}`);
        if (v.stage === 'night') parts.push(`<b>밤</b>${full ? ' · 마피아끼리 대화와 밤 행동이 보입니다' : ''}`);
        if (v.stage === 'morning' || v.stage === 'execution') parts.push(`<b>${E(v.stageName)}</b>`);
      }
      parts.push(`<span id="cm-flash" class="flash">${E(this.flash || '')}</span>`);
      this.set(el, parts.join(' '));
    }

    drawWatchLog(v, full) {
      const el = this.root.querySelector('#cm-log');
      const lines = full ? v.log : v.log.filter(l => l.pub);
      const fresh = lines.filter(l => !this.rendered.has(l.i));
      if (fresh.some(l => l.i < this.maxI)) { el.innerHTML = ''; el.dataset.key = ''; this.rendered.clear(); this.maxI = 0; return this.drawWatchLog(v, full); }
      let key = el.dataset.key || '', step = 0;
      const live = this.rendered.size > 0;   // 처음 그릴 때(들어오거나 다시 불러올 때)는 차례 없이 바로
      for (const l of fresh) {
        const k = `${l.day}|${l.stage === 'night' ? '밤' : l.stage === 'morning' ? '아침' : '낮'}`;
        if (k !== key) { key = k; const d = document.createElement('div'); d.className = 'sep'; d.textContent = `${l.day}일째 ${k.split('|')[1]}`; el.appendChild(d); }
        const d = document.createElement('div');
        d.className = `l ${l.kind}${!l.pub ? ' hidden-line' : ''}${l.place === '마피아끼리' ? ' mafia' : ''}`;
        if (live && (l.kind === 'story' || step)) { step++; d.classList.add('later'); d.style.animationDelay = `${(step - 1) * 1.4}s`; }
        const tag = l.place ? `<i>${E(l.place)}</i> ` : '';
        if (l.kind === 'chat' || l.kind === 'mafia' || l.kind === 'dead') d.innerHTML = `${tag}<b>${E(l.name)}</b> ${E(l.text)}`;
        else if (l.kind === 'whisper') d.innerHTML = `${tag}${E(l.text)}`;
        else d.innerHTML = `${tag}${E(l.text)}`;
        el.appendChild(d);
        this.rendered.add(l.i); this.maxI = Math.max(this.maxI, l.i);
      }
      el.dataset.key = key;
      if (fresh.length && this.stick) el.scrollTop = el.scrollHeight;
    }
  });
})();
