# -*- coding: utf-8 -*-
"""
중학교 과학 복습 게임 · 로컬 서버 실행 도우미

- 파이썬 기본 모듈만 사용한다. 추가 설치나 인터넷 연결이 필요 없다.
- 이 파일이 있는 폴더(ReviewGame)를 웹 루트로 삼아 서버를 켜고,
  이 컴퓨터의 브라우저에서 index.html(처음 화면)을 자동으로 열어 준다.
- 8400번 포트가 이미 쓰이고 있으면 8401, 8402 … 순서로 빈 포트를 찾는다.
  (binary-converter 8000대 · ai-class 8100대 · EnergyKeeper 8200대 ·
   electromagnetic-induction 8300대와 겹치지 않는다.)

이 서버는 EnergyKeeper 등 다른 앱의 서버와 달리 "0.0.0.0"으로 연다.
탈출 게임처럼 모둠 기기 여러 대가 같은 교실 와이파이로 접속해야 하기 때문이다
(이 컴퓨터만 쓰면 되는 다른 앱들은 "127.0.0.1"만 열어도 충분하다).

실행 방법
  ① 로컬서버_실행.bat 을 더블클릭          (가장 쉬움)
  ② 또는 명령창에서  python server.py
     브라우저를 자동으로 열지 않으려면  python server.py --no-browser
  종료 : 이 창에서 Ctrl + C (또는 창 닫기)

※ index.html 을 그냥 더블클릭해도 대부분 기능이 동작한다(외부 의존성 0개).
  다만 모둠 기기가 이 컴퓨터에 접속하려면 반드시 이 서버가 필요하다.
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

# 모둠 기기가 접속할 페이지 목록 (교실 칠판·화면에 적어 주기 좋게)
GROUP_PAGES = [
    ("3차시 탈출 (화학·날씨·운동·자극)", "escape.html?s=3"),
    ("4차시 탈출 (유전·에너지·우주·기술)", "escape.html?s=4"),
    ("6차시 탈출 (그림·그래프)", "escape.html?s=6"),
]


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
        print("  ▶ 모둠 기기(태블릿 등)에서는 이 주소로 접속하세요 ◀")
        print("    http://%s:%d/" % (local_ip, port))
        print()
        for name, page in GROUP_PAGES:
            # 한글은 글자 수만큼 자리를 맞춰도 화면 폭이 고르지 않으므로, 정렬 없이 줄만 나눈다.
            print("      · %s" % name)
            print("        http://%s:%d/%s" % (local_ip, port, page))
        print()
        print("  ※ 모둠 기기와 이 컴퓨터가 같은 와이파이(교실 와이파이)에 있어야 합니다.")
        print("  ※ 접속이 안 되면 : ① Windows 방화벽이 물으면 '개인 네트워크'에 체크하고")
        print("     허용을 누르세요. ② 학교 와이파이에 기기끼리 통신을 막는 'AP 격리'가")
        print("     걸려 있으면 이 방식이 안 됩니다 — 수업 전에 모둠 기기 1대로 미리 접속해")
        print("     확인해 보세요. 안 되면 처음 화면(index.html)의 폴더 복사 방법을 쓰세요.")
    else:
        print("  [안내] 이 컴퓨터의 와이파이 주소를 찾지 못했습니다.")
        print("         모둠 기기 접속이 필요하면 인터넷(와이파이) 연결을 확인하세요.")
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
