"""Zero-dependency server: serves the client and speaks WebSocket (RFC 6455) with only the stdlib.

    python server/serve.py            # http://localhost:8000
    PORT=9000 python server/serve.py

Use app.py (FastAPI + uvicorn) for production behind TLS.  The game logic is identical.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import mimetypes
import os
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hub import Hub  # noqa: E402

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
CLIENT = Path(__file__).resolve().parents[1] / "client"


class WSConn:
    def __init__(self, reader, writer):
        self.reader, self.writer = reader, writer
        self.room = None
        self.closed = False

    async def send(self, obj: dict):
        if self.closed:
            return
        data = json.dumps(obj, separators=(",", ":")).encode()
        n = len(data)
        if n < 126:
            head = struct.pack("!BB", 0x81, n)
        elif n < 65536:
            head = struct.pack("!BBH", 0x81, 126, n)
        else:
            head = struct.pack("!BBQ", 0x81, 127, n)
        self.writer.write(head + data)
        try:
            await self.writer.drain()
        except Exception:
            self.closed = True

    async def recv(self):
        """Return a text message, or None on close."""
        buf = b""
        while True:
            try:
                h = await self.reader.readexactly(2)
            except Exception:
                return None
            op, ln = h[0] & 0x0F, h[1] & 0x7F
            masked = h[1] & 0x80
            if ln == 126:
                ln = struct.unpack("!H", await self.reader.readexactly(2))[0]
            elif ln == 127:
                ln = struct.unpack("!Q", await self.reader.readexactly(8))[0]
            if ln > 1 << 20:
                return None
            mask = await self.reader.readexactly(4) if masked else b""
            payload = await self.reader.readexactly(ln)
            if masked:
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            fin = h[0] & 0x80
            if op == 0x8:
                return None
            if op == 0x9:
                self.writer.write(struct.pack("!BB", 0x8A, len(payload)) + payload)
                continue
            if op == 0xA:
                continue
            buf += payload
            if fin:
                return buf.decode("utf-8", "replace")


def make_handler(hub: Hub):
    async def handle(reader, writer):
        try:
            head = await reader.readuntil(b"\r\n\r\n")
        except Exception:
            writer.close()
            return
        lines = head.decode("latin1").split("\r\n")
        try:
            method, path, _ = lines[0].split(" ", 2)
        except ValueError:
            writer.close()
            return
        hdr = {}
        for ln in lines[1:]:
            if ":" in ln:
                k, v = ln.split(":", 1)
                hdr[k.strip().lower()] = v.strip()
        if hdr.get("upgrade", "").lower() == "websocket" and path.startswith("/ws"):
            acc = base64.b64encode(hashlib.sha1((hdr["sec-websocket-key"] + GUID).encode()).digest()).decode()
            writer.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                          f"Sec-WebSocket-Accept: {acc}\r\n\r\n").encode())
            await writer.drain()
            conn = WSConn(reader, writer)
            try:
                while True:
                    raw = await conn.recv()
                    if raw is None:
                        break
                    try:
                        await hub.on_message(conn, json.loads(raw))
                    except json.JSONDecodeError:
                        pass
            finally:
                conn.closed = True
                await hub.on_close(conn)
                writer.close()
            return
        if path.split("?", 1)[0] == "/api/leaderboard":
            body = json.dumps(hub.board()).encode()
            writer.write((f"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {len(body)}\r\n"
                          "Cache-Control: no-cache\r\nConnection: close\r\n\r\n").encode() + body)
            await writer.drain()
            writer.close()
            return
        # static files
        rel = path.split("?", 1)[0].lstrip("/") or "index.html"
        f = (CLIENT / rel).resolve()
        if CLIENT.resolve() not in f.parents and f != CLIENT.resolve() or not f.is_file():
            body, code, ctype = b"not found", 404, "text/plain"
        else:
            body, code = f.read_bytes(), 200
            ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        writer.write((f"HTTP/1.1 {code} OK\r\nContent-Type: {ctype}; charset=utf-8\r\nContent-Length: {len(body)}\r\n"
                      "Cache-Control: no-cache\r\nConnection: close\r\n\r\n").encode() + body)
        await writer.drain()
        writer.close()
    return handle


async def main(host="0.0.0.0", port=None, hub: Hub | None = None):
    port = port or int(os.environ.get("PORT", "8000"))
    if hub is None:
        timing = None
        if os.environ.get("TS_TIMING") == "fast":      # for demos and browser tests
            from game import Timing
            timing = Timing(brief=40, lock=1.0, round_s=0.02, drift_pause=8, debrief=10, meeting=25, reveal=8,
                            bot_ready_min=2, bot_vote_lo=3, bot_vote_hi=12)
        hub = Hub(timing)
    srv = await asyncio.start_server(make_handler(hub), host, port)
    print(f"Twin Signal on http://localhost:{port}  (ws path /ws)")
    async with srv:
        await srv.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
