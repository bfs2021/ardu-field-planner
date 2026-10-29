#!/usr/bin/env python3
"""UDP <-> WebSocket bridge so the FMP web app in a desktop browser can use a WiFi MAVLink
link (ELRS backpack, ESP bridge). Browsers can't receive UDP; this listens for MAVLink on
UDP 0.0.0.0:14550 and hands it to FMP over ws://127.0.0.1:14550 (and back).

Run:   python3 scripts/udp_ws_bridge.py        (stdlib only, no installs)
FMP:   Flight -> UDP, address 0.0.0.0:14550 (default) -> Connect.
"""
import asyncio, base64, hashlib, struct, sys

UDP_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 14550
WS_HOST, WS_PORT = "127.0.0.1", UDP_PORT   # same number, TCP vs UDP don't clash
GUID = b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

clients = set()     # open WebSocket writers
peer = None         # backpack address, learned from its first packet
stats = {"udp_in": 0, "ws_in": 0}


def ws_frame(payload: bytes) -> bytes:
    n = len(payload)
    if n < 126:
        head = struct.pack("!BB", 0x82, n)
    elif n < 65536:
        head = struct.pack("!BBH", 0x82, 126, n)
    else:
        head = struct.pack("!BBQ", 0x82, 127, n)
    return head + payload


class Udp(asyncio.DatagramProtocol):
    def connection_made(self, transport):
        self.transport = transport

    def datagram_received(self, data, addr):
        global peer
        if peer != addr:
            print(f"UDP: MAVLink from {addr[0]}:{addr[1]}", flush=True)
            peer = addr
        stats["udp_in"] += 1
        frame = ws_frame(data)
        for w in list(clients):
            w.write(frame)


async def handle_ws(reader, writer, udp):
    try:
        head = await reader.readuntil(b"\r\n\r\n")
    except (asyncio.IncompleteReadError, asyncio.LimitOverrunError):
        writer.close(); return
    key = next((l.split(b":", 1)[1].strip() for l in head.split(b"\r\n")
                if l.lower().startswith(b"sec-websocket-key:")), None)
    if not key:
        writer.write(b"HTTP/1.1 400 Bad Request\r\n\r\n"); writer.close(); return
    accept = base64.b64encode(hashlib.sha1(key + GUID).digest())
    writer.write(b"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                 b"Sec-WebSocket-Accept: " + accept + b"\r\n\r\n")
    clients.add(writer)
    print("WS: FMP connected" + ("" if peer else " (no UDP from the backpack yet)"), flush=True)
    try:
        while True:
            b0, b1 = await reader.readexactly(2)
            op, n = b0 & 0x0F, b1 & 0x7F
            if n == 126:
                n, = struct.unpack("!H", await reader.readexactly(2))
            elif n == 127:
                n, = struct.unpack("!Q", await reader.readexactly(8))
            mask = await reader.readexactly(4) if b1 & 0x80 else b"\0\0\0\0"
            data = bytes(c ^ mask[i % 4] for i, c in enumerate(await reader.readexactly(n)))
            if op == 0x8:                                   # close
                break
            if op == 0x9:                                   # ping -> pong
                writer.write(struct.pack("!BB", 0x8A, len(data)) + data); continue
            if op in (0x1, 0x2, 0x0):                       # text/binary/continuation -> UDP
                stats["ws_in"] += 1
                if peer:
                    udp.sendto(data, peer)
                else:   # nobody heard yet: broadcast so a backpack waiting for a GCS hears us
                    udp.sendto(data, ("255.255.255.255", UDP_PORT))
    except (asyncio.IncompleteReadError, ConnectionError):
        pass
    finally:
        clients.discard(writer)
        writer.close()
        print("WS: FMP disconnected", flush=True)


async def report():
    while True:
        await asyncio.sleep(10)
        print(f"… UDP in {stats['udp_in']} pkts, FMP->drone {stats['ws_in']} pkts, "
              f"backpack {peer[0] if peer else 'not heard'}", flush=True)


async def main():
    import socket
    loop = asyncio.get_running_loop()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.bind(("0.0.0.0", UDP_PORT))
    udp, _ = await loop.create_datagram_endpoint(Udp, sock=sock)
    server = await asyncio.start_server(lambda r, w: handle_ws(r, w, udp), WS_HOST, WS_PORT)
    print(f"Bridge: UDP 0.0.0.0:{UDP_PORT}  <->  ws://{WS_HOST}:{WS_PORT}. Ctrl+C to stop.", flush=True)
    asyncio.create_task(report())
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
