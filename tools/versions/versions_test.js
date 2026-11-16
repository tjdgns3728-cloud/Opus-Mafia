// 지난 판 사본이 그 커밋의 파일 그대로인지, 판 번호가 빠짐없이 이어지는지, 커밋 순서대로인지 본다.
// 커밋됐지만 아직 사본이 없는 최근 판은 실패로 치지 않고 알려 준다(고치기 전에 snapshot.js로 복사한다).
// 사용: node tools/versions/versions_test.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { DOCS, rowsOf, commitsOf, ROOT } = require('./snapshot.js');
const norm = b => b.toString('utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) pass++; else { fail++; console.log('실패: ' + msg); } };

for (const [file, name] of DOCS) {
  const dir = path.join(ROOT, 'docs', 'versions', name);
  const rows = rowsOf(dir), commits = commitsOf(file);
  check(rows.length > 0, name + ': 사본이 하나도 없음');
  rows.forEach((r, i) => check(r.v === i + 1, name + ': ' + (i + 1) + '번째 줄이 v' + r.v + '(판 번호가 이어지지 않음)'));
  let prev = -1;
  for (const r of rows) {
    const idx = commits.findIndex(c => c.full.startsWith(r.hash));
    check(idx >= 0, name + ' v' + r.v + ': 커밋 ' + r.hash + '가 이 문서의 이력에 없음');
    if (idx < 0) continue;
    check(idx > prev, name + ' v' + r.v + ': 커밋 순서가 앞 판보다 이르다');
    prev = idx;
    const f = path.join(dir, r.file);
    check(fs.existsSync(f), name + ' v' + r.v + ': 사본 파일 ' + r.file + '이 없음');
    if (!fs.existsSync(f)) continue;
    const orig = execFileSync('git', ['show', r.hash + ':' + file], { cwd: ROOT, maxBuffer: 1 << 28 });
    check(norm(fs.readFileSync(f)) === norm(orig), name + ' v' + r.v + ': 사본이 커밋 ' + r.hash + '의 파일과 다름(사본을 고쳐 썼거나 잘못 복사함)');
  }
  const missingMid = commits.slice(0, prev + 1).filter(c => !rows.some(r => c.full.startsWith(r.hash)));
  check(missingMid.length === 0, name + ': 사본 사이에 빠진 판 ' + missingMid.map(c => c.short).join(', '));
  const newer = commits.slice(prev + 1);
  if (newer.length) console.log('알림: ' + name + ' 커밋됐지만 아직 사본이 없는 판 ' + newer.length + '개(' + newer.map(c => c.short).join(', ') + ') — 고치기 전에 snapshot.js');
}
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
