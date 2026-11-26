// 채팅 마피아 — 직업과 밤 처리. 서버와 브라우저가 같은 파일을 읽는다(01Core.js보다 먼저).
// 2026-11-26 사용자: "제가 원하는 것은 스타2 마피아에서 나오는 직업들로 구성해야 합니다." 사용자 결정: 11명 = 시민 편 7 · 마피아 2 · 중립 2,
// 직업은 무리별 무작위 칸. 능력과 기본 설정은 스타2 마피아 위키(sc2mafia.fandom.com, 2026-11-26 읽음)의 기본값을 따르고,
// 이름과 글은 이 게임 것으로 쓴다(지도의 이름·글·화면은 가져오지 않는다).
// 밤 처리 순서(위키 Mechanics): 방탄조끼·경계 → 조종(마녀) → 자리 바꾸기(버스 기사) → 붙잡아 두기 → 모함·기름·협박 등 → 죽이기(동시에) → 청소 → 조사 → 기억하기.
(function () {
  'use strict';

  // 범죄 기록(조사관·고문이 보는 것). 그 사람이 실제로 한 일만 남는다.
  const CRIME = {trespass: '무단 침입', murder: '살인', solicit: '호객 행위', corrupt: '부패', property: '기물 파손', arson: '방화'};

  // night.kind: 밤에 하는 일. self = 대상 없이 나에게(조끼·경계), two = 두 사람을 차례로 고름, dead = 죽은 사람을 고름
  const ROLES = {
    // ── 시민 편 ──
    sheriff: {name: '보안관', team: 'town', group: '시민 조사', night: {kind: 'check'},
      desc: '밤마다 한 명을 조사한다. 결과: "마피아 일원", "연쇄살인마", "방화범", "대량살인마", 그 밖에는 "수상하지 않음". 대부는 수상하지 않게 나오고, 모함당한 사람은 마피아 일원으로 나온다.'},
    investigator: {name: '조사관', team: 'town', group: '시민 조사', night: {kind: 'crime'}, crimes: ['trespass'],
      desc: '밤마다 한 명의 범죄 기록을 본다. 그 사람이 지금까지 실제로 저지른 범죄 가운데 하나가 나온다(무단 침입·살인·호객 행위·부패·기물 파손·방화). 아무것도 안 했으면 "범죄 기록 없음". 대부는 "범죄 기록 없음"으로 나온다.'},
    detective: {name: '형사', team: 'town', group: '시민 조사', night: {kind: 'track'}, crimes: ['trespass'],
      desc: '밤마다 한 명을 뒤쫓아, 그 사람이 그날 밤 누구를 찾아갔는지 안다.'},
    lookout: {name: '망꾼', team: 'town', group: '시민 조사', night: {kind: 'watch'}, crimes: ['trespass'],
      desc: '밤마다 한 명의 집을 지켜보고, 그날 밤 그 집을 찾아온 사람을 모두 안다.'},
    doctor: {name: '의사', team: 'town', group: '시민 보호', night: {kind: 'heal'},
      desc: '밤마다 다른 사람 한 명을 치료한다. 그날 밤 그 사람이 공격당하면 한 번 살리고, 공격이 있었다는 것을 안다. 경호원과 밝힌 시장은 치료할 수 없다.'},
    bodyguard: {name: '경호원', team: 'town', group: '시민 보호', night: {kind: 'guard'}, crimes: ['murder'],
      desc: '밤마다 다른 사람 한 명을 경호한다. 그 사람을 찾아와 공격하는 사람이 있으면 경호원과 공격한 사람이 둘 다 죽고 그 사람은 산다. 경호원은 치료받을 수 없다.'},
    busdriver: {name: '버스 기사', team: 'town', group: '시민 보호', night: {kind: 'swap', two: true}, crimes: ['murder'],
      desc: '밤마다 다른 두 사람을 태워 자리를 바꾼다. 그날 밤 첫째에게 온 능력은 모두 둘째에게, 둘째에게 온 능력은 첫째에게 간다.'},
    vigilante: {name: '자경단', team: 'town', group: '시민 살해', night: {kind: 'shoot', uses: 2}, crimes: ['trespass', 'murder'],
      desc: '밤에 한 명을 쏜다. 총알은 판 전체에 두 발이다.'},
    veteran: {name: '퇴역 군인', team: 'town', group: '시민 살해', night: {kind: 'alert', self: true, uses: 2}, crimes: ['murder', 'property'],
      desc: '밤에 경계를 설 수 있다(판 전체에 두 번). 경계 선 밤에는 나를 찾아온 사람을 모두 죽이고(망꾼·기억상실자·청소부는 빼고), 나는 공격받아도 죽지 않는다. 밤에 공격받아도 죽지 않는 사람은 죽이지 못한다.'},
    spy: {name: '스파이', team: 'town', group: '시민 능력', night: null, crimes: ['trespass'],
      desc: '밤에 고르는 일은 없다. 마피아끼리 하는 밤 대화를 누가 했는지는 모른 채 듣고, 밤이 끝나면 마피아가 누구를 노렸는지 안다.'},
    mayor: {name: '시장', team: 'town', group: '시민 정부', night: null, day: {kind: 'reveal'},
      desc: '밤에 하는 일은 없다. 낮에 시장임을 밝힐 수 있고, 밝힌 뒤에는 투표와 찬반에서 내 표가 3표로 센다. 밝힌 뒤에는 치료받을 수 없다.'},
    escort: {name: '말동무', team: 'town', group: '시민 지원', night: {kind: 'block'}, crimes: ['solicit'],
      desc: '밤마다 다른 사람 한 명을 붙잡아 두어 그날 밤 그 사람의 능력을 막는다. 막힌 사람은 아무 데도 가지 않은 것이 된다.'},
    citizen: {name: '시민', team: 'town', group: '시민 정부', night: {kind: 'vest', self: true, uses: 1},
      desc: '방탄조끼가 하나 있어 원하는 밤에 입으면 그날 밤 공격을 막는다(불은 못 막는다). 마피아와 둘만 남으면 시민이 이긴다.'},
    // ── 마피아 ──
    godfather: {name: '대부', team: 'mafia', group: '마피아', night: {kind: 'kill'}, invuln: true, immune: true, crimes: ['trespass', 'murder'],
      desc: '마피아의 우두머리. 밤마다 죽일 사람 한 명을 정해 직접 죽인다. 밤에 공격받아도 죽지 않는다. 보안관에게는 수상하지 않게, 조사관에게는 범죄 기록이 없게 보인다.'},
    mafioso: {name: '마피아 조직원', team: 'mafia', group: '마피아', night: {kind: 'kill'}, crimes: ['trespass', 'murder'],
      desc: '밤마다 죽일 사람 한 명을 정해 죽인다. 대부가 죽어 죽일 사람이 없게 되면 남은 마피아가 조직원이 된다.'},
    framer: {name: '모함꾼', team: 'mafia', group: '마피아', night: {kind: 'frame'}, crimes: ['trespass'],
      desc: '밤마다 한 명을 모함한다. 그날 밤 그 사람은 보안관에게 마피아 일원으로, 조사관에게는 무단 침입이나 살인으로 보인다.'},
    consort: {name: '마담', team: 'mafia', group: '마피아', night: {kind: 'block'}, crimes: ['solicit'],
      desc: '밤마다 다른 사람 한 명을 붙잡아 두어 그날 밤 그 사람의 능력을 막는다.'},
    janitor: {name: '청소부', team: 'mafia', group: '마피아', night: {kind: 'clean', uses: 2}, crimes: ['trespass', 'property'],
      desc: '밤에 한 명을 청소한다(판 전체에 두 번). 그 사람이 그날 밤 죽으면 직업과 유언이 공개되지 않고, 나는 그 유언을 본다.'},
    consigliere: {name: '고문', team: 'mafia', group: '마피아', night: {kind: 'crime'}, crimes: ['trespass'],
      desc: '밤마다 한 명의 범죄 기록을 본다(조사관과 같은 결과).'},
    blackmailer: {name: '협박꾼', team: 'mafia', group: '마피아', night: {kind: 'silence'},
      desc: '밤마다 다른 사람 한 명을 협박한다. 그 사람은 다음 날 낮에 말을 할 수 없다(최후 변론도 못 한다).'},
    // ── 중립 ──
    jester: {name: '광대', team: 'neutral', group: '중립 선', night: {kind: 'annoy'},
      desc: '낮에 처형당하면 이긴다. 처형되면 그날 밤 찬성을 누른 사람 가운데 한 명이 무작위로 죽는다(막을 수 없다). 밤에는 한 명을 찾아가 귀찮게 할 수 있다(그 사람은 광대가 왔다는 것만 안다).'},
    survivor: {name: '생존자', team: 'neutral', group: '중립 선', night: {kind: 'vest', self: true, uses: 3},
      desc: '판이 끝날 때 살아 있으면 누가 이기든 함께 이긴다. 방탄조끼가 셋 있어 입은 밤에는 공격을 막는다(불은 못 막는다).'},
    executioner: {name: '처형인', team: 'neutral', group: '중립 선', night: null,
      desc: '판이 시작할 때 시민 편 한 명이 목표로 정해진다. 내가 살아 있을 때 목표가 낮에 처형되면 판이 끝날 때 함께 이긴다. 목표가 밤에 죽으면 광대가 된다.'},
    amnesiac: {name: '기억상실자', team: 'neutral', group: '중립 선', night: {kind: 'remember', dead: true},
      desc: '밤에 죽은 사람 한 명(직업이 공개된 사람)을 골라 다음 날부터 그 직업이 된다. 무엇이 됐는지는 모두에게 알려진다. 아무것도 되지 않으면 판이 끝날 때 살아 있어야 이긴다.'},
    serialkiller: {name: '연쇄살인마', team: 'neutral', group: '중립 살인', night: {kind: 'kill'}, invuln: true, crimes: ['trespass', 'murder'],
      desc: '밤마다 한 명을 죽인다. 밤에 공격받아도 죽지 않는다. 혼자 마지막까지 남으면 이긴다.'},
    arsonist: {name: '방화범', team: 'neutral', group: '중립 살인', night: {kind: 'douse'}, invuln: true, crimes: ['trespass'],
      desc: '밤마다 한 명에게 기름을 붓거나(그 사람은 기름을 뒤집어쓴 것을 안다), 기름 부은 사람을 모두 불태운다(치료·조끼·경호로도 못 막는다). 아무것도 안 한 밤에는 내 몸의 기름을 씻는다. 나를 붙잡아 두는 사람에게도 기름이 묻는다. 밤에 공격받아도 죽지 않는다. 혼자 마지막까지 남으면 이긴다.'},
    massmurderer: {name: '대량살인마', team: 'neutral', group: '중립 살인', night: {kind: 'spree', selfOk: true}, invuln: true, crimes: ['trespass', 'murder', 'property'],
      desc: '한 사람의 집을 골라 그 집에 있는 사람을 모두 죽인다: 그 밤에 다른 집을 찾아가지 않은 집주인과 그 집을 찾아온 사람 모두. 내 집도 고를 수 있다. 한 번 하면 다음 밤은 쉰다. 밤에 공격받아도 죽지 않는다. 혼자 마지막까지 남으면 이긴다.'},
    witch: {name: '마녀', team: 'neutral', group: '중립 악', night: {kind: 'control', two: true},
      desc: '밤마다 한 명을 조종해 그 사람의 밤 능력을 내가 고른 사람에게 쓰게 한다(조종당한 사람은 그 사실을 안다). 시민 편이 지고 내가 끝까지 살아 있으면 이긴다.'}
  };

  // 무리(무작위 칸에서 뽑는 직업). 위키 기본값: 마피아 조직원은 무작위에서 빠짐, 시장·대부는 하나만.
  const POOLS = {
    sheriff: ['sheriff'], doctor: ['doctor'], godfather: ['godfather'],
    town_investigative: ['investigator', 'detective', 'lookout'],
    town_protective: ['bodyguard', 'busdriver'],
    town_power: ['vigilante', 'veteran', 'spy'],
    town_support: ['citizen', 'mayor', 'escort'],
    mafia_random: ['framer', 'consort', 'janitor', 'consigliere', 'blackmailer'],
    neutral_benign: ['jester', 'survivor', 'executioner', 'amnesiac'],
    neutral_evil: ['serialkiller', 'arsonist', 'massmurderer', 'witch']
  };
  const POOL_NAMES = {town_investigative: '시민 조사', town_protective: '시민 보호', town_power: '시민 살해·능력', town_support: '시민 정부·지원',
                      mafia_random: '마피아 무작위', neutral_benign: '중립 선', neutral_evil: '중립 악·살인'};
  const SLOTS = ['sheriff', 'doctor', 'town_investigative', 'town_protective', 'town_power', 'town_support', 'town_support',
                 'godfather', 'mafia_random', 'neutral_benign', 'neutral_evil'];
  const UNIQUE = ['mayor', 'godfather'];
  const KILLERS = ['serialkiller', 'arsonist', 'massmurderer'];
  const slotName = s => POOL_NAMES[s] ? `${POOL_NAMES[s]}(${POOLS[s].map(k => ROLES[k].name).join('·')} 중 하나)` : ROLES[POOLS[s][0]].name;

  const find = (S, id) => S.players.find(p => p.id === id) || null;
  const label = p => `${p.no}번 ${p.name}`;
  const team = p => ROLES[p.role].team;
  const isMafia = p => team(p) === 'mafia';
  const isKiller = p => KILLERS.includes(p.role);

  // 칸마다 무리에서 하나씩 뽑아 자리에 나눈다
  function draw(slots, rnd) {
    const out = [];
    for (const s of slots) {
      const pool = (POOLS[s] || [s]).filter(k => ROLES[k] && !(UNIQUE.includes(k) && out.includes(k)));
      out.push(pool[Math.floor(rnd() * pool.length)] || 'citizen');
    }
    return out;
  }
  function fresh(p, role) {
    const R = ROLES[role];
    p.role = role;
    p.uses = R.night && R.night.uses ? R.night.uses : null;
  }
  function deal(players, slots, rnd) {
    const bag = draw(slots, rnd);
    while (bag.length < players.length) bag.push('citizen');
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const ps = players.map((p, i) => {
      const q = {...p, no: i + 1, alive: true, will: '', died: null, crimes: [], doused: false, revealed: false, won: false, startRole: bag[i]};
      fresh(q, bag[i]);
      return q;
    });
    for (const p of ps) if (p.role === 'executioner') {
      const town = ps.filter(q => team(q) === 'town' && q.role !== 'mayor');
      p.target = town.length ? town[Math.floor(rnd() * town.length)].id : null;
    }
    return ps;
  }

  // ── 밤에 고를 수 있는 것(버튼) ──
  // 돌려주는 것: [{label, act, at}] — at은 사람 화면에서 버튼을 붙일 자리(사람 id 또는 'self')
  function nightButtons(S, me) {
    const R = ROLES[me.role], N = S.night || {acts: {}}, mine = N.acts[me.id];
    if (!R.night || !me.alive) return [];
    const k = R.night.kind, out = [], live = S.players.filter(p => p.alive), others = live.filter(q => q.id !== me.id);
    const b = (lab, act, at) => out.push({label: lab, act: {type: 'night', ...act}, at});
    const left = me.uses == null ? '' : ` (남은 ${me.uses}${k === 'shoot' ? '발' : k === 'vest' ? '개' : '번'})`;
    if (me.uses === 0) return [];
    if (k === 'check') for (const q of others) b(`${label(q)} 조사`, {target: q.id}, q.id);
    if (k === 'crime') for (const q of others) b(`${label(q)} 범죄 기록 보기`, {target: q.id}, q.id);
    if (k === 'track') for (const q of others) b(`${label(q)} 뒤쫓기`, {target: q.id}, q.id);
    if (k === 'watch') for (const q of others) b(`${label(q)} 지켜보기`, {target: q.id}, q.id);
    if (k === 'heal') for (const q of others) b(`${label(q)} 치료`, {target: q.id}, q.id);
    if (k === 'guard') for (const q of others) b(`${label(q)} 경호`, {target: q.id}, q.id);
    if (k === 'shoot') for (const q of others) b(`${label(q)} 쏘기${left}`, {target: q.id}, q.id);
    if (k === 'block') for (const q of others) b(`${label(q)} 붙잡아 두기`, {target: q.id}, q.id);
    if (k === 'kill') for (const q of others.filter(q => !(isMafia(me) && isMafia(q)))) b(`${label(q)} 죽이기`, {target: q.id}, q.id);
    if (k === 'frame') for (const q of others.filter(q => !isMafia(q))) b(`${label(q)} 모함하기`, {target: q.id}, q.id);
    if (k === 'clean') for (const q of others) b(`${label(q)} 청소하기${left}`, {target: q.id}, q.id);
    if (k === 'silence') for (const q of others) b(`${label(q)} 협박하기`, {target: q.id}, q.id);
    if (k === 'annoy') for (const q of others) b(`${label(q)} 찾아가 귀찮게 하기`, {target: q.id}, q.id);
    if (k === 'alert' && !mine) b(`경계 서기${left}`, {mode: 'self'}, 'self');
    if (k === 'vest' && !mine) b(`방탄조끼 입기${left}`, {mode: 'self'}, 'self');
    if (k === 'remember') for (const q of S.players.filter(q => !q.alive && !q.cleaned)) b(`${label(q)}(${ROLES[q.role].name}) 기억하기`, {target: q.id}, q.id);
    if (k === 'douse') {
      for (const q of others.filter(q => !q.doused)) b(`${label(q)}에게 기름 붓기`, {target: q.id}, q.id);
      if (live.some(q => q.doused && q.id !== me.id)) b('기름 부은 사람 모두 불태우기', {mode: 'ignite'}, 'self');
    }
    if (k === 'spree' && !(S.spreeRest && S.spreeRest[me.id] === S.day)) {
      for (const q of others) b(`${label(q)} 집에서 살육하기`, {target: q.id}, q.id);
      b('내 집에서 살육하기', {target: me.id}, me.id);
    }
    if (k === 'swap' || k === 'control') {
      const first = mine && mine.target && !mine.target2 ? find(S, mine.target) : null;
      if (!first) for (const q of others) b(`${label(q)} ${k === 'swap' ? '태우기' : '조종하기'}`, {target: q.id}, q.id);
      else for (const q of live.filter(q => k === 'control' || (q.id !== first.id && q.id !== me.id)))
        b(k === 'swap' ? `${label(first)}, ${label(q)} 자리 바꾸기` : `${label(first)}의 능력을 ${label(q)}에게 쓰게 하기`, {target: first.id, target2: q.id}, q.id);
    }
    if (mine) b('고른 것 취소', {mode: 'cancel'}, 'self');
    return out;
  }

  // 밤에 고른 것을 받는다. 돌려주는 것: {ok, error, tell(고른 사람에게 보일 글), mafia(마피아끼리 알릴 글)}
  function chooseNight(S, p, a) {
    const R = ROLES[p.role], N = S.night;
    if (!R.night) return {ok: false, error: '밤에 고를 수 있는 능력이 없습니다.'};
    if (a.mode === 'cancel') { delete N.acts[p.id]; return {ok: true, tell: '오늘 밤 고른 것을 취소했습니다.'}; }
    const btn = nightButtons(S, p).find(b => b.act.mode === a.mode && (b.act.target || null) === (a.target || null) && (b.act.target2 || null) === (a.target2 || null));
    if (!btn) return {ok: false, error: '지금 고를 수 없는 것입니다.'};
    const t = a.target && find(S, a.target), t2 = a.target2 && find(S, a.target2);
    const k = R.night.kind;
    if ((k === 'swap' || k === 'control') && !t2) { N.acts[p.id] = {target: t.id}; return {ok: true, tell: `${k === 'swap' ? '태울' : '조종할'} 첫 사람: ${label(t)}. 이제 둘째를 고릅니다.`}; }
    N.acts[p.id] = {target: t ? t.id : null, target2: t2 ? t2.id : null, mode: a.mode || null};
    const what = btn.label.replace(/ \(남은 .*\)$/, '');
    const res = {ok: true, tell: `오늘 밤: ${what}`};
    if (k === 'kill' && isMafia(p)) res.mafia = `${R.name} ${label(p)}님이 오늘 밤 ${label(t)}님을 죽이기로 했습니다.`;
    return res;
  }

  // ── 밤 처리(아침이 되기 직전, 한꺼번에) ──
  // 돌려주는 것: {deaths:[{id, how}], tell:[{id, text}], story:[글], cleaned:{id:true}, announce:[모두에게 알릴 글], mafiaTell:[글]}
  function resolveNight(S, rnd) {
    const out = {deaths: [], tell: [], story: [], cleaned: {}, announce: [], mafiaTell: []};
    const P = id => find(S, id), L = id => label(P(id));
    const tell = (id, text) => out.tell.push({id, text});
    const live = S.players.filter(p => p.alive);
    const crime = (p, keys) => { for (const c of keys) if (!p.crimes.includes(c)) p.crimes.push(c); };
    // 고른 것 → 행동. 마피아의 죽이기는 하나(대부가 고른 것, 없으면 조직원이 고른 것).
    const acts = [];
    for (const p of live) {
      const R = ROLES[p.role], c = (S.night.acts || {})[p.id];
      if (!R.night || !c) continue;
      if ((R.night.kind === 'swap' || R.night.kind === 'control') && !c.target2) continue;   // 둘째를 고르지 않았으면 하지 않음
      acts.push({by: p.id, kind: R.night.kind, t: c.target, t2: c.target2, mode: c.mode});
    }
    const mk = acts.filter(a => a.kind === 'kill' && isMafia(P(a.by)));
    if (mk.length > 1) { const keep = mk.find(a => P(a.by).role === 'godfather') || mk[0]; for (const a of mk) if (a !== keep) acts.splice(acts.indexOf(a), 1); }
    const actOf = id => acts.find(a => a.by === id);
    // 1. 방탄조끼·경계
    const vest = new Set(), alert = new Set();
    for (const a of acts.filter(a => a.kind === 'vest' || a.kind === 'alert')) {
      const p = P(a.by); if (p.uses != null) p.uses--;
      (a.kind === 'vest' ? vest : alert).add(a.by);
      if (a.kind === 'alert') crime(p, ROLES[p.role].crimes || []);
      out.story.push(`${ROLES[p.role].name} ${L(a.by)}: ${a.kind === 'vest' ? '방탄조끼를 입음' : '경계를 섬'}`);
    }
    const visits = [];      // {by, to}
    // 2. 마녀의 조종: 조종당한 사람의 능력이 마녀가 고른 사람에게 간다
    for (const w of acts.filter(a => a.kind === 'control')) {
      const v = P(w.t), vr = ROLES[v.role];
      visits.push({by: w.by, to: v.id});
      tell(v.id, '밤에 누군가에게 조종당해, 내 능력이 내가 고르지 않은 사람에게 쓰였습니다.');
      if (!vr.night) { out.story.push(`마녀 ${L(w.by)} → ${L(v.id)} 조종: 쓸 능력이 없어 아무 일 없음`); continue; }
      let va = actOf(v.id);
      if (vr.night.kind === 'alert' || vr.night.kind === 'vest') {
        if (vr.night.kind === 'alert' && !va) { alert.add(v.id); out.story.push(`마녀 ${L(w.by)} → ${L(v.id)} 조종: 경계를 서게 함`); }
        else out.story.push(`마녀 ${L(w.by)} → ${L(v.id)} 조종: 바뀐 것 없음`);
        continue;
      }
      if (vr.night.kind === 'remember' || (vr.night.kind === 'douse' && va && va.mode === 'ignite')) { out.story.push(`마녀 ${L(w.by)} → ${L(v.id)} 조종: 바꿀 수 없는 능력`); continue; }
      if (v.uses === 0) { out.story.push(`마녀 ${L(w.by)} → ${L(v.id)} 조종: 쓸 수 있는 횟수가 없어 아무 일 없음`); continue; }
      if (!va) { va = {by: v.id, kind: vr.night.kind, t: w.t2, forced: true}; acts.push(va); }
      else { va.t = w.t2; if (va.mode === 'ignite') va.mode = null; }
      if (va.kind === 'swap' || va.kind === 'control') va.t2 = va.t2 && va.t2 !== w.t2 ? va.t2 : null;
      out.story.push(`마녀 ${L(w.by)} → ${L(v.id)} 조종: 능력을 ${L(w.t2)}님에게 쓰게 함`);
    }
    // 3. 버스 기사: 두 사람에게 오는 능력을 맞바꾼다
    for (const bd of acts.filter(a => a.kind === 'swap' && a.t && a.t2)) {
      const [x, y] = [bd.t, bd.t2], sw = id => id === x ? y : id === y ? x : id;
      for (const a of acts) if (a !== bd && a.kind !== 'control') { if (a.t) a.t = sw(a.t); if (a.t2) a.t2 = sw(a.t2); }
      visits.push({by: bd.by, to: x}, {by: bd.by, to: y});
      crime(P(bd.by), ROLES.busdriver.crimes);
      out.story.push(`버스 기사 ${L(bd.by)} → ${L(x)}, ${L(y)}의 자리를 바꿈`);
    }
    // 4. 붙잡아 두기(말동무·마담): 막힌 사람은 아무 데도 가지 않은 것이 된다
    const blocked = new Set();
    for (const bl of acts.filter(a => a.kind === 'block')) {
      if (blocked.has(bl.by) || !bl.t) continue;
      visits.push({by: bl.by, to: bl.t});
      crime(P(bl.by), ['solicit']);
      const ta = actOf(bl.t), tp = P(bl.t);
      if (tp.role === 'arsonist' && !P(bl.by).doused) { P(bl.by).doused = true; tell(bl.by, '붙잡아 둔 사람에게서 기름이 묻었습니다.'); }
      if (ta) { blocked.add(bl.t); acts.splice(acts.indexOf(ta), 1); }
      tell(bl.t, '밤에 누군가 나를 붙잡아 두었습니다. 오늘 밤 능력을 쓰지 못했습니다.');
      out.story.push(`${ROLES[P(bl.by).role].name} ${L(bl.by)} → ${L(bl.t)}님을 붙잡아 둠${ta ? ' · 그 사람의 능력이 막힘' : ''}`);
    }
    // 찾아간 것(막히지 않은 행동). 조끼·경계·불태우기·기억하기는 찾아가지 않는다.
    for (const a of acts) {
      if (['vest', 'alert', 'block', 'swap', 'control', 'remember'].includes(a.kind) || a.mode === 'ignite' || !a.t) continue;
      if (a.t !== a.by) visits.push({by: a.by, to: a.t});
      else if (a.kind === 'spree') visits.push({by: a.by, to: a.t});
    }
    const visitorsOf = id => visits.filter(v => v.to === id && v.by !== id).map(v => v.by);
    const visitedBy = id => [...new Set(visits.filter(v => v.by === id && v.to !== id).map(v => v.to))];
    for (const p of live) if (p.role === 'spy') crime(p, ['trespass']);
    // 5. 모함·기름·협박·귀찮게 하기
    const framed = new Set();
    for (const a of acts) {
      const p = P(a.by), R = ROLES[p.role];
      if (a.kind === 'frame') { framed.add(a.t); crime(p, R.crimes); out.story.push(`모함꾼 ${L(a.by)} → ${L(a.t)}님을 모함`); }
      if (a.kind === 'douse' && a.mode !== 'ignite') { P(a.t).doused = true; crime(p, ['trespass']); tell(a.t, '밤에 누군가 나에게 기름을 부었습니다.'); out.story.push(`방화범 ${L(a.by)} → ${L(a.t)}님에게 기름을 부음`); }
      if (a.kind === 'silence') { S.silenced = S.silenced || {}; S.silenced[a.t] = S.day + 1; tell(a.t, '밤에 협박을 받았습니다. 다음 날 낮에는 말을 할 수 없습니다.'); out.story.push(`협박꾼 ${L(a.by)} → ${L(a.t)}님을 협박(다음 날 말 못 함)`); }
      if (a.kind === 'annoy') { tell(a.t, '밤에 광대가 찾아와 귀찮게 했습니다.'); out.story.push(`광대 ${L(a.by)} → ${L(a.t)}님을 찾아가 귀찮게 함`); }
    }
    for (const p of live) if (p.role === 'arsonist' && !actOf(p.id) && !blocked.has(p.id) && p.doused) { p.doused = false; out.story.push(`방화범 ${L(p.id)}: 아무것도 하지 않아 몸의 기름을 씻음`); }
    for (const a of acts.filter(a => a.kind === 'heal' || a.kind === 'guard')) out.story.push(`${ROLES[P(a.by).role].name} ${L(a.by)} → ${L(a.t)}님을 ${a.kind === 'heal' ? '치료' : '경호'}`);
    // 6. 죽이기(동시에)
    const attacks = [];      // {by, t, how, pierce, visit}
    for (const a of acts) {
      const p = P(a.by), R = ROLES[p.role];
      if (a.kind === 'kill') { attacks.push({by: a.by, t: a.t, how: isMafia(p) ? '마피아에게 죽음' : '연쇄살인마에게 죽음', visit: true}); crime(p, R.crimes); out.story.push(`${R.name} ${L(a.by)} → ${L(a.t)}님을 죽이러 감`); }
      if (a.kind === 'shoot') { p.uses--; attacks.push({by: a.by, t: a.t, how: '자경단의 총에 맞음', visit: true}); crime(p, R.crimes); out.story.push(`자경단 ${L(a.by)} → ${L(a.t)}님을 쏨`); }
      if (a.kind === 'spree') {
        S.spreeRest = S.spreeRest || {}; S.spreeRest[a.by] = S.day + 1;
        crime(p, R.crimes);
        const home = a.t, ha = actOf(home), atHome = home !== a.by && (!ha || !ha.t || ha.t === home || ['vest', 'alert'].includes(ha.kind));
        const victims = [...(atHome ? [home] : []), ...visitorsOf(home).filter(id => id !== a.by)];
        out.story.push(`대량살인마 ${L(a.by)} → ${L(home)}의 집에서 살육${victims.length ? `: ${victims.map(L).join(', ')}` : ' · 집에 아무도 없음'}`);
        for (const id of victims) attacks.push({by: a.by, t: id, how: '대량살인마에게 죽음'});
      }
      if (a.kind === 'douse' && a.mode === 'ignite') {
        crime(p, ['murder', 'property', 'arson']);
        const burn = S.players.filter(q => q.alive && q.doused);
        out.story.push(`방화범 ${L(a.by)}: 기름 부은 사람을 모두 불태움${burn.length ? `: ${burn.map(q => L(q.id)).join(', ')}` : ''}`);
        for (const q of burn) { attacks.push({by: a.by, t: q.id, how: '불에 타 죽음', pierce: true}); q.doused = false; }
      }
    }
    if (S.haunt && S.haunt.length) {
      const pool = S.haunt.filter(id => P(id) && P(id).alive);
      if (pool.length) { const id = pool[Math.floor(rnd() * pool.length)]; attacks.push({by: null, t: id, how: '광대를 처형한 뒤 죄책감으로 죽음', pierce: true}); out.story.push(`광대의 처형에 찬성한 ${L(id)}님이 죄책감으로 죽음`); }
      S.haunt = null;
    }
    for (const vid of alert) for (const v of visitorsOf(vid)) {
      if (['lookout', 'amnesiac', 'janitor'].includes(P(v).role)) continue;
      attacks.push({by: vid, t: v, how: '퇴역 군인에게 죽음', vet: true});
      out.story.push(`경계 선 퇴역 군인 ${L(vid)}의 집에 온 ${L(v)}님을 공격`);
    }
    const dead = new Set(), heals = acts.filter(a => a.kind === 'heal'), guards = acts.filter(a => a.kind === 'guard');
    const usedHeal = new Set(), usedGuard = new Set();
    const canHeal = q => q.role !== 'bodyguard' && !(q.role === 'mayor' && q.revealed);
    const die = (id, how) => { if (dead.has(id)) return; dead.add(id); out.deaths.push({id, how}); };
    const tryHeal = (id, how) => {
      const h = heals.find(h => h.t === id && !usedHeal.has(h) && !dead.has(h.by));
      if (h && canHeal(P(id))) { usedHeal.add(h); tell(h.by, `치료한 ${L(id)}님이 밤에 공격당했지만 살렸습니다.`); out.story.push(`의사 ${L(h.by)}의 치료로 ${L(id)}님이 살았음`); return true; }
      return false;
    };
    for (const at of attacks) {
      const q = P(at.t);
      if (!q || dead.has(q.id)) continue;
      if (!at.pierce) {
        if (ROLES[q.role].invuln || alert.has(q.id)) {
          tell(q.id, '밤에 누군가 나를 공격했지만 버텨 냈습니다.'); out.story.push(`${L(q.id)}님은 밤에 공격받아도 죽지 않아 버팀`); continue;
        }
        if (vest.has(q.id)) { tell(q.id, '밤에 공격받았지만 방탄조끼가 막았습니다.'); out.story.push(`방탄조끼가 ${L(q.id)}님을 지킴`); continue; }
        const g = at.visit && guards.find(g => g.t === q.id && !usedGuard.has(g) && !dead.has(g.by));
        if (g) {
          usedGuard.add(g); crime(P(g.by), ['murder']);
          out.story.push(`경호원 ${L(g.by)}: ${L(q.id)}님을 지키다 ${L(at.by)}님과 싸움`);
          die(g.by, '경호하다 죽음');
          if (!tryHeal(at.by, '')) die(at.by, '경호원과 싸우다 죽음');
          continue;
        }
        if (tryHeal(q.id, at.how)) continue;
      }
      die(q.id, at.how);
    }
    for (const d of out.deaths) out.story.push(`결과: ${L(d.id)}님이 죽음(${d.how})`);
    if (!out.deaths.length) out.story.push('결과: 아무도 죽지 않음');
    // 7. 청소: 청소한 사람이 그날 밤 죽으면 직업과 유언을 숨긴다
    for (const a of acts.filter(a => a.kind === 'clean')) {
      const p = P(a.by); p.uses--; crime(p, ROLES.janitor.crimes);
      if (dead.has(a.t)) { out.cleaned[a.t] = true; tell(a.by, `청소한 ${L(a.t)}님의 유언: ${P(a.t).will ? `"${P(a.t).will}"` : '없음'} (직업은 모릅니다)`); out.story.push(`청소부 ${L(a.by)} → ${L(a.t)}님을 청소함(직업·유언 숨김)`); }
      else out.story.push(`청소부 ${L(a.by)} → ${L(a.t)}님을 청소하러 갔지만 그 사람은 죽지 않음`);
    }
    // 8. 조사(죽이기 뒤): 보안관·조사관·고문·형사·망꾼, 스파이
    const pick = list => list[Math.floor(rnd() * list.length)];
    for (const a of acts) {
      const p = P(a.by), q = a.t && P(a.t);
      if (a.kind === 'check') {
        const r = framed.has(q.id) ? '마피아 일원입니다' : q.role === 'godfather' ? '수상하지 않습니다' : isMafia(q) ? '마피아 일원입니다'
          : q.role === 'serialkiller' ? '연쇄살인마입니다' : q.role === 'arsonist' ? '방화범입니다' : q.role === 'massmurderer' ? '대량살인마입니다' : '수상하지 않습니다';
        tell(a.by, `조사 결과: ${label(q)}님은 ${r}.`); out.story.push(`보안관 ${L(a.by)} → ${L(q.id)} 조사: ${r.replace(/입니다$/, '')}`);
      }
      if (a.kind === 'crime') {
        const list = framed.has(q.id) ? ['trespass', 'murder'] : q.role === 'godfather' ? [] : q.crimes;
        const r = list.length ? CRIME[pick(list)] : '범죄 기록 없음';
        tell(a.by, `범죄 기록: ${label(q)}님 — ${r}`); out.story.push(`${ROLES[p.role].name} ${L(a.by)} → ${L(q.id)} 범죄 기록: ${r}`);
        crime(p, ROLES[p.role].crimes);
      }
      if (a.kind === 'track') { const to = visitedBy(q.id); const r = to.length ? `${to.map(L).join(', ')}님을 찾아갔습니다` : '아무도 찾아가지 않았습니다'; tell(a.by, `뒤쫓은 결과: ${label(q)}님은 오늘 밤 ${r}.`); out.story.push(`형사 ${L(a.by)} → ${L(q.id)} 뒤쫓기: ${r}`); crime(p, ['trespass']); }
      if (a.kind === 'watch') { const from = visitorsOf(q.id).filter(id => id !== a.by); const r = from.length ? `${[...new Set(from)].map(L).join(', ')}님이 찾아왔습니다` : '아무도 찾아오지 않았습니다'; tell(a.by, `지켜본 결과: ${label(q)}님 집에 오늘 밤 ${r}.`); out.story.push(`망꾼 ${L(a.by)} → ${L(q.id)} 지켜보기: ${r}`); crime(p, ['trespass']); }
    }
    const mkill = acts.find(a => a.kind === 'kill' && isMafia(P(a.by)));
    for (const p of live) if (p.role === 'spy') tell(p.id, mkill ? `스파이가 들은 것: 마피아가 오늘 밤 ${L(mkill.t)}님을 노렸습니다.` : '스파이가 들은 것: 마피아는 오늘 밤 누구도 노리지 않았습니다.');
    // 죽음 반영 전에 기억하기·처형인 바뀜을 정한다
    for (const a of acts.filter(a => a.kind === 'remember')) {
      const p = P(a.by), q = P(a.t);
      if (dead.has(p.id) || !q || q.alive || q.cleaned) continue;
      out.remember = out.remember || [];
      out.remember.push({id: p.id, role: q.role});
      out.story.push(`기억상실자 ${L(a.by)} → ${L(q.id)}의 직업(${ROLES[q.role].name})을 기억해 냄`);
    }
    return out;
  }

  // 밤 처리 결과를 판에 반영한다(죽음·청소·기억하기·처형인→광대·마피아 이어받기). 돌려주는 것: 모두에게 알릴 글 목록, 고른 사람에게 알릴 글
  function applyNight(S, res) {
    const P = id => find(S, id), msgs = [], tells = [];
    for (const d of res.deaths) {
      const p = P(d.id); if (!p || !p.alive) continue;
      p.alive = false; p.died = {day: S.day, how: d.how};
      if (res.cleaned[d.id]) p.cleaned = true;
    }
    for (const r of res.remember || []) {
      const p = P(r.id); if (!p || !p.alive) continue;
      fresh(p, r.role);
      msgs.push(`${label(p)}님이 기억을 되찾아 ${ROLES[r.role].name}이(가) 되었습니다.`);
      tells.push({id: p.id, text: `나는 이제 ${ROLES[r.role].name}입니다. ${ROLES[r.role].desc}`});
    }
    for (const p of S.players.filter(p => p.alive && p.role === 'executioner')) {
      const t = P(p.target);
      if (t && !t.alive && !(t.died && t.died.how === '처형')) { fresh(p, 'jester'); tells.push({id: p.id, text: `목표 ${label(t)}님이 밤에 죽어 나는 광대가 되었습니다. ${ROLES.jester.desc}`}); }
    }
    tells.push(...succeed(S));
    return {msgs, tells};
  }

  // 마피아에 죽일 사람(대부·조직원)이 없으면 남은 마피아 하나가 조직원이 된다
  function succeed(S) {
    const maf = S.players.filter(p => p.alive && isMafia(p));
    if (!maf.length || maf.some(p => p.role === 'godfather' || p.role === 'mafioso')) return [];
    const p = maf[0];
    fresh(p, 'mafioso');
    return maf.map(q => ({id: q.id, text: `죽일 사람이 없어 ${label(p)}님이 마피아 조직원이 되었습니다.`}));
  }

  // 표의 무게(밝힌 시장은 3)
  const weight = p => p.role === 'mayor' && p.revealed ? 3 : 1;

  // ── 승패 ──
  // 돌려주는 것: null(계속) 또는 {winner: 'town'|'mafia'|직업 키|'none', text}
  function winner(S) {
    const live = S.players.filter(p => p.alive);
    const town = live.filter(p => team(p) === 'town'), maf = live.filter(isMafia), kill = live.filter(isKiller);
    const done = (w, text) => ({winner: w, text});
    if (!live.length) return done('none', '모두 죽어 이긴 편이 없습니다');
    if (live.length === 2) {          // 둘만 남으면(위키 One Versus One): 방화범 > 연쇄살인마 > 대량살인마 > 마피아(시민에게는 짐) > 시민 편
      for (const k of ['arsonist', 'serialkiller', 'massmurderer']) { const p = live.find(q => q.role === k); if (p) return done(k, `${ROLES[k].name} 승리`); }
      if (maf.length && town.some(p => p.role === 'citizen') && maf.length === 1) return done('town', '시민 편 승리');
      if (maf.length) return done('mafia', '마피아 승리');
    }
    if (!maf.length && !kill.length) return town.length ? done('town', '시민 편 승리') : done('none', '싸우는 편이 모두 사라졌습니다');
    if (!kill.length && maf.length >= live.length - maf.length) return done('mafia', '마피아 승리');
    if (!town.length && !maf.length && kill.length === 1) return done(kill[0].role, `${ROLES[kill[0].role].name} 승리`);
    if (!town.length && !kill.length && maf.length) return done('mafia', '마피아 승리');
    return null;
  }

  // 판이 끝날 때 각 자리가 이겼나
  function winners(S, w) {
    return S.players.filter(p => {
      const t = team(p);
      if (p.role === 'survivor' || (p.role === 'amnesiac')) return p.alive;
      if (p.role === 'witch') return p.alive && w !== 'town';
      if (p.role === 'jester') return !!p.won;
      if (p.role === 'executioner') return !!p.won;
      if (t === 'town') return w === 'town';
      if (t === 'mafia') return w === 'mafia';
      if (isKiller(p)) return w === p.role && p.alive;
      return false;
    }).map(p => p.id);
  }

  function teamName(p) {
    const t = team(p);
    return t === 'town' ? '시민 편' : t === 'mafia' ? '마피아' : `중립(${ROLES[p.role].group.replace('중립 ', '')})`;
  }

  // 판의 칸과 직업 설명(규칙 글에 넣는다)
  function rolesText(slots) {
    const used = [...new Set(slots.flatMap(s => POOLS[s] || [s]))];
    return [
      `- 칸(${slots.length}명, 판마다 무리 안에서 무작위로 뽑는다): ${slots.map(slotName).join(', ')}. 대부가 죽어 죽일 사람이 없으면 남은 마피아가 마피아 조직원이 된다.`,
      '- 편과 승리: 시민 편은 마피아와 중립 살인(연쇄살인마·방화범·대량살인마)이 모두 죽으면 이긴다. 마피아는 중립 살인이 없고 마피아 수가 나머지 산 사람 수와 같거나 많으면 이긴다. 중립 살인은 혼자 마지막까지 남으면 이긴다. 둘만 남으면 방화범 > 연쇄살인마 > 대량살인마 > 마피아 > 시민 편 순으로 이기고, 마피아와 시민(직업)만 남으면 시민이 이긴다. 중립 선(광대·생존자·처형인·기억상실자)과 마녀는 각자의 조건으로 함께 이긴다.',
      '- 밤 처리 순서: 방탄조끼·경계 → 마녀의 조종 → 버스 기사의 자리 바꾸기 → 붙잡아 두기 → 모함·기름·협박 → 죽이기(동시에) → 청소 → 조사 → 기억하기. 죽이는 공격은 밤에 죽지 않는 사람·방탄조끼·경호원·의사 순으로 막힌다(불은 못 막는다).',
      '- 직업:',
      ...used.concat('mafioso').filter((k, i, a) => a.indexOf(k) === i).map(k => `  · ${ROLES[k].name}(${ROLES[k].team === 'town' ? '시민 편' : ROLES[k].team === 'mafia' ? '마피아' : '중립'}): ${ROLES[k].desc}`)
    ].join('\n');
  }

  globalThis.ChatMafiaRoles = {CRIME, ROLES, POOLS, POOL_NAMES, SLOTS, UNIQUE, KILLERS, slotName, isMafia, isKiller, team, teamName, draw, fresh, deal,
                               nightButtons, chooseNight, resolveNight, applyNight, succeed, weight, winner, winners, rolesText};
})();
