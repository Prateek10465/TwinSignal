"""FastAPI entry point:  uvicorn app:app --host 0.0.0.0 --port 8000   (put TLS in front for wss://)."""
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from hub import Hub

app = FastAPI(title="Twin Signal")
hub = Hub()


class FConn:
    def __init__(self, ws: WebSocket):
        self.ws, self.room = ws, None

    async def send(self, obj: dict):
        await self.ws.send_json(obj)


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    conn = FConn(ws)
    try:
        while True:
            await hub.on_message(conn, await ws.receive_json())
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        await hub.on_close(conn)


@app.get("/health")
async def health():
    return {"ok": True, "rooms": len(hub.rooms)}


@app.get("/api/leaderboard")
async def api_leaderboard():
    return hub.board()


app.mount("/", StaticFiles(directory=Path(__file__).resolve().parents[1] / "client", html=True), name="client")
