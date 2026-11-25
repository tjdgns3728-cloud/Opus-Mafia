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
        <p class="notice">${E(this.notice)}</p>
      </section>`;
      const room = this.engine.room, name = () => { const v = this.root.querySelector('#cm-name').value.trim(); this.name = v; try { localStorage.setItem('cm-name', v); } catch (e) {} return v; };
      const answer = r => { if (r && !r.ok) { this.notice = r.error || '하지 못했습니다.'; this.home(); } };
      this.root.querySelector('#cm-make').onclick = async () => answer(await room.create(name()));
      this.root.querySelector('#cm-join').onclick = async () => answer(await room.join(this.root.querySelector('#cm-code').value.trim(), name()));
    }

    // ── 기다리는 방 ──
    lobby(now) {
      const host = now.host === true, seats = now.seats || [];      // now.host: 내가 방장인가(참/거짓)
      this.mode = 'lobby';
      this.root.innerHTML = `<section class="lobby">
        <p class="muted">방 이름 — 함께 할 사람에게 알려 주세요</p>
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
      this.root.addEventListener('click', async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const r = await room.act(JSON.parse(b.dataset.act));
        if (r && !r.ok) this.note(r.error);
      });
      this.root.addEventListener('click', async e => {
        const b = e.target.closest('[data-room]');
        if (!b) return;
        if (b.dataset.room === 'again') { const r = await room.reopen(); if (r && !r.ok) this.note(r.error); }
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
  });
})();
