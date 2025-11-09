"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const rooms_1 = require("./rooms");
const drawing_state_1 = require("./drawing-state");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const roomManager = new rooms_1.RoomManager();
const drawingState = new drawing_state_1.DrawingState();
app.use(express_1.default.static('client'));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    try {
        const userId = socket.id;
        const userColor = generateUserColor();
        const userName = `User ${userId.substring(0, 6)}`;
        const roomId = 'default';
        roomManager.joinRoom(roomId, userId, userName, userColor);
        socket.join(roomId);
        socket.emit('init', {
            userId,
            userName,
            userColor,
            roomId,
            canvasState: drawingState.getState(roomId),
            users: roomManager.getRoomUsers(roomId)
        });
        socket.to(roomId).emit('userJoined', {
            userId,
            userName,
            userColor
        });
        socket.on('drawStart', (data) => {
            const operation = drawingState.startDraw(roomId, userId, data);
            socket.emit('drawStart', {
                ...data,
                userId,
                operationId: operation.id
            });
            socket.to(roomId).emit('drawStart', {
                ...data,
                userId,
                operationId: operation.id
            });
        });
        socket.on('drawMove', (data) => {
            const operation = drawingState.addPoint(roomId, userId, data.x, data.y);
            socket.to(roomId).emit('drawMove', {
                ...data,
                userId,
                operationId: operation.id
            });
        });
        socket.on('drawEnd', () => {
            const operation = drawingState.endDraw(roomId, userId);
            if (operation) {
                socket.emit('drawEnd', {
                    userId,
                    operationId: operation.id
                });
                socket.to(roomId).emit('drawEnd', {
                    userId,
                    operationId: operation.id
                });
            }
        });
        socket.on('cursorMove', (data) => {
            socket.to(roomId).emit('cursorMove', {
                ...data,
                userId,
                userColor
            });
        });
        socket.on('undo', () => {
            const operation = drawingState.undo(roomId);
            if (operation) {
                io.to(roomId).emit('undo', {
                    operationId: operation.id,
                    userId: operation.userId
                });
            }
        });
        socket.on('redo', () => {
            const operation = drawingState.redo(roomId);
            if (operation) {
                io.to(roomId).emit('redo', {
                    operationId: operation.id,
                    userId: operation.userId
                });
            }
        });
        socket.on('clear', () => {
            drawingState.clear(roomId);
            io.to(roomId).emit('clear', { userId });
        });
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            try {
                roomManager.leaveRoom(roomId, userId);
                socket.to(roomId).emit('userLeft', { userId });
            }
            catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }
    catch (error) {
        console.error('Error setting up connection:', error);
        socket.disconnect();
    }
});
function generateUserColor() {
    const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
        '#FF00FF', '#00FFFF', '#FFA500', '#800080',
        '#FFC0CB', '#A52A2A', '#808080', '#000000'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
