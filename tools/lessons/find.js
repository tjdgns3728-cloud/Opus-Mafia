// 지난 실패 기록(docs/AI_LESSONS.md)에서 지금 일과 맞는 것을 찾아 보여 준다.
// 사용: node tools/lessons/find.js "할 일 설명"   → 낱말로 찾기
//       node tools/lessons/find.js --file <경로>    → 그 파일에 걸린 기록 찾기
//       node tools/lessons/find.js --hook           → Claude Code 훅(표준 입력으로 JSON을 받음)
// 훅으로 돌 때는 무슨 일이 있어도 작업을 막지 않는다. 오류가 나면 아무것도 출력하지 않고 끝낸다.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const FILE = process.env.AI_LESSONS_FILE || path.join(ROOT, 'docs', 'AI_LESSONS.md');

function parse(text) {
  const out = [];
  const list = s => (s || '').split(',').map(x => x.replace(/`/g, '').trim()).filter(Boolean);
  for (const part of text.replace(/\r/g, '').split(/^## /m).slice(1)) {
    const lines = part.split('\n'), title = lines[0].trim(), f = {};
    for (const l of lines.slice(1)) {
      const m = l.match(/^- (낱말|파일|맞는 일|상황과 한 일|실제 결과|원인과 근거|시도한 해결과 결과|이 경험이 보여 주는 것|효과|더 드는 일):\s*(.*)$/);
      if (m) f[m[1]] = m[2].trim();
    }
    // 경험형 기록(2026-11-16): 상황·결과·원인·해 본 일·보여 주는 것. 내용 칸이 하나도 없을 때만 뺀다.
    const rec = { title, words: list(f['낱말']), files: list(f['파일']), situation: f['상황과 한 일'] || '', result: f['실제 결과'] || '',
      cause: f['원인과 근거'] || '', tried: f['시도한 해결과 결과'] || '', shows: f['이 경험이 보여 주는 것'] || '',
      // 일의 종류로 고르기(2026-11-16): 일을 맡길 때 그 일에 맞는 기록만 함께 준다. 효과·더 드는 일은 있을 때만.
      kinds: list(f['맞는 일']), effect: f['효과'] || '', extra: f['더 드는 일'] || '' };
    if (!title || !(rec.situation || rec.result || rec.shows)) continue;
    out.push(rec);
  }
  return out;
}

function load(file) {
  try { return parse(fs.readFileSync(file || FILE, 'utf8')); } catch (e) { return []; }
}

// 낱말 하나는 쉼표로 나눈 한 칸. "시험+실패"처럼 +로 이으면 모두 들어 있어야 맞는다.
function wordScore(rec, text) {
  const t = String(text || '').toLowerCase();
  let n = 0;
  for (const w of rec.words) {
    const parts = w.toLowerCase().split('+').map(s => s.trim()).filter(Boolean);
    if (parts.length && parts.every(p => t.includes(p))) n++;
  }
  return n;
}

// 파일 칸은 경로 끝과 견준다. *는 / 를 뺀 아무 글자, **는 / 를 포함한 아무 글자.
function globRe(p) {
  const s = p.replace(/\\/g, '/').replace(/[.+^${}()|[\]]/g, '\\$&')
    .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*').replace(/\?/g, '[^/]');
  return new RegExp('(^|/)' + s + '$', 'i');
}
function fileHit(rec, file) {
  const f = String(file || '').replace(/\\/g, '/');
  return !!f && rec.files.some(p => globRe(p).test(f));
}

function relPath(p) {
  if (!p) return '';
  const abs = path.resolve(String(p));
  const rel = path.relative(ROOT, abs);
  return (rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : abs).replace(/\\/g, '/');
}

function byWords(recs, text, max) {
  return recs.map(r => ({ r, s: wordScore(r, text) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s).slice(0, max || 3).map(x => x.r);
}
function byFile(recs, file, max) {
  return recs.filter(r => fileHit(r, file)).slice(0, max || 6);
}
// 일의 종류로 찾기. 종류 이름이 같거나 그 이름을 품으면 맞는다(예: "고치기" → "기존 결과물 고치기").
function byKind(recs, kind) {
  const k = String(kind || '').trim();
  return k ? recs.filter(r => r.kinds.some(x => x === k || x.includes(k))) : [];
}
function kindCounts(recs) {
  const n = {};
  for (const r of recs) for (const k of r.kinds) n[k] = (n[k] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1]);
}

// 같은 대화에서 같은 기록을 같은 자리(요청 / 파일마다)에 두 번 띄우지 않는다.
function unseen(sid, key, list) {
  if (!sid) return list;
  const dir = process.env.AI_LESSONS_STATE_DIR || path.join(os.tmpdir(), 'ai-lessons');
  const f = path.join(dir, String(sid).replace(/[^\w.-]/g, '_') + '.json');
  let seen = {};
  try { seen = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  const out = list.filter(r => !seen[key + '|' + r.title]);
  if (out.length) {
    out.forEach(r => { seen[key + '|' + r.title] = 1; });
    try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(seen)); } catch (e) {}
  }
  return out;
}

const brief = r => `- ${r.title} — 상황: ${r.situation} / 결과: ${r.result} / 보여 주는 것: ${r.shows}`;
const full = r => `## ${r.title}\n맞는 일: ${r.kinds.join(', ') || '확인되지 않음'}\n상황과 한 일: ${r.situation}\n실제 결과: ${r.result}\n원인과 근거: ${r.cause}\n시도한 해결과 결과: ${r.tried}\n이 경험이 보여 주는 것: ${r.shows}` +
  (r.effect ? `\n효과: ${r.effect}` : '') + (r.extra ? `\n더 드는 일: ${r.extra}` : '');

function hookOutput(d, recs) {
  const ev = d.hook_event_name || '';
  let list, key, head, tail;
  if (ev === 'UserPromptSubmit') {
    list = byWords(recs, d.prompt);
    key = 'prompt';
    head = '지난 실패 기록 가운데 이 요청과 맞는 것입니다(docs/AI_LESSONS.md).';
    tail = '맞는 기록이 있으면 첫 답에 "떠오른 기록"으로 한 줄 밝힙니다. 이번 일과 상관없으면 그렇다고 말하고 넘어갑니다.';
  } else if (ev === 'PreToolUse') {
    const ti = d.tool_input || {}, rel = relPath(ti.file_path || ti.notebook_path || '');
    if (!rel) return null;
    list = byFile(recs, rel);
    key = 'file:' + rel;
    head = `고치려는 파일(${rel})에 걸린 지난 실패 기록입니다(docs/AI_LESSONS.md).`;
    tail = '지금 고치는 일과 견줘 볼 지난 경험입니다. 쓸지는 지금 상황을 보고 정합니다.';
  } else return null;
  list = unseen(d.session_id, key, list);
  if (!list.length) return null;
  return {
    systemMessage: '떠오른 실패 기록: ' + list.map(r => r.title).join(', '),
    hookSpecificOutput: { hookEventName: ev, additionalContext: [head, ...list.map(brief), tail].join('\n') }
  };
}

function main(argv) {
  if (argv[0] === '--hook') {
    let d;
    try { d = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { return; }
    const out = hookOutput(d, load());
    if (out) process.stdout.write(JSON.stringify(out));
    return;
  }
  const recs = load();
  if (argv[0] === '--kinds') { console.log(kindCounts(recs).map(([k, n]) => `${k} ${n}`).join('\n')); return; }
  const list = argv[0] === '--file' ? byFile(recs, relPath(argv[1])) : argv[0] === '--kind' ? byKind(recs, argv.slice(1).join(' ')) : byWords(recs, argv.join(' '));
  console.log(list.length ? list.map(full).join('\n\n') : '맞는 기록이 없습니다.');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { if (process.argv[2] !== '--hook') throw e; }
}
module.exports = { parse, load, wordScore, fileHit, relPath, byWords, byFile, byKind, kindCounts, unseen, hookOutput };
