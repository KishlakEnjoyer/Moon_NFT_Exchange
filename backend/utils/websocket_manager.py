from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send_balance(self, user_id: int, balance: float):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_json({"type": "balance_update", "balance": balance})
            except Exception:
                self.disconnect(user_id)

ws_manager = WebSocketManager()