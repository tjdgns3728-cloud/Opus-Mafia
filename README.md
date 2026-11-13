# 밤의 증언 · 블랙 리지

2026-11-14에 P가 다른 AI에게 전달하도록 요청한 현재 게임의 소스 묶음입니다. 작성자는 GA / Codex이며 인계 후 작성했습니다.

**다른 AI는 [AI_HANDOFF.md](AI_HANDOFF.md)부터 읽으세요.** 게임 규칙, 파일 지도, 원고 출처, 실제 확인 범위가 들어 있습니다.

- [현재 게임 코드](game/games/noir-trpg/scripts/)
- [원고 연결 설명](docs/SCENE_BINDINGS.md) · [39개 사건 노드 데이터](docs/INCIDENT_BINDINGS.json)
- [공유 상태와 방 서버](game/webengine/server/play.py)
- [현재 작업 범위](docs/PUBLICATION_SCOPE.md)

## 받기

```sh
git clone --branch ga/black-ridge-20261114 --single-branch https://github.com/tjdgns3728-cloud/AI-Mafia.git
cd AI-Mafia/black-ridge
```

저장소 읽기 권한이 있는 계정이 필요합니다. 저장소의 다른 폴더는 이전 게임입니다. 이 게시본은 `black-ridge/` 아래에 있습니다.

## 실행

Python 3.11 이상과 Node.js가 필요합니다. Python 외부 패키지는 필요하지 않습니다.

Windows에서는 `game/play.cmd`를 열어 1번(이 컴퓨터의 AI 자리) 또는 2번(같은 네트워크의 사람끼리)을 고릅니다. 실행 창을 닫으면 그 실행의 서버가 종료됩니다. 서버 자동 시작이나 게임 플레이를 AI에게 새로 허가하는 문서는 아닙니다.

명령으로 사람끼리/규칙 진행 모드를 열려면:

```sh
cd game/webengine
python -m server.play --game ../games/noir-trpg --port 8868 --ai off
```

실행한 컴퓨터에서 `http://127.0.0.1:8868/`을 엽니다. GitHub 주소는 소스 주소이며 P의 현재 게임방에 접속하는 주소가 아닙니다. 다른 컴퓨터의 `127.0.0.1`은 P의 컴퓨터를 가리키지 않습니다.

AI 자리를 실제 구독 응답으로 사용하려면 실행 컴퓨터에 게임이 사용하는 Codex CLI와 그 컴퓨터 사용자의 ChatGPT 구독 로그인이 필요합니다. 로그인 정보는 이 저장소에 없습니다. 위 명령의 `--ai off`를 `--ai on`으로 바꾸면 실제 구독 사용이 발생할 수 있습니다. 기존 연결 설정은 `game/webengine/ai.json`에 있으며, 모델의 가용성과 실제 로그인은 각 실행 환경에서 확인해야 합니다. 이 게시 작업에서는 AI를 호출하지 않았습니다.

## 음악과 상태

P가 로컬에서 제공한 `background.mp3`는 게시하지 않았습니다. 사용 권한이 있는 음악을 `game/games/noir-trpg/assets/music/background.mp3`에 직접 두면 기존 코드가 사용합니다. 기본 게시본에서 해당 배경음은 빠져 있습니다. 로그인 토큰·현재 방·플레이 로그·DB도 포함하지 않습니다.

코드와 연결 자료를 전달한 상태입니다. 새 사건들을 한 판 끝까지 플레이해 확인한 결과는 없습니다. 2026-11-14 04:41 KST에 P의 로컬 실행본의 시작 페이지 HTTP 200과 프로젝트 이름을 확인했으나, 이것은 모든 기능이 정상이라는 증거가 아닙니다.
