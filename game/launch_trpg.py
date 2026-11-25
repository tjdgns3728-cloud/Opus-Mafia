"""Small launcher: identify the game before reusing a port; never kill an existing server."""
import argparse
import json
import pathlib
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parent
PORT = 8868
URL = f'http://127.0.0.1:{PORT}/'
# 게임 폴더 → (이름, AI와 하는 문, 사람끼리 하는 문). 2026-11-26: 8인 채팅 마피아를 더함(사용자 "네, 새로 만들기")
GAMES = {'noir-trpg': ('밤의 증언 · 블랙 리지', 8868, 8869), 'chat-mafia': ('8인 채팅 마피아', 8870, 8871)}

def probe():
    try:
        with urllib.request.urlopen(URL + 'api/files', timeout=1) as response:
            return json.load(response).get('project')
    except Exception:
        return None

def main():
    global PORT, URL
    ap = argparse.ArgumentParser()
    ap.add_argument('--local', action='store_true')
    ap.add_argument('--lan', action='store_true')
    ap.add_argument('--no-browser', action='store_true')
    ap.add_argument('--game', choices=sorted(GAMES), default='noir-trpg')
    args = ap.parse_args()
    TITLE, PORT, LAN_PORT = GAMES[args.game]
    URL = f'http://127.0.0.1:{PORT}/'
    if not (args.local or args.lan):
        print(f'{TITLE}\n1. 이 컴퓨터에서 AI와 테스트\n2. 같은 네트워크에서 여러 사람과 플레이 (AI 없음)')
        args.lan = input('선택 [1]: ').strip() == '2'
    if args.lan:
        PORT = LAN_PORT
        URL = f'http://127.0.0.1:{PORT}/'
    if not shutil.which('node'):
        raise SystemExit('Node.js를 찾을 수 없습니다. Node.js 설치 후 다시 실행하세요.')
    if not args.lan:
        sys.path.insert(0, str(ROOT / 'webengine'))
        from server.codex_cli import find_cli, clean_env
        cli = find_cli()
        if not cli:
            raise SystemExit('Codex CLI가 필요합니다. Codex 설치 후 ChatGPT 계정으로 로그인해 주세요.')
        try:
            auth = subprocess.run([cli, 'login', 'status'], capture_output=True, text=True,
                                  encoding='utf-8', errors='replace', env=clean_env(), timeout=10,
                                  creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        except (OSError, subprocess.TimeoutExpired):
            raise SystemExit('GPT 구독 로그인 상태를 확인하지 못했습니다. Codex 앱의 로그인을 확인해 주세요.')
        if auth.returncode or 'Logged in using ChatGPT' not in auth.stdout + auth.stderr:
            raise SystemExit('ChatGPT 구독 로그인이 필요합니다. 터미널에서 codex login을 실행해 주세요.')
        print('AI 연결: ChatGPT 구독 · GPT-6 Luna', flush=True)
    existing = probe()
    if existing:
        if existing != args.game:
            raise SystemExit(f'{PORT}번에서 다른 게임이 실행 중입니다. 다른 프로그램을 종료하지 않고 멈춥니다.')
        print(f'이미 실행 중인 {TITLE}을(를) 엽니다. AI 모드와 사람끼리 모드는 서로 다른 주소를 사용합니다.')
        if not args.no_browser:
            webbrowser.open(URL)
        return
    cmd = [sys.executable, '-B', '-X', 'utf8', '-m', 'server.play', '--game', '../games/' + args.game, '--port', str(PORT), '--ai', 'off' if args.lan else 'on']
    if args.lan:
        cmd += ['--host', '0.0.0.0']
    child = subprocess.Popen(cmd, cwd=ROOT / 'webengine')
    try:
        for _ in range(50):
            if child.poll() is not None:
                raise SystemExit('서버 실행이 멈췄습니다. 위 오류를 확인하세요.')
            if probe() == args.game:
                break
            time.sleep(.2)
        else:
            raise SystemExit('서버가 준비되지 않았습니다. 위 출력을 확인하세요.')
        print('\n여는 주소:', URL, flush=True)
        if args.lan:
            addresses=sorted({x[4][0] for x in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET) if not x[4][0].startswith('127.')})
            for address in addresses:
                print(f'같은 네트워크의 다른 컴퓨터: http://{address}:{PORT}/', flush=True)
        print('이 창을 닫으면 서버와 진행 중인 방이 종료됩니다.', flush=True)
        if not args.no_browser:
            webbrowser.open(URL)
        child.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(5)
            except subprocess.TimeoutExpired:
                child.kill()

if __name__ == '__main__':
    main()
