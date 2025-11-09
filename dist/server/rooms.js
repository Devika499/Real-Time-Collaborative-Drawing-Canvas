"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    joinRoom(roomId, userId, userName, userColor) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
        }
        const room = this.rooms.get(roomId);
        room.set(userId, {
            id: userId,
            name: userName,
            color: userColor
        });
    }
    leaveRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(userId);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }
    getRoomUsers(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return [];
        }
        return Array.from(room.values());
    }
    getUser(roomId, userId) {
        const room = this.rooms.get(roomId);
        return room?.get(userId);
    }
}
exports.RoomManager = RoomManager;
