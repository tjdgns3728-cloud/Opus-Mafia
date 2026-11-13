# AI 웹게임엔진

게임 규칙을 모르는 웹 게임 엔진과 한국어 편집기. 게임은 이 엔진으로 만들고, 게임마다 따로 보관한다(`../games/<게임>/`).

## 실행
```
python -m server.app          # http://127.0.0.1:8780 — 편집기
python tool.py projects       # 게임 목록 (engine.json의 "projects" 폴더, 기본 ../games)
python tool.py test           # 엔진 시험 (Python + JS)
python tool.py play <게임>     # 놀이용 서버 http://127.0.0.1:8790 — 게임 하나와 그 방만 (편집기 없음, docs/ROOM.md)
python tool.py play <게임> --ai on --open   # 혼자 하는 판: 컴퓨터 자리 + 방의 규칙이 부르는 AI (이 컴퓨터 안에서만)
python tool.py roomtest       # 함께 하는 방 화면 시험: 본보기 판을 창 여덟으로 처음부터 끝까지
python tool.py uitest <이름>   # 화면 시험 (열린 게임의 tests/ 또는 editor/ui_cases/) — 게임의 복사본에서 돈다
python tool.py resources      # 엔진·시험이 만든 자료의 종류별 용량과 정리 계획
python tool.py clean [--apply 종류]  # 정리 (기본은 계획만)
```
- Python 3.11 이상, 외부 패키지 없음. JS 시험은 node 또는 VS Code가 있으면 돈다.
- 여럿이 동시에: `WEBENGINE_PORT=8781`로 서버와 `tool.py`를 같이 실행하면 다른 포트를 쓴다(기본 8780, 주소는 늘 127.0.0.1). `tool.py test`는 실행마다 제 임시 폴더만 세므로 동시에 돌려도 서로 방해하지 않는다.
- AI는 Claude 구독 CLI로만 부른다(API 키 없음). 역할별 모델·비용 상한: `ai.json`, 게임별 상한: 편집기 ⚙ 게임 설정.

## 자원 관리 (오래 자동 개발해도 쌓이지 않게)
- 화면 시험은 열린 게임의 **복사본**에서 돈다: 진짜 게임·백업·AI 판단 저장소는 시험으로 바뀌지 않는다. 성공하면 복사본과 시험이 만든 프로젝트를 완전히 지우고, 실패하면 최소 증거(결과·실패 단계·바뀐 파일·만든 프로젝트, 크기 상한)만 `logs/test-evidence/`에 남긴다(최신 N개).
- 단위 시험의 임시 폴더는 실행이 끝나면 지워진다(`tool.py test`가 남은 것을 세어 0이 아니면 실패).
- `tool.py test`는 TMPDIR·TEMP·TMP를 그 실행의 폴더로 돌려 그 안만 센다. 이 변수를 무시하고 시스템 임시 폴더에 직접 쓰는 시험의 잔여물은 잡지 못하므로 시험은 `tests/_tmp.py`의 tmpdir나 tempfile을 쓴다.
- 보존 규칙은 `engine.json`의 "보관"(사람이 조절, 설명은 "보관_설명"). `server/resources.py`가 원본·게임 콘텐츠·AI 비용 기록·파일마다 최신 백업은 절대 지우지 않는다.

## 문서
- `docs/DESIGN.md` — 설계(원칙·구조·모듈·편집기·사람 편집 원칙)
- `docs/PLAN.md` — 진행 계획과 기록
- `docs/ROOM.md` — 여럿이 함께 들어오는 방(놀이용 서버, 규칙 쪽 `WebEngine.room`, 화면 쪽 `engine.room`)
- `docs/TALK.md` — 글로 주고받는 이야기 도구(이야기 칸·번호 선택지·막대·그림 위 구역, `engine.ai.propose`·`narrate`·`speakAs`)

`.token`(편집기 쓰기 열쇠)은 저장소에 올리지 않는다.
