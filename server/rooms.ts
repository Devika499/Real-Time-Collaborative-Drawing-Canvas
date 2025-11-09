interface User {
    id: string;
    name: string;
    color: string;
}

export class RoomManager {
    private rooms: Map<string, Map<string, User>> = new Map();

    joinRoom(roomId: string, userId: string, userName: string, userColor: string): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
        }
        
        const room = this.rooms.get(roomId)!;
        room.set(userId, {
            id: userId,
            name: userName,
            color: userColor
        });
    }

    leaveRoom(roomId: string, userId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(userId);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }

    getRoomUsers(roomId: string): User[] {
        const room = this.rooms.get(roomId);
        if (!room) {
            return [];
        }
        return Array.from(room.values());
    }

    getUser(roomId: string, userId: string): User | undefined {
        const room = this.rooms.get(roomId);
        return room?.get(userId);
    }
}

