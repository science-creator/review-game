# -*- coding: utf-8 -*-
"""
중학교 과학 복습 게임(땅따먹기) · 로컬 서버 실행 도우미

- 파이썬 기본 모듈만 사용한다. 추가 설치나 인터넷 연결이 필요 없다.
- 이 파일이 있는 폴더(ReviewGame)를 웹 루트로 삼아 서버를 켜고,
  이 컴퓨터의 브라우저에서 index.html(처음 화면)을 자동으로 열어 준다.
- 8400번 포트가 이미 쓰이고 있으면 8401, 8402 … 순서로 빈 포트를 찾는다.
  (binary-converter 8000대 · ai-class 8100대 · EnergyKeeper 8200대 ·
   electromagnetic-induction 8300대 · review-escape-3/4/6 8401~8403 과 겹치지 않는다.)

이 저장소는 2026-09-27 부터 땅따먹기(1·2·5차시, 교사 화면 1대로만 보여 준다)만 담고 있다.
탈출 게임(3·4·6차시, 모둠 기기 여러 대가 접속)은 유출 방지를 위해 별도 저장소
(review-escape-3/4/6)로 옮겼고, 그쪽에 각자의 server.py 가 따로 있다.
그래서 이 서버는 "0.0.0.0"으로 열어 두지만(필요하면 같은 와이파이의 다른 기기에서도 열 수 있다),
보통은 이 컴퓨터(localhost)에서만 열면 충분하다.

실행 방법
  ① 로컬서버_실행.bat 을 더블클릭          (가장 쉬움)
  ② 또는 명령창에서  python server.py
     브라우저를 자동으로 열지 않으려면  python server.py --no-browser
  종료 : 이 창에서 Ctrl + C (또는 창 닫기)

※ index.html 을 그냥 더블클릭해도 대부분 기능이 동작한다(외부 의존성 0개). 이 서버는
  수업 환경과 똑같은 http 로 미리 확인하고 싶을 때만 있으면 된다.
"""

import functools
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))   # 이 파일이 있는 폴더 = 웹 루트
FIRST_PORT = 8400                                   # 처음 시도할 포트
TRY_COUNT = 20                                      # 몇 개까지 찾아볼지

def find_free_port(first, count):
    """빈 포트를 찾아 번호를 돌려준다. 못 찾으면 None.
    모둠 기기도 접속해야 하므로 "0.0.0.0"(모든 네트워크 카드)으로 비어 있는지 본다."""
    for port in range(first, first + count):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue          # 이미 쓰이는 포트 → 다음 번호로
    return None


def get_local_ip():
    """이 컴퓨터가 교실 와이파이에서 쓰는 주소를 알아낸다.
    실제로 인터넷에 무엇을 보내지는 않는다(연결 없이 라우팅 정보만 물어본다)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return None
    finally:
        s.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    """수업 중 파일을 고쳐도 새로고침하면 바로 반영되도록 캐시를 끈다."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 접속 기록을 짧게 표시 (학생 정보는 남기지 않는다 — IP·요청한 파일 이름뿐)
        sys.stdout.write("  %s\n" % (fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    index = os.path.join(ROOT, "index.html")
    if not os.path.exists(index):
        print("[오류] index.html 을 찾을 수 없습니다:", index)
        return 1

    port = find_free_port(FIRST_PORT, TRY_COUNT)
    if port is None:
        print("[오류] %d ~ %d 사이에 빈 포트가 없습니다." % (FIRST_PORT, FIRST_PORT + TRY_COUNT - 1))
        return 1

    local_ip = get_local_ip()
    local_url = "http://localhost:%d/index.html" % port
    handler = functools.partial(Handler, directory=ROOT)

    print("=" * 62)
    print("  중학교 과학 복습 게임 · 로컬 서버")
    print("=" * 62)
    print("  이 컴퓨터에서 여는 주소 : %s" % local_url)
    print("  폴더 : %s" % ROOT)
    print()
    if local_ip:
        print("  ▶ 땅따먹기는 보통 이 컴퓨터 화면만 TV·전자칠판에 연결하면 됩니다 ◀")
        print("    (혹시 다른 기기에서도 열어야 하면) http://%s:%d/" % (local_ip, port))
    else:
        print("  [안내] 이 컴퓨터의 와이파이 주소를 찾지 못했습니다. 이 컴퓨터에서만 열립니다.")
    print("=" * 62)
    print("  종료 : 이 창에서 Ctrl + C  (또는 창 닫기)")
    print("=" * 62)

    with Server(("0.0.0.0", port), handler) as httpd:
        # 서버가 준비된 뒤 이 컴퓨터의 기본 브라우저로 처음 화면을 열기
        # (--no-browser 를 주면 열지 않는다 — 서버만 켜 두고 싶을 때)
        if "--no-browser" not in sys.argv:
            threading.Timer(0.7, lambda: webbrowser.open(local_url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버를 종료합니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
