// 지난 실패 기록 찾기(find.js)와 훅 설정을 확인한다. 사용: node tools/lessons/find_test.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const L = require('./find.js');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const titles = list => list.map(r => r.title);

// 1. 기록 파일
const recs = L.load();
check('기록이 26개', recs.length === 26, recs.length);
check('모든 기록에 경험형 다섯 칸(상황과 한 일·실제 결과·원인과 근거·시도한 해결과 결과·이 경험이 보여 주는 것)이 있음', recs.every(r => r.situation && r.result && r.cause && r.tried && r.shows), recs.filter(r => !(r.situation && r.result && r.cause && r.tried && r.shows)).map(r => r.title));
const rawLessons = fs.readFileSync(path.join(ROOT, 'docs', 'AI_LESSONS.md'), 'utf8').replace(/\r/g, '');
check('읽지 못하고 빠진 기록이 없음(## 제목 수 = 읽은 기록 수)', (rawLessons.match(/^## /mg) || []).length === recs.length);
check('옛 모양(있었던 일·원인·이렇게 한다) 줄이 남지 않음', !/^- (있었던 일|원인|이렇게 한다):/m.test(rawLessons));
// 일의 종류로 고르기(2026-11-16): 모든 기록에 맞는 일이 있고, 종류로 찾으면 그 일에 맞는 기록만 나온다
check('모든 기록에 맞는 일의 종류가 있음', recs.every(r => r.kinds.length), recs.filter(r => !r.kinds.length).map(r => r.title));
const byK = titles(L.byKind(recs, '기존 결과물 고치기'));
check('"기존 결과물 고치기" → 역할 기록과 NPC 대답 기록만', byK.includes('고칠 부분의 역할을 수정 판단에 쓰지 못함') && byK.includes('NPC가 대화에 대답하지 않음') && byK.length === 2, byK);
check('종류 이름 일부("고치기")로도 찾음', titles(L.byKind(recs, '고치기')).includes('고칠 부분의 역할을 수정 판단에 쓰지 못함'));
check('없는 종류 → 없음', L.byKind(recs, '우주선').length === 0);
const roleRec = recs.find(r => r.title === '고칠 부분의 역할을 수정 판단에 쓰지 못함');
check('역할 기록에 효과·더 드는 일이 있음', !!roleRec && /Terra/.test(roleRec.effect) && /없음/.test(roleRec.extra));
check('종류별 개수 목록에 13가지', L.kindCounts(recs).length === 13, L.kindCounts(recs).map(x => x[0]));
check('모든 기록에 낱말이나 파일이 하나 이상', recs.every(r => r.words.length || r.files.length), recs.filter(r => !r.words.length && !r.files.length).map(r => r.title));
check('제목이 겹치지 않음', new Set(titles(recs)).size === recs.length);

// 2. 낱말로 찾기
const T_TEST = '시험이 실패하자 시험을 결과에 맞춰 고침', T_RULE = '지금 규칙을 열어 보지 않고 규칙을 말함', T_BOT = '컴퓨터 자리에 새 행동을 주자 승률이 뜀';
check('"시험이 실패했어요" → 시험 기록이 첫째', titles(L.byWords(recs, '시험이 실패했어요'))[0] === T_TEST, titles(L.byWords(recs, '시험이 실패했어요')));
check('"안녕하세요" → 없음', L.byWords(recs, '안녕하세요').length === 0);
check('"게임 규칙을 설명해 주세요" → 규칙 기록 안 뜸', !titles(L.byWords(recs, '게임 규칙을 설명해 주세요')).includes(T_RULE));
check('"추천한 대로 규칙을 바꿔주세요" → 규칙 기록', titles(L.byWords(recs, '추천한 대로 규칙을 바꿔주세요')).includes(T_RULE));
check('"컴퓨터 대부가 새 행동을 하게" → 승률 기록', titles(L.byWords(recs, '컴퓨터 대부가 새 행동을 하게 해 주세요')).includes(T_BOT));
check('흔한 말("판정하지 않는다", "문구의 효과")로는 안 뜸', L.byWords(recs, '이것만으로 충족 여부를 판정하지 않는다. 문구의 효과인지 알 수 없다').length === 0, titles(L.byWords(recs, '이것만으로 충족 여부를 판정하지 않는다. 문구의 효과인지 알 수 없다')));
check('"비교를 3번 해 주세요" → 되풀이 지시 기록', titles(L.byWords(recs, '비교를 3번 해 주세요')).includes('같은 지시를 세 번 되풀이해 맡김'));
check('"시안 2~3개" 같은 흔한 말로는 되풀이 기록이 안 뜸', !titles(L.byWords(recs, '시안 2~3개를 보여 주세요')).includes('같은 지시를 세 번 되풀이해 맡김'));
check('"전략적인 요소를 명확하게 해 주세요" → 설명 창 기록', titles(L.byWords(recs, '게임의 전략적인 요소를 명확하게 해 주세요')).includes('전략을 설명 창으로 보여 주려 함'));
check('"이름 색을 바꿔 주세요" → 역할 기록', titles(L.byWords(recs, '주인공 이름 색을 바꿔 주세요')).includes('고칠 부분의 역할을 수정 판단에 쓰지 못함'));
check('"이 문장 고쳐 주세요"처럼 흔한 고치기 말로는 역할 기록이 안 뜸', !titles(L.byWords(recs, '이 문장 고쳐 주세요')).includes('고칠 부분의 역할을 수정 판단에 쓰지 못함'));
check('"추천한 대로 규칙을 바꿔주세요" → 규칙 기록이 여전히 첫째', titles(L.byWords(recs, '추천한 대로 규칙을 바꿔주세요'))[0] === T_RULE, titles(L.byWords(recs, '추천한 대로 규칙을 바꿔주세요')));
check('00World.js를 고칠 때는 역할 기록이 안 뜸(파일 조건 없음)', !titles(L.byFile(recs, 'game/games/noir-trpg/scripts/00World.js')).includes('고칠 부분의 역할을 수정 판단에 쓰지 못함'));
check('낱말 찾기는 최대 3개', L.byWords(recs, '시험 실패 테스트 통과 FAIL 규칙 추천 AI_RULES 컴퓨터 대부 승률 봇 판정 빈칸').length <= 3);

// 3. 파일로 찾기
const ui = titles(L.byFile(recs, 'game/games/noir-trpg/scripts/20Interface.js'));
check('20Interface.js → 겹쳐 뜨는 창, 설명 칸이 안 보임', ui.includes('겹쳐 뜨는 창') && ui.includes('설명 칸이 안 보임'), ui);
const absTest = path.join(ROOT, 'tools', 'sim', 'masked_test.js');
check('저장소 안 절대 경로를 상대 경로로 바꿈', L.relPath(absTest) === 'tools/sim/masked_test.js', L.relPath(absTest));
check('masked_test.js(절대 경로) → 시험 기록', titles(L.byFile(recs, L.relPath(absTest))).includes(T_TEST));
check('AI_RULES.md → 규칙 기록', titles(L.byFile(recs, 'AI_RULES.md')).includes(T_RULE));
check('README.md → 없음', L.byFile(recs, 'README.md').length === 0);
check('파일 이름 일부만 같으면 안 뜸(XAI_RULES.md)', L.byFile(recs, 'docs/XAI_RULES.md').length === 0);

// 4. 훅으로 실행 (셸을 거치지 않고 JSON을 표준 입력으로 넘김)
const state = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-test-'));
const run = (input, env) => cp.spawnSync(process.execPath, [path.join(__dirname, 'find.js'), '--hook'], {
  input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
  env: Object.assign({}, process.env, { AI_LESSONS_STATE_DIR: state }, env || {})
});
const json = s => { try { return JSON.parse(s); } catch (e) { return null; } };

let r = run({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '추천한 대로 규칙을 바꿔주세요' });
let o = json(r.stdout);
check('요청 훅: 끝남 코드 0', r.status === 0, r.stderr);
check('요청 훅: hookEventName', o && o.hookSpecificOutput.hookEventName === 'UserPromptSubmit', r.stdout);
check('요청 훅: 기록 내용이 들어감', o && o.hookSpecificOutput.additionalContext.includes(T_RULE) && o.hookSpecificOutput.additionalContext.includes('상황:') && o.hookSpecificOutput.additionalContext.includes('결과:') && o.hookSpecificOutput.additionalContext.includes('보여 주는 것:'));
check('요청 훅: 사용자에게 보일 제목', o && o.systemMessage.includes(T_RULE));
r = run({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '규칙을 추천해 주세요' });
check('요청 훅: 같은 대화에서 같은 기록은 다시 안 뜸', r.status === 0 && r.stdout === '', r.stdout);
r = run({ hook_event_name: 'UserPromptSubmit', session_id: 's2', prompt: '규칙을 추천해 주세요' });
check('요청 훅: 다른 대화에서는 다시 뜸', !!json(r.stdout));
r = run({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '안녕하세요' });
check('요청 훅: 맞는 기록이 없으면 아무것도 안 냄', r.status === 0 && r.stdout === '');

r = run({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Edit', tool_input: { file_path: absTest } });
o = json(r.stdout);
check('파일 훅: hookEventName', o && o.hookSpecificOutput.hookEventName === 'PreToolUse', r.stdout);
check('파일 훅: 시험 기록이 들어감', o && o.hookSpecificOutput.additionalContext.includes(T_TEST));
check('파일 훅: 막지 않음(허락·거절을 내지 않음)', o && !('permissionDecision' in o.hookSpecificOutput) && !('decision' in o) && o.continue !== false);
r = run({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Edit', tool_input: { file_path: absTest } });
check('파일 훅: 같은 파일은 다시 안 뜸', r.status === 0 && r.stdout === '', r.stdout);
r = run({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Write', tool_input: { file_path: path.join(ROOT, 'game', 'games', 'noir-trpg', 'scripts', '20Interface.js') } });
check('파일 훅: 다른 파일이면 뜸', !!json(r.stdout));
r = run({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Edit', tool_input: { file_path: path.join(ROOT, 'README.md') } });
check('파일 훅: 걸린 기록이 없으면 아무것도 안 냄', r.status === 0 && r.stdout === '');

r = run({ hook_event_name: 'Stop', session_id: 's1' });
check('다른 훅 이름이면 아무것도 안 냄', r.status === 0 && r.stdout === '');
r = run('이건 JSON이 아님');
check('깨진 입력에도 끝남 코드 0, 출력 없음', r.status === 0 && r.stdout === '', [r.status, r.stdout]);
r = run({ hook_event_name: 'UserPromptSubmit', session_id: 's3', prompt: '시험이 실패했어요' }, { AI_LESSONS_FILE: path.join(state, 'no-such-file.md') });
check('기록 파일이 없어도 끝남 코드 0, 출력 없음', r.status === 0 && r.stdout === '', [r.status, r.stdout]);

// 5. 설정과 안내
const settings = json(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'));
const cmds = ev => ((settings && settings.hooks && settings.hooks[ev]) || []).flatMap(g => g.hooks.map(h => ({ m: g.matcher || '', c: h.command })));
check('설정: 요청 훅이 find.js --hook을 부름', cmds('UserPromptSubmit').some(h => /tools\/lessons\/find\.js"? --hook/.test(h.c)), cmds('UserPromptSubmit'));
const pre = cmds('PreToolUse').find(h => /tools\/lessons\/find\.js"? --hook/.test(h.c));
check('설정: 파일 훅이 Edit와 Write에 걸림', pre && /(^|\|)Edit(\||$)/.test(pre.m) && /(^|\|)Write(\||$)/.test(pre.m), pre);
check('AGENTS.md가 찾기 명령을 안내함', fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8').includes('tools/lessons/find.js'));

fs.rmSync(state, { recursive: true, force: true });
console.log(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
