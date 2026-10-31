const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Same Word Game Server is running ✅');
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

wss.on('connection', (ws) => {
    ws.roomId = null;
    ws.playerId = null;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'join-room') {
            if (ws.roomId && rooms.has(ws.roomId)) {
                rooms.get(ws.roomId).delete(ws);
                if (rooms.get(ws.roomId).size === 0) rooms.delete(ws.roomId);
            }
            ws.roomId = msg.roomId;
            ws.playerId = msg.sender;
            if (!rooms.has(ws.roomId)) rooms.set(ws.roomId, new Set());
            rooms.get(ws.roomId).add(ws);
            console.log(`[${ws.roomId}] ${ws.playerId} 加入，共 ${rooms.get(ws.roomId).size} 人`);
            return;
        }

        if (ws.roomId && rooms.has(ws.roomId)) {
            const payload = JSON.stringify(msg);
            rooms.get(ws.roomId).forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            });
        }
    });

    ws.on('close', () => {
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.get(ws.roomId).delete(ws);
            if (rooms.get(ws.roomId).size === 0) rooms.delete(ws.roomId);
        }
    });

    ws.on('error', (err) => console.error('WS 错误:', err.message));
});

const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);
wss.on('close', () => clearInterval(interval));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`✅ 服务器已启动，端口 ${PORT}`));
