// 채팅 마피아 — 규칙의 바탕. 서버(room_host.js)와 브라우저가 같은 파일을 읽는다. 직업과 밤 처리는 00Roles.js(ChatMafiaRoles).
// 2026-11-26 사용자 승인: "네, 새로 만들기"(밤의 증언은 보관, 8인 채팅 마피아를 새로 만든다).
// 같은 날 사용자 결정: 재판 투표 "과반이면 바로", 귓속말 "넣기", 첫날 "투표 없이 밤으로". 같은 날 밤: 스타2 마피아 직업, 11명(시민 편 7·마피아 2·중립 2), 무리별 무작위 칸.
// 사람의 화면과 AI의 화면 글은 모두 view()가 만든 같은 보기에서 나온다(사람과 AI가 같은 것을 본다).
(function () {
  'use strict';
  const RR = globalThis.ChatMafiaRoles;

  const DEFAULTS = {
    자리: 11,
    칸: RR.SLOTS,
    첫날_대화초: 60, 첫날_투표: false,
    낮_한사람당초: 15, 투표초: 30, 변론초: 15, 찬반초: 10, 처형초: 6, 밤초: 25, 아침초: 6,
    재투표_최소초: 5,
    유언_최대글자: 120,
    AI: {단계첫물음초: [0.5, 2.5], 다시묻기초: [4, 8], 조용할때초: [14, 20], 죽은뒤다시묻기초: [15, 25],
         // 치는 시간: 글자 수 ÷ 초당글자. 2026-11-26 사용자 선택 "사람의 손과 눈 맞추기"로 8초 상한을 없앴다(사람은 긴 글을 빨리 칠 수 없다). 읽기는 그대로(AI는 다 읽는다).
         초당글자: [3, 5], 입력최소초: 1, 동시입력: 2, 입력대기최대초: 8, 답기다림최대초: 20,
         // 단계에 남은 시간이 이보다 짧으면 실제 AI에게 묻지 않는다(다음 단계가 열리면 묻는다). 2026-11-26 실제 AI 두 판:
         // 답 333번 중 319번이 6초 안(중앙 4.3초), 아침(6초) 물음 27번 중 11번·처형(6초) 10번 중 4번이 시간 초과.
         답최소기다림초: 6}
  };

  const ROLES = RR.ROLES;

  function config(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const 칸 = Array.isArray(r.칸) && r.칸.every(k => RR.POOLS[k]) ? r.칸 : DEFAULTS.칸;
    return {...DEFAULTS, ...r, 칸, 자리: 칸.length, AI: {...DEFAULTS.AI, ...(r.AI || {})}};
  }

  function rulesText(cfg) {
    return [
      `- ${cfg.칸.length}명이 한다. 내 직업은 나만 안다(마피아끼리는 서로 안다).`,
      `- 첫날: ${cfg.첫날_대화초}초 대화하고 ${cfg.첫날_투표 ? '투표한다' : '투표 없이 밤이 된다'}.`,
      `- 둘째 날부터: 아침 발표 → 낮 대화(살아 있는 사람 수 × ${cfg.낮_한사람당초}초) → 투표 ${cfg.투표초}초 → (재판이 열리면) 최후 변론 ${cfg.변론초}초 → 찬반 투표 ${cfg.찬반초}초 → 밤 ${cfg.밤초}초.`,
      '- 투표: 투표 시간에 산 사람은 다른 산 사람 한 명에게 표를 줄 수 있다. 표는 바꾸거나 취소할 수 있고, 누가 누구에게 줬는지 모두에게 바로 보인다. 한 사람의 표가 산 사람의 과반이 되면 그 자리에서 재판이 열린다. 투표 시간이 끝날 때까지 과반이 없으면 밤이 된다. 투표 시간에도 대화와 귓속말을 할 수 있다.',
      '- 최후 변론: 재판에 선 사람만 말할 수 있다.',
      '- 찬반 투표: 재판에 선 사람을 뺀 산 사람이 찬성이나 반대를 누른다. 찬성이 투표할 수 있는 사람의 절반을 넘으면 처형한다. 누르지 않으면 반대로 센다. 누가 무엇을 눌렀는지는 끝난 뒤 공개된다.',
      `- 풀려나면: 남은 투표 시간이 ${cfg.재투표_최소초}초 이상이면 투표로 돌아간다. 표는 처음부터 다시 받고, 그날 풀려난 사람에게는 표를 줄 수 없다.`,
      '- 죽으면 그 사람의 직업과 유언이 모두에게 공개된다(청소부가 청소한 사람은 빼고).',
      '- 표의 무게: 시장임을 밝힌 사람의 표는 투표와 찬반에서 3표로 센다. 재판에 필요한 표는 산 사람 수의 과반이다.',
      '- 협박: 협박받은 사람은 그날 낮(최후 변론 포함)에 공개 대화도 귓속말도 할 수 없다.',
      '- 귓속말: 낮(대화·투표·찬반 시간)에 산 사람 한 명에게만 보낼 수 있다. 내용은 둘만 보고, 누가 누구에게 귓속말했는지는 모두에게 보인다.',
      '- 밤: 산 사람은 공개 대화를 할 수 없다. 마피아는 마피아끼리 대화한다(스파이는 누가 했는지 모른 채 듣는다). 밤에 고른 능력은 밤이 끝날 때 한꺼번에 처리되고, 결과는 아침이 되기 전에 각자에게만 알려진다.',
      RR.rolesText(cfg.칸),
      `- 유언: 살아 있는 동안 언제든 ${cfg.유언_최대글자}자까지 고칠 수 있다. 죽으면 공개된다.`,
      '- 죽은 사람: 죽은 사람끼리만 대화한다. 산 사람의 공개 대화는 계속 볼 수 있다.',
      '- 입력 중 표시: 누군가 글을 치고 있으면 그 글을 받을 사람들에게 "입력 중"이 보인다.'
    ].join('\n');
  }

  const find = (S, id) => S.players.find(p => p.id === id) || null;
  const alive = S => S.players.filter(p => p.alive);
  const mafiaSide = p => RR.isMafia(p);
  const label = p => `${p.no}번 ${p.name}`;
  const needVotes = S => Math.floor(alive(S).length / 2) + 1;

  // 마피아 밤 대화를 받는 사람(그때의 산 마피아 편)
  const mafiaRoom = S => alive(S).filter(mafiaSide).map(p => p.id);

  // 그 사람이 지금 채팅을 어디로 보낼 수 있나
  function chatPlace(S, p) {
    if (!p) return {channel: null, whisper: false, why: '판에 없는 자리입니다.'};
    if (S.stage === 'over') return {channel: 'all', label: '판이 끝났습니다 · 모두에게', whisper: false};
    if (!p.alive) return {channel: 'dead', label: '죽은 사람끼리', whisper: false};
    const day = ['talk', 'vote', 'verdict', 'morning', 'execution'].includes(S.stage);
    if ((day || S.stage === 'defense') && S.silenced && S.silenced[p.id] === S.day) return {channel: null, whisper: false, why: '협박을 받아 오늘 낮에는 말할 수 없습니다.'};
    if (S.stage === 'defense') return S.accused === p.id
      ? {channel: 'all', label: '최후 변론 · 모두에게', whisper: false}
      : {channel: null, whisper: false, why: '최후 변론 중에는 재판에 선 사람만 말할 수 있습니다.'};
    if (S.stage === 'night') return mafiaSide(p)
      ? {channel: 'mafia', label: '마피아끼리', whisper: false}
      : {channel: null, whisper: false, why: '밤에는 말할 수 없습니다.'};
    if (day) return {channel: 'all', label: '모두에게', whisper: ['talk', 'vote', 'verdict'].includes(S.stage)};
    return {channel: null, whisper: false, why: '지금은 말할 수 없습니다.'};
  }

  // 채널 → 받는 사람 id 목록
  function recipients(S, channel, from) {
    if (channel === 'all') return S.players.map(p => p.id);
    if (channel === 'dead') return S.players.filter(p => !p.alive).map(p => p.id);
    if (channel === 'mafia') return mafiaRoom(S);
    return [from];
  }

  function canSee(S, p, line) {
    if (S.stage === 'over') return true;            // 판이 끝나면 모든 기록(마피아 대화·귓속말 포함)이 열린다
    if (line.to === 'all') return true;
    if (line.to === 'dead') return !p.alive;
    return Array.isArray(line.to) && line.to.includes(p.id);
  }

  function stageName(S) {
    const d = `${S.day}일째`;
    return ({talk: `${d} 낮 · 대화`, vote: `${d} 낮 · 투표`, defense: `${d} 낮 · 최후 변론`, verdict: `${d} 낮 · 찬반 투표`,
             execution: `${d} 낮 · 처형`, night: `${d} 밤`, morning: `${d} 아침`, over: '판 끝'})[S.stage] || '준비';
  }

  // 누를 수 있는 버튼. 사람 화면의 버튼과 AI 화면 글의 버튼은 이 목록 하나에서 나온다.
  function buttonsFor(S, me) {
    const out = [];
    if (!me || S.stage === 'over') return out;
    if (me.alive) {
      const others = alive(S).filter(q => q.id !== me.id);
      if (S.stage === 'vote') {
        for (const q of others) if (!S.acquitted.includes(q.id)) out.push({label: `${label(q)}에게 투표`, act: {type: 'vote', target: q.id}, at: q.id});
        if (S.votes[me.id]) out.push({label: '투표 취소', act: {type: 'unvote'}});
      }
      if (S.stage === 'verdict' && S.accused && S.accused !== me.id) {
        out.push({label: '찬성(처형)', act: {type: 'verdict', yes: true}, at: 'verdict'});
        out.push({label: '반대(살림)', act: {type: 'verdict', yes: false}, at: 'verdict'});
      }
      if (S.stage === 'night') out.push(...RR.nightButtons(S, me));
      if (me.role === 'mayor' && !me.revealed && ['talk', 'vote', 'verdict'].includes(S.stage)) out.push({label: '시장임을 밝히기', act: {type: 'reveal'}, at: 'self'});
      out.push({label: '유언 고치기', act: {type: 'will'}, text: true, at: 'will'});
    }
    return out;
  }

  function myNotes(S, me) {
    const n = [];
    if (me.uses != null) n.push(`남은 횟수: ${me.uses}`);
    if (me.role === 'executioner') { const t = find(S, me.target); n.push(t ? `내 목표: ${label(t)}${t.alive ? '' : '(죽음)'}${me.won ? ' — 처형됨, 이김' : ''}` : '내 목표: 없음'); }
    if (me.role === 'massmurderer' && S.spreeRest && S.spreeRest[me.id] === S.day) n.push('오늘 밤은 쉬어야 한다(지난밤 살육함)');
    if (me.doused) n.push('기름을 뒤집어쓴 상태');
    if (S.silenced && S.silenced[me.id] === S.day) n.push('협박을 받아 오늘 낮에는 말할 수 없음');
    if (me.revealed) n.push('시장임을 밝힘(내 표는 3표)');
    if (me.won && me.role === 'jester') n.push('처형되어 이김');
    return n;
  }

  // 그 자리가 봐도 되는 것 전부. 화면(사람)과 화면 글(AI)이 모두 이것만 쓴다.
  function view(S, id, now) {
    const me = find(S, id);
    if (!me) return {missing: true};
    const over = S.stage === 'over';
    const ally = q => mafiaSide(me) && me.alive && mafiaSide(q);
    const typingIds = Object.entries(S.typing || {}).filter(([who, t]) => t.until > now && who !== id && (t.to === 'all' || t.to.includes(id))).map(([who]) => who);
    const players = S.players.map(q => ({
      id: q.id, no: q.no, name: q.name, me: q.id === id, alive: q.alive,
      role: over || (!q.alive && !q.cleaned) || q.id === id || ally(q) || (q.role === 'mayor' && q.revealed) ? ROLES[q.role].name : !q.alive ? '알 수 없음' : null,
      ally: !over && q.id !== id && ally(q),
      died: q.died ? `${q.died.day}일째 ${q.died.how}` : null,
      typing: typingIds.includes(q.id),
      votes: S.stage === 'vote' ? Object.values(S.votes).filter(t => t === q.id).length : 0,
      myVote: S.votes[id] === q.id,
      acquitted: S.stage === 'vote' && S.acquitted.includes(q.id),
      accused: S.accused === q.id && ['defense', 'verdict'].includes(S.stage)
    }));
    const log = S.log.filter(l => canSee(S, me, l)).map(l => ({i: l.i, day: l.day, stage: l.stage, kind: l.kind, name: l.name || null, from: l.from || null,
      text: l.text, toName: l.toName || null, mine: l.from === id}));
    const place = chatPlace(S, me);
    return {
      title: '11인 채팅 마피아', day: S.day, stage: S.stage, stageName: stageName(S), left: Math.max(0, Math.ceil((S.endsAt || 0) - now)),
      me: {id, no: me.no, name: me.name, alive: me.alive, role: ROLES[me.role].name, roleDesc: ROLES[me.role].desc,
           team: RR.teamName(me), will: me.will || '', notes: myNotes(S, me)},
      players, log,
      need: S.stage === 'vote' ? needVotes(S) : 0,
      accused: S.accused && ['defense', 'verdict'].includes(S.stage) ? label(find(S, S.accused)) : null,
      myVerdict: S.stage === 'verdict' && id in (S.verdict || {}) ? (S.verdict[id] ? '찬성(처형)' : '반대(살림)') : null,
      buttons: buttonsFor(S, me),
      chat: {channel: place.channel, label: place.label || '', whisper: !!place.whisper, why: place.why || '',
             whisperTo: place.whisper ? alive(S).filter(q => q.id !== id).map(q => ({id: q.id, label: label(q)})) : []},
      result: S.result || null,
      rules: rulesText(S.cfg)
    };
  }

  // 보는 사람(AI끼리 하는 판을 보는 사람)의 보기: 모든 직업, 모든 대화(마피아끼리·귓속말·나에게만), 밤 행동, AI가 생각/입력 중인지.
  // 엔진은 이 보기를 관전 방(AI 자리만 있는 방)의 보는 사람에게만 준다. 판에 낀 자리(사람·AI)는 이것을 받지 않는다.
  function placeOf(S, l) {
    if (l.kind === 'story') return '밤에 일어난 일';
    if (l.to === 'all') return '';
    if (l.to === 'dead') return '죽은 사람끼리';
    if (l.kind === 'mafia' || l.ch === 'mafia') return '마피아끼리';
    if (l.kind === 'spy') return '스파이가 엿들음';
    if (l.kind === 'whisper') return `귓속말 ${l.name} → ${l.toName}`;
    const who = (Array.isArray(l.to) ? l.to : []).map(id => find(S, id)).filter(Boolean);
    return `${who.map(label).join(', ')}에게만`;
  }
  function typingTo(S, q, now) {
    const t = (S.typing || {})[q.id];
    if (!t || t.until <= now) return null;
    if (t.to === 'all') return {to: '모두에게', pub: true};
    if (Array.isArray(t.to) && t.to.length === 1 && t.to[0] !== q.id) { const r = find(S, t.to[0]); return {to: `귓속말 → ${r ? label(r) : '?'}`, pub: false}; }
    const ch = chatPlace(S, q).channel;
    return {to: ch === 'mafia' ? '마피아끼리' : ch === 'dead' ? '죽은 사람끼리' : '일부에게', pub: false};
  }
  function watchView(S, now) {
    const N = S.stage === 'night' && S.night ? S.night : null;
    const who = id => { const q = id && find(S, id); return q ? label(q) : '?'; };
    const night = [];
    if (N) for (const q of alive(S).filter(q => ROLES[q.role].night)) {
      const c = (N.acts || {})[q.id];
      night.push({role: `${ROLES[q.role].name} ${label(q)}`, text: !c ? '아직 고르지 않음' : c.mode === 'self' ? (q.role === 'veteran' ? '경계 서기' : '방탄조끼 입기') : c.mode === 'ignite' ? '모두 불태우기' : c.target2 ? `${who(c.target)} → ${who(c.target2)}` : c.target ? `${who(c.target)}${ROLES[q.role].night.two ? ' (둘째를 고르는 중)' : ''}` : '?'});
    }
    const players = S.players.map(q => {
      const B = S.bots && S.bots[q.id];
      return {
        id: q.id, no: q.no, name: q.name, alive: q.alive, bot: !!q.bot,
        role: ROLES[q.role].name, team: ROLES[q.role].team, mafiaSide: mafiaSide(q), revealed: !!q.revealed, notes: myNotes(S, q),
        died: q.died ? `${q.died.day}일째 ${q.died.how}` : null, will: q.will || '',
        typing: typingTo(S, q, now), thinking: !!(B && B.busy),
        votes: S.stage === 'vote' ? Object.values(S.votes).filter(t => t === q.id).length : 0,
        votedFor: S.stage === 'vote' && S.votes[q.id] ? who(S.votes[q.id]) : null,
        verdict: S.stage === 'verdict' && q.id in (S.verdict || {}) ? (S.verdict[q.id] ? '찬성' : '반대') : null,
        accused: S.accused === q.id && ['defense', 'verdict'].includes(S.stage),
        acquitted: S.stage === 'vote' && S.acquitted.includes(q.id),
        ai: B ? {asks: B.asks, answered: B.answered, failed: B.failed, said: B.said, whispers: B.whispers, pressed: B.pressed, waited: B.waited} : null
      };
    });
    const tally = S.stage === 'verdict' ? {yes: Object.values(S.verdict || {}).filter(x => x === true).length, no: Object.values(S.verdict || {}).filter(x => x === false).length,
                                            voters: alive(S).filter(q => q.id !== S.accused).length} : null;
    return {
      watching: true, title: '11인 채팅 마피아', day: S.day, stage: S.stage, stageName: stageName(S), left: Math.max(0, Math.ceil((S.endsAt || 0) - now)),
      need: S.stage === 'vote' ? needVotes(S) : 0,
      accused: S.accused && ['defense', 'verdict'].includes(S.stage) ? label(find(S, S.accused)) : null,
      tally, night, players,
      log: S.log.map(l => ({i: l.i, day: l.day, stage: l.stage, kind: l.kind, name: l.name || null, from: l.from || null, text: l.text, toName: l.toName || null,
                            pub: l.to === 'all', place: placeOf(S, l)})),
      result: S.result || null,
      rules: rulesText(S.cfg)
    };
  }

  // 보기 → 화면 글(AI가 받는 화면). 사람 화면에 보이는 칸을 같은 차례로 글로 옮긴다.
  function lineText(l) {
    if (l.kind === 'chat') return `${l.name}: ${l.text}`;
    if (l.kind === 'mafia') return `(마피아끼리) ${l.name}: ${l.text}`;
    if (l.kind === 'dead') return `(죽은 사람끼리) ${l.name}: ${l.text}`;
    if (l.kind === 'whisper') return `(귓속말 ${l.name} → ${l.toName}) ${l.text}`;
    if (l.kind === 'me') return `(나에게만) ${l.text}`;
    if (l.kind === 'spy') return `(스파이가 엿들음) ${l.text}`;
    if (l.kind === 'story') return `(밤에 일어난 일) ${l.text}`;
    return `[알림] ${l.text}`;
  }
  function screenText(v) {
    if (!v || v.missing) return '(화면 없음)';
    const L = [];
    L.push(`[${v.title}]`);
    L.push(`지금: ${v.stageName} · 남은 시간 ${v.left}초${v.need ? ` · 재판에 필요한 표 ${v.need}표` : ''}${v.accused ? ` · 재판에 선 사람: ${v.accused}` : ''}`);
    L.push(`나: ${v.me.no}번 ${v.me.name} · 직업 ${v.me.role} (${v.me.team}) · ${v.me.alive ? '살아 있음' : '죽음'}`);
    L.push(`내 직업: ${v.me.roleDesc}`);
    if (v.me.notes && v.me.notes.length) L.push(`내 상태: ${v.me.notes.join(' · ')}`);
    L.push('사람들:');
    for (const p of v.players) {
      const bits = [p.alive ? '살아 있음' : `죽음(${p.died || ''})`];
      if (p.role && !p.me) bits.push(`직업 ${p.role}${p.ally ? ' · 같은 편' : ''}`);
      if (p.accused) bits.push('재판에 섬');
      if (p.votes) bits.push(`받은 표 ${p.votes}`);
      if (p.myVote) bits.push('내가 표를 줌');
      if (p.acquitted) bits.push('오늘 풀려남(표를 줄 수 없음)');
      if (p.typing) bits.push('입력 중…');
      L.push(`  ${p.no}번 ${p.name}${p.me ? '(나)' : ''} — ${bits.join(' · ')}`);
    }
    if (v.myVerdict) L.push(`내 찬반: ${v.myVerdict}`);
    L.push('대화 기록(위가 먼저):');
    let key = '';
    for (const l of v.log) {
      const k = `${l.day}|${l.stage === 'night' ? '밤' : l.stage === 'morning' ? '아침' : '낮'}`;
      if (k !== key) { key = k; L.push(`  — ${l.day}일째 ${k.split('|')[1]} —`); }
      L.push('  ' + lineText(l));
    }
    if (!v.log.length) L.push('  (아직 없음)');
    L.push(`내 유언: ${v.me.will ? `"${v.me.will}"` : '(비어 있음)'}`);
    L.push('할 수 있는 것:');
    L.push(v.chat.channel ? `  채팅: 지금 쓸 수 있음 (${v.chat.label})` : `  채팅: ${v.chat.why || '지금은 쓸 수 없음'}`);
    if (v.chat.whisper) L.push(`  귓속말: 산 사람 한 명에게 보낼 수 있음 (${v.chat.whisperTo.map(x => x.label).join(', ')})`);
    if (v.buttons.length) L.push('  버튼: ' + v.buttons.map(b => `"${b.label}"${b.text ? '(글을 함께 적는다)' : ''}`).join(', '));
    else L.push('  버튼: 없음');
    if (v.result) L.push(`판 결과: ${v.result.text}`);
    L.push('규칙:');
    L.push(v.rules);
    return L.join('\n');
  }

  // 나누기: 칸마다 무리에서 하나씩 뽑아 섞어 준다(00Roles.js)
  const deal = (players, cfg, rnd) => RR.deal(players, cfg.칸, rnd);
  // 승패: null 또는 {winner, text}(00Roles.js)
  const winner = S => RR.winner(S);

  globalThis.ChatMafia = {DEFAULTS, ROLES, RR, config, rulesText, find, alive, mafiaSide, label, needVotes, mafiaRoom,
                          chatPlace, recipients, canSee, stageName, buttonsFor, view, watchView, placeOf, screenText, lineText, deal, winner};
})();
