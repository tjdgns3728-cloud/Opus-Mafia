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
      const m = l.match(/^- (낱말|파일|있었던 일|원인|이렇게 한다):\s*(.*)$/);
      if (m) f[m[1]] = m[2].trim();
    }
    if (!title || !f['이렇게 한다']) continue;
    out.push({ title, words: list(f['낱말']), files: list(f['파일']), what: f['있었던 일'] || '', why: f['원인'] || '', todo: f['이렇게 한다'] });
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

const brief = r => `- ${r.title} — 있었던 일: ${r.what} / 이렇게 한다: ${r.todo}`;
const full = r => `## ${r.title}\n있었던 일: ${r.what}\n원인: ${r.why}\n이렇게 한다: ${r.todo}`;

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
    tail = '고치기 전에 이 기록에 걸리는지 확인합니다.';
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
  const list = argv[0] === '--file' ? byFile(recs, relPath(argv[1])) : byWords(recs, argv.join(' '));
  console.log(list.length ? list.map(full).join('\n\n') : '맞는 기록이 없습니다.');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { if (process.argv[2] !== '--hook') throw e; }
}
module.exports = { parse, load, wordScore, fileHit, relPath, byWords, byFile, unseen, hookOutput };
