// 8인 채팅 마피아 — 규칙의 바탕. 서버(room_host.js)와 브라우저가 같은 파일을 읽는다.
// 2026-11-26 사용자 승인: "네, 새로 만들기"(밤의 증언은 보관, 8인 채팅 마피아를 새로 만든다).
// 같은 날 사용자 결정: 재판 투표 "과반이면 바로", 귓속말 "넣기", 첫날 "투표 없이 밤으로", 조력자 "밤마다 직업 알아보기".
// 사람의 화면과 AI의 화면 글은 모두 view()가 만든 같은 보기에서 나온다(사람과 AI가 같은 것을 본다).
(function () {
  'use strict';

  const DEFAULTS = {
    자리: 8,
    구성: {mafia: 2, helper: 1, police: 1, doctor: 1, citizen: 3},
    첫날_대화초: 60, 첫날_투표: false,
    낮_한사람당초: 15, 투표초: 30, 변론초: 15, 찬반초: 10, 처형초: 6, 밤초: 25, 아침초: 6,
    재투표_최소초: 5,
    유언_최대글자: 120,
    AI: {단계첫물음초: [0.5, 2.5], 다시묻기초: [4, 8], 조용할때초: [14, 20], 죽은뒤다시묻기초: [15, 25],
         초당글자: [3, 5], 입력최소초: 1, 입력최대초: 8, 동시입력: 2, 입력대기최대초: 8, 답기다림최대초: 20}
  };

  const ROLES = {
    mafia: {name: '마피아', team: 'mafia',
      desc: '마피아 편이다. 다른 마피아가 누구인지 안다. 밤에 마피아끼리만 대화하고, 습격할 사람 한 명을 고른다. 마피아끼리 다르게 고르면 마지막에 고른 사람이 습격당한다.'},
    helper: {name: '조력자', team: 'mafia',
      desc: '마피아 편이다. 처음에는 마피아가 누구인지 모르고, 마피아도 조력자를 모른다. 밤마다 한 명을 골라 그 사람의 직업을 바로 안다. 마피아를 찾으면 접선한다: 그때부터 마피아와 서로 알고, 마피아의 밤 대화에 끼고, 마피아 편 수에 든다. 경찰이 조사하면 "마피아가 아닙니다"로 나온다.'},
    police: {name: '경찰', team: 'town',
      desc: '시민 편이다. 밤마다 한 명을 조사해 그 사람이 마피아인지 아닌지 바로 안다. 결과는 나만 안다.'},
    doctor: {name: '의사', team: 'town',
      desc: '시민 편이다. 밤마다 한 명을 고른다(나도 된다). 그날 밤 마피아가 그 사람을 습격하면 살린다.'},
    citizen: {name: '시민', team: 'town',
      desc: '시민 편이다. 밤에 하는 일이 없다. 낮 대화와 투표로 마피아를 찾는다.'}
  };
  const ROLE_ORDER = ['mafia', 'helper', 'police', 'doctor', 'citizen'];

  function config(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {...DEFAULTS, ...r, 구성: {...DEFAULTS.구성, ...(r.구성 || {})}, AI: {...DEFAULTS.AI, ...(r.AI || {})}};
  }

  function rulesText(cfg) {
    const c = cfg.구성, n = Object.values(c).reduce((a, b) => a + b, 0);
    const parts = ROLE_ORDER.filter(k => c[k]).map(k => `${ROLES[k].name} ${c[k]}`).join(', ');
    return [
      `- ${n}명이 한다: ${parts}. 내 직업은 나만 안다.`,
      '- 편: 마피아와 조력자는 마피아 편, 경찰·의사·시민은 시민 편이다.',
      '- 승리: 마피아가 모두 죽으면 시민 편이 이긴다. 살아 있는 마피아 편(마피아와 접선한 조력자)의 수가 나머지 산 사람 수와 같거나 많아지면 마피아 편이 이긴다.',
      `- 첫날: ${cfg.첫날_대화초}초 대화하고 ${cfg.첫날_투표 ? '투표한다' : '투표 없이 밤이 된다'}.`,
      `- 둘째 날부터: 아침 발표 → 낮 대화(살아 있는 사람 수 × ${cfg.낮_한사람당초}초) → 투표 ${cfg.투표초}초 → (재판이 열리면) 최후 변론 ${cfg.변론초}초 → 찬반 투표 ${cfg.찬반초}초 → 밤 ${cfg.밤초}초.`,
      '- 투표: 투표 시간에 산 사람은 다른 산 사람 한 명에게 표를 줄 수 있다. 표는 바꾸거나 취소할 수 있고, 누가 누구에게 줬는지 모두에게 바로 보인다. 한 사람의 표가 산 사람의 과반이 되면 그 자리에서 재판이 열린다. 투표 시간이 끝날 때까지 과반이 없으면 밤이 된다. 투표 시간에도 대화와 귓속말을 할 수 있다.',
      '- 최후 변론: 재판에 선 사람만 말할 수 있다.',
      '- 찬반 투표: 재판에 선 사람을 뺀 산 사람이 찬성이나 반대를 누른다. 찬성이 투표할 수 있는 사람의 절반을 넘으면 처형한다. 누르지 않으면 반대로 센다. 누가 무엇을 눌렀는지는 끝난 뒤 공개된다.',
      `- 풀려나면: 남은 투표 시간이 ${cfg.재투표_최소초}초 이상이면 투표로 돌아간다. 표는 처음부터 다시 받고, 그날 풀려난 사람에게는 표를 줄 수 없다.`,
      '- 처형되거나 밤에 습격당해 죽으면 그 사람의 직업과 유언이 모두에게 공개된다.',
      '- 귓속말: 낮(대화·투표·찬반 시간)에 산 사람 한 명에게만 보낼 수 있다. 내용은 둘만 보고, 누가 누구에게 귓속말했는지는 모두에게 보인다.',
      '- 밤: 산 사람은 공개 대화를 할 수 없다. 마피아(와 접선한 조력자)는 마피아끼리 대화한다.',
      '- 직업:',
      ...ROLE_ORDER.map(k => `  · ${ROLES[k].name}: ${ROLES[k].desc}`),
      `- 유언: 살아 있는 동안 언제든 ${cfg.유언_최대글자}자까지 고칠 수 있다. 죽으면 공개된다.`,
      '- 죽은 사람: 죽은 사람끼리만 대화한다. 산 사람의 공개 대화는 계속 볼 수 있다.',
      '- 입력 중 표시: 누군가 글을 치고 있으면 그 글을 받을 사람들에게 "입력 중"이 보인다.'
    ].join('\n');
  }

  const find = (S, id) => S.players.find(p => p.id === id) || null;
  const alive = S => S.players.filter(p => p.alive);
  const mafiaSide = p => p.role === 'mafia' || (p.role === 'helper' && p.contacted);
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
      if (S.stage === 'night') {
        const N = S.night || {};
        if (me.role === 'mafia') for (const q of others) out.push({label: `${label(q)} 습격`, act: {type: 'night', target: q.id}, at: q.id});
        if (me.role === 'police' && !N.police) for (const q of others) out.push({label: `${label(q)} 조사`, act: {type: 'night', target: q.id}, at: q.id});
        if (me.role === 'doctor') for (const q of alive(S)) out.push({label: `${label(q)} 치료`, act: {type: 'night', target: q.id}, at: q.id});
        if (me.role === 'helper' && !N.helper) for (const q of others) out.push({label: `${label(q)} 직업 알아보기`, act: {type: 'night', target: q.id}, at: q.id});
      }
      out.push({label: '유언 고치기', act: {type: 'will'}, text: true, at: 'will'});
    }
    return out;
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
      role: over || !q.alive || q.id === id || ally(q) ? ROLES[q.role].name : null,
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
      title: '8인 채팅 마피아', day: S.day, stage: S.stage, stageName: stageName(S), left: Math.max(0, Math.ceil((S.endsAt || 0) - now)),
      me: {id, no: me.no, name: me.name, alive: me.alive, role: ROLES[me.role].name, roleDesc: ROLES[me.role].desc,
           team: ROLES[me.role].team === 'mafia' ? '마피아 편' : '시민 편', will: me.will || '', contacted: !!me.contacted},
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

  // 보기 → 화면 글(AI가 받는 화면). 사람 화면에 보이는 칸을 같은 차례로 글로 옮긴다.
  function lineText(l) {
    if (l.kind === 'chat') return `${l.name}: ${l.text}`;
    if (l.kind === 'mafia') return `(마피아끼리) ${l.name}: ${l.text}`;
    if (l.kind === 'dead') return `(죽은 사람끼리) ${l.name}: ${l.text}`;
    if (l.kind === 'whisper') return `(귓속말 ${l.name} → ${l.toName}) ${l.text}`;
    if (l.kind === 'me') return `(나에게만) ${l.text}`;
    return `[알림] ${l.text}`;
  }
  function screenText(v) {
    if (!v || v.missing) return '(화면 없음)';
    const L = [];
    L.push(`[${v.title}]`);
    L.push(`지금: ${v.stageName} · 남은 시간 ${v.left}초${v.need ? ` · 재판에 필요한 표 ${v.need}표` : ''}${v.accused ? ` · 재판에 선 사람: ${v.accused}` : ''}`);
    L.push(`나: ${v.me.no}번 ${v.me.name} · 직업 ${v.me.role} (${v.me.team}) · ${v.me.alive ? '살아 있음' : '죽음'}`);
    L.push(`내 직업: ${v.me.roleDesc}`);
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

  // 역할 나누기: 자리 목록을 섞어 구성대로 준다
  function deal(players, cfg, rnd) {
    const bag = [];
    for (const k of ROLE_ORDER) for (let i = 0; i < (cfg.구성[k] || 0); i++) bag.push(k);
    while (bag.length < players.length) bag.push('citizen');
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    return players.map((p, i) => ({...p, no: i + 1, role: bag[i], alive: true, will: '', contacted: false, died: null}));
  }

  // 승패: 마피아가 모두 죽으면 시민 편, 마피아 편 수 ≥ 나머지 산 사람 수면 마피아 편
  function winner(S) {
    const live = alive(S);
    if (!live.some(p => p.role === 'mafia')) return 'town';
    const m = live.filter(mafiaSide).length;
    if (m >= live.length - m) return 'mafia';
    return null;
  }

  globalThis.ChatMafia = {DEFAULTS, ROLES, ROLE_ORDER, config, rulesText, find, alive, mafiaSide, label, needVotes, mafiaRoom,
                          chatPlace, recipients, canSee, stageName, buttonsFor, view, screenText, lineText, deal, winner};
})();
