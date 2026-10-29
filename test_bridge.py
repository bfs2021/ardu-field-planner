"""scripts/udp_ws_bridge.py: only FMP itself may open the WebSocket to the drone.

Starts the bridge on a free port (no drone needed) and checks which WebSocket
handshakes it accepts: a foreign web page or a DNS-rebinding Host must get 403.
"""
import base64
import os
import socket
import subprocess
import sys
import time

with socket.socket() as _s:
    _s.bind(("127.0.0.1", 0))
    PORT = _s.getsockname()[1]
bridge = subprocess.Popen([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                        "scripts", "udp_ws_bridge.py"), str(PORT)],
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
failed = False


def check(name, cond):
    global failed
    print(("  OK  " if cond else " FAIL ") + name)
    failed |= not cond


def handshake(origin, host=None):
    s = socket.create_connection(("127.0.0.1", PORT), timeout=5)
    hdr = (f"GET / HTTP/1.1\r\nHost: {host or f'127.0.0.1:{PORT}'}\r\nUpgrade: websocket\r\n"
           f"Connection: Upgrade\r\nSec-WebSocket-Key: {base64.b64encode(os.urandom(16)).decode()}\r\n"
           "Sec-WebSocket-Version: 13\r\n")
    if origin:
        hdr += f"Origin: {origin}\r\n"
    s.sendall((hdr + "\r\n").encode())
    line = s.recv(200).split(b"\r\n")[0].decode()
    s.close()
    return line.split(" ")[1] if " " in line else line


try:
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", PORT), timeout=1).close()
            break
        except OSError:
            time.sleep(0.1)
    check("FMP served by the bridge (same origin) -> 101", handshake(f"http://127.0.0.1:{PORT}") == "101")
    check("FMP on GitHub Pages -> 101", handshake("https://tecelskyyivan-alt.github.io") == "101")
    check("phone over LAN (Origin = its Host IP) -> 101",
          handshake(f"http://192.168.0.5:{PORT}", f"192.168.0.5:{PORT}") == "101")
    check("non-browser client (no Origin) -> 101", handshake(None) == "101")
    check("foreign web page -> 403", handshake("https://evil.example") == "403")
    check("other github.io site -> 403", handshake("https://evil.github.io") == "403")
    check("DNS-rebinding Host -> 403",
          handshake(f"http://evil.example:{PORT}", f"evil.example:{PORT}") == "403")
finally:
    bridge.kill()

print("\nRESULT: " + ("ALL CHECKS PASSED" if not failed else "FAILURES ABOVE"))
sys.exit(1 if failed else 0)
