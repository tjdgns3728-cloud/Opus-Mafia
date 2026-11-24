# 기록 문서의 지난 판

기록은 지우지 않는다(2026-11-16 사용자: "기록은 사라져선 안됩니다. 모든 기록은 의미가 있습니다. 특히 ai한테는 더욱 그렇습니다").
기록 문서를 고치기 전에 `node tools/versions/snapshot.js`를 실행한다. 커밋된 판 가운데 아직 사본이 없는 것을 Git 이력에서 그대로 꺼내 다음 판 번호를 붙인다. 그다음에 고친다.
`vNN` 파일은 그 판 그대로의 사본이고, 고쳐 쓰지 않는다. 지금 따르는 것은 원래 자리의 파일(지금 판)이다. 공통 규칙은 머리에 지금 판 번호를 적는다.
`node tools/versions/versions_test.js`는 사본이 그 커밋의 파일과 같은지, 판 번호가 빠짐없이 이어지는지 보여 준다.

| 문서 | 지금 파일 | 사본 수 |
|---|---|---|
| [공통 규칙](AI_RULES/README.md) | `AI_RULES.md` | 28 |
| [실패 기록](AI_LESSONS/README.md) | `docs/AI_LESSONS.md` | 87 |
| [제작 기록](GAME_MAKING_RECORD/README.md) | `docs/GAME_MAKING_RECORD.md` | 185 |
| [인계 문서](HANDOFF/README.md) | `HANDOFF.md` | 82 |
| [이야기 설정](SETTING/README.md) | `story/SETTING.md` | 14 |
| [Codex 안내](AGENTS/README.md) | `AGENTS.md` | 5 |
| [Claude 안내](CLAUDE/README.md) | `CLAUDE.md` | 1 |
