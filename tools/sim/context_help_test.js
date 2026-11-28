// 같은 시민 자리에서 처음 보이는 설명, 직접 연 규칙, 실제 목격 범위를 확인한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(path.resolve(process.argv[2] || '.'), 'game/games/noir-trpg/scripts');
let UI;
globalThis.WebEngine = {
  room() {}, Component: class {},
  define(name, constructor) { if (name === 'TRPGUI') UI = constructor; }
};
for (const f of fs.readdirSync(dir).filter(f => /^\d\d.*\.js$/.test(f) && !f.startsWith('10')).sort()) {
  new Function('WebEngine', fs.readFileSync(path.join(dir, f), 'utf8'))(WebEngine);
}
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios, screen = globalThis.NoirScreen;
let seed = 11;
const rng = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
const names = ['도현','서아','시온','나린','이안','수현','하준','유진'];
const s = C.create(names.map((name,i) => ({id:'p'+i,name,bot:true})), rng);
S.start(s, rng);
const sheriff = s.players.find(p => p.role === 'sheriff');
const mafia = s.players.find(p => p.role === 'godfather');
const away = s.players.find(p => p.team === 'town' && p !== sheriff);
function seat() { return C.view(s, sheriff.id); }
function panel(v, tab) {
  const u = Object.create(UI.prototype);
  Object.assign(u, {now:{view:v},tab});
  return u.right(v);
}
s.stage = 'opening';
let v = seat();
let text = screen.read(v).text;
assert.match(text, /곧 회관에서 모두와 이야기합니다/);
assert.doesNotMatch(text, /장소 사이 거리\(1 가까움|시작 직업은 진영별 배정|노조를 넘긴 도일|문이나 자물쇠를 여는 열쇠/);
assert.match(panel(v,'rules'), /data-tab="rules-full"/);
assert.match(panel(v,'rules-full'), /data-tab="rules"/);
assert.match(screen.rulebook(v), /장소 사이 거리/);
assert.doesNotMatch(screen.rulebook(v), /도일이 노조를 넘겼거나/);
assert.match(screen.rulebook(C.view(s,mafia.id)), /도일이 노조를 넘겼거나/);
s.stage = 'move';
v = seat();
assert.match(panel(v, 'rules'), /이때 이동해도 작은 행동과 큰 행동이 남습니다/);
assert.match(screen.read(v).text, /이때 이동해도 작은 행동과 큰 행동이 남습니다/);
assert.match(v.environment.join(' '), /재판을 신청할 수 있습니다/);
assert.doesNotMatch(v.environment.join(' '), /의자와 연단/);
s.stage = 'plan';
s.turn = 2;
assert.match(screen.read(seat()).text, /최대 체력이 5로 줄어듭니다/);
s.turn = 0;
s.day = 2;
s.epoch = 10;
s.scenario.discovered = true;
for (const p of s.players) { p.location = 'hall'; p.used = {big:false,small:false}; }
away.location = 'chapel';
const action = S.choices(s,mafia,'big').find(a => a.npc === 'doyle' && a.verb === 'recruitNpc');
assert.ok(action);
const before = sheriff.known.length, farBefore = away.known.length;
S.resolve(s,mafia,action,()=>0.11);
const witnessed = sheriff.known.slice(before).find(k => k.kind === 'observed' && k.text.includes('마피아 전용 행동'));
assert.ok(witnessed && witnessed.text.includes(mafia.name) && witnessed.text.includes('도일을'));
assert.doesNotMatch(witnessed.text, /수락|성공|거절/);
assert.ok(!away.known.slice(farBefore).some(k => k.text === witnessed.text));
// 예전 수첩과 다른 사람이 같은 말로 전한 주장도 따로 처리된다.
const legacy = {...witnessed,text:'유진이 도일에게 다가가 낮은 목소리로 무언가를 권합니다.'};
v = seat();
for (const kind of ['claim','observed']) {
  const old = {...v,me:{...v.me,known:[{...legacy,kind}]}};
  assert.equal(panel(old,'notes').includes('옛 목격 기록의'), kind === 'observed');
}
s.stage = 'vote';
s.trial = {id:'c1', target:mafia.id, by:sheriff.id, reason:'목격',evidence:[witnessed],votes:{}};
v = seat();
const ballot = screen.read(v);
assert.match(ballot.text, /기권도 투표한 사람 수에 포함됩니다/);
assert.equal(screen.press(v,ballot,{'버튼':'기권'}).req.vote, 'abstain');
console.log('통과 · 시민의 첫 화면, 이동, 밤, 도움말, 목격·전언·다른 장소, 기권');
