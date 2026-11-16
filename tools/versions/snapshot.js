// 기록 문서의 지난 판을 지우지 않고 남긴다(2026-11-16 사용자: "기록은 사라져선 안됩니다. 모든 기록은 의미가 있습니다. 특히 ai한테는 더욱 그렇습니다").
// 기록 문서를 고치기 전에 실행한다: 커밋된 판 가운데 아직 사본이 없는 것을 Git 이력에서 그대로 꺼내 다음 판 번호를 붙인다.
// docs/versions/<이름>/vNN.<확장자> = 그 커밋의 파일 그대로. 같은 폴더 README.md에 판·때·커밋·커밋 글. 이미 있는 사본은 건드리지 않는다.
// 사용: node tools/versions/snapshot.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const DOCS = [
  ['AI_RULES.md', 'AI_RULES', '공통 규칙'],
  ['docs/AI_LESSONS.md', 'AI_LESSONS', '실패 기록'],
  ['docs/GAME_MAKING_RECORD.md', 'GAME_MAKING_RECORD', '제작 기록'],
  ['HANDOFF.md', 'HANDOFF', '인계 문서'],
  ['story/SETTING.md', 'SETTING', '이야기 설정'],
  ['AGENTS.md', 'AGENTS', 'Codex 안내'],
  ['CLAUDE.md', 'CLAUDE', 'Claude 안내'],
];
const ROW = /^\| \[v(\d+)\]\((v\d+[^)]*)\) \| ([^|]+) \| `([0-9a-f]+)` \|/;
const git = (...a) => execFileSync('git', a, { cwd: ROOT, maxBuffer: 1 << 28 });
const kst = iso => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');

// 그 문서를 바꾼 커밋들(오래된 것부터): {full, short, iso, msg}
function commitsOf(file) {
  return git('log', '--reverse', '--format=%H%x09%h%x09%aI%x09%s', '--', file).toString().trim().split('\n').filter(Boolean)
    .map(l => { const [full, short, iso, ...m] = l.split('\t'); return { full, short, iso, msg: m.join(' ') }; });
}
// README.md에 이미 적힌 판들: [{v, file, when, hash}]
function rowsOf(dir) {
  const f = path.join(dir, 'README.md');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split(/\r?\n/).map(l => l.match(ROW)).filter(Boolean)
    .map(m => ({ v: Number(m[1]), file: m[2], when: m[3].trim(), hash: m[4] }));
}

function snapshot(file, name, ko) {
  const dir = path.join(ROOT, 'docs', 'versions', name), ext = path.extname(file);
  fs.mkdirSync(dir, { recursive: true });
  const rows = rowsOf(dir), commits = commitsOf(file);
  const done = new Set(commits.filter(c => rows.some(r => c.full.startsWith(r.hash))).map(c => c.full));
  const lastIdx = commits.reduce((k, c, i) => (done.has(c.full) ? i : k), -1);
  const skipped = commits.slice(0, lastIdx + 1).filter(c => !done.has(c.full));
  const added = [];
  let v = rows.reduce((k, r) => Math.max(k, r.v), 0);
  const lines = rows.length ? fs.readFileSync(path.join(dir, 'README.md'), 'utf8').replace(/\s+$/, '').split(/\r?\n/)
    : ['# ' + ko + '(' + file + ')의 지난 판', '', '| 판 | 때(한국 시간) | 커밋 | 커밋 글 |', '|---|---|---|---|'];
  for (const c of commits.slice(lastIdx + 1)) {
    let buf; try { buf = git('show', c.full + ':' + file); } catch (e) { continue; } // 그 커밋에서 지워진 경우
    v++; const vn = 'v' + String(v).padStart(2, '0');
    fs.writeFileSync(path.join(dir, vn + ext), buf);
    lines.push('| [' + vn + '](' + vn + ext + ') | ' + kst(c.iso) + ' | `' + c.short + '` | ' + c.msg.replace(/\|/g, '/') + ' |');
    added.push(vn + ' ' + c.short);
  }
  fs.writeFileSync(path.join(dir, 'README.md'), lines.join('\n') + '\n');
  return { name, ko, file, count: v, added, skipped: skipped.map(c => c.short) };
}

function writeTop(results) {
  const top = [
    '# 기록 문서의 지난 판', '',
    '기록은 지우지 않는다(2026-11-16 사용자: "기록은 사라져선 안됩니다. 모든 기록은 의미가 있습니다. 특히 ai한테는 더욱 그렇습니다").',
    '기록 문서를 고치기 전에 `node tools/versions/snapshot.js`를 실행한다. 커밋된 판 가운데 아직 사본이 없는 것을 Git 이력에서 그대로 꺼내 다음 판 번호를 붙인다. 그다음에 고친다.',
    '`vNN` 파일은 그 판 그대로의 사본이고, 고쳐 쓰지 않는다. 지금 따르는 것은 원래 자리의 파일(지금 판)이다. 공통 규칙은 머리에 지금 판 번호를 적는다.',
    '`node tools/versions/versions_test.js`는 사본이 그 커밋의 파일과 같은지, 판 번호가 빠짐없이 이어지는지 보여 준다.', '',
    '| 문서 | 지금 파일 | 사본 수 |', '|---|---|---|',
    ...results.map(r => '| [' + r.ko + '](' + r.name + '/README.md) | `' + r.file + '` | ' + r.count + ' |'),
  ];
  fs.writeFileSync(path.join(ROOT, 'docs', 'versions', 'README.md'), top.join('\n') + '\n');
}

if (require.main === module) {
  const results = DOCS.map(d => snapshot(...d));
  writeTop(results);
  for (const r of results) {
    console.log(r.name + ': 사본 ' + r.count + '개' + (r.added.length ? ', 새로 복사 ' + r.added.join(', ') : ', 새로 복사 없음'));
    if (r.skipped.length) console.log('  사본이 없는 중간 판(복사하지 않음, 판 번호가 밀리므로 사람이 보고 정한다): ' + r.skipped.join(', '));
  }
}
module.exports = { DOCS, ROW, rowsOf, commitsOf, ROOT };
