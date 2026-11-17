// 이기는 조건을 셀 때 마피아 편으로 더 세는 것은 끌어들인 해먼드와 노조를 넘긴 도일뿐인지,
// 그리고 게임 글이 다른 마을 사람(젊은 광부 등)도 센다고 말하지 않는지 확인. 사용: node wincount_test.js <저장소 경로>
// 2026-11-18: 규칙 탭과 마피아 안내 글이 "젊은 광부를 끌어들여도 한 명으로 센다"고 말했지만 승패 코드는 세지 않았다(CM 연구 2에서 찾음).
const fs = require('fs'), path = require('path');
const dir = path.join(path.resolve(process.argv[2] || '.'), 'game', 'games', 'noir-trpg', 'scripts');
for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow']) require(path.join(dir, f + '.js'));
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios;
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };

// 1. 승패 코드: 8인 판(마피아 2명)에서 다른 마을 사람을 끌어들여도 장악이 되지 않고, 해먼드와 도일이면 장악된다
function game() {
  let seed = 21; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const seats = Array.from({ length: 8 }, (_, i) => ({ id: 'p' + i, name: '자리' + i, bot: true }));
  const s = C.create(seats, rng); S.start(s); S.afterGathering?.(s); s.day = 2; s.turn = 0; s.stage = 'plan'; return s;
}
const npcs = s => s.scenario.continuation?.npcs || {};
{
  const s = game(); const mafia = C.alive(s).filter(p => p.team === 'mafia').length, live = C.alive(s).length;
  ok(mafia * 2 < live, `시작: 마피아 ${mafia}명 / 살아 있는 ${live}명이라 아직 장악이 아님`);
  const others = Object.values(npcs(s)).filter(n => n.id !== 'mayor' && n.id !== 'doyle' && n.hp > 0);
  for (const n of others) n.recruited = true;
  ok(others.some(n => n.id === 'miner'), '젊은 광부가 끌어들일 수 있는 마을 사람에 있음');
  ok(!C.finish(s), `해먼드·도일 말고 ${others.length}명(${others.map(n => n.name).join(', ')})을 모두 끌어들여도 장악이 아님`);
}
{
  const s = game(); const n = npcs(s);
  n.mayor.recruited = true; n.doyle.cowed = true;
  const r = C.finish(s);
  ok(r && r.team === 'mafia', '끌어들인 해먼드와 노조를 넘긴 도일을 더하면 장악(2+2 ≥ 8의 절반)');
}

// 2. 게임 글: 이기는 조건을 세는 문장에 해먼드·도일 말고 끌어들일 수 있는 마을 사람의 이름이 나오지 않는다
const others = ['젊은 광부', '·광부', '광부를 끌어들', '술집 주인', '간호사', '종지기', '하숙집 주인'];
const counting = /이기는 조건을 셀 때|마피아 편을 더 셉|편 한 명으로|절반까지 한 명/;
const bad = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const sent of text.split(/(?<=[.!?。])\s+|["'`]/)) if (counting.test(sent) && others.some(o => sent.includes(o))) bad.push(`${f}: ${sent.trim().slice(0, 120)}`);
}
ok(!bad.length, '이기는 조건을 세는 글에 다른 마을 사람이 나오지 않음' + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
