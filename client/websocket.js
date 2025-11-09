import { CanvasManager } from './canvas.js';
export class WebSocketManager {
    constructor(canvasManager) {
        this.userId = '';
        this.userColor = '';
        this.users = new Map();
        this.canvasManager = canvasManager;
        this.setupSocket();
    }
    setupSocket() {
        
        this.socket = io();
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus?.('Connected', true);
        });
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus?.('Disconnected', false);
        });
        this.socket.on('init', (data) => {
            console.log('Initialized:', data);
            this.userId = data.userId;
            this.userColor = data.userColor;
            
            data.users.forEach(user => {
                this.users.set(user.id, user);
            });
            this.updateUsersList?.(Array.from(this.users.values()));
            this.updateUserCount?.(this.users.size);
            
            this.loadCanvasState(data.canvasState);
        });
        this.socket.on('userJoined', (data) => {
            console.log('User joined:', data);
            this.users.set(data.userId, {
                id: data.userId,
                name: data.userName,
                color: data.userColor
            });
            this.updateUsersList?.(Array.from(this.users.values()));
            this.updateUserCount?.(this.users.size);
        });
        this.socket.on('userLeft', (data) => {
            console.log('User left:', data.userId);
            this.users.delete(data.userId);
            this.canvasManager.removeCursor(data.userId);
            this.updateUsersList?.(Array.from(this.users.values()));
            this.updateUserCount?.(this.users.size);
        });
        
        this.socket.on('drawStart', (data) => {
            if (data.userId !== this.userId) {
                
                this.canvasManager.handleRemoteDrawStart(data.userId, data.operationId, data.x, data.y, data.tool, data.color, data.strokeWidth);
            }
            else {
                
                this.canvasManager.handleLocalDrawStart(data.operationId);
            }
        });
        this.socket.on('drawMove', (data) => {
            if (data.userId !== this.userId) {
                this.canvasManager.handleRemoteDrawMove(data.userId, data.operationId, data.x, data.y);
            }
        });
        this.socket.on('drawEnd', (data) => {
            if (data.userId !== this.userId) {
                this.canvasManager.handleRemoteDrawEnd(data.userId, data.operationId);
            }
            else {
                this.canvasManager.handleLocalDrawEnd(data.operationId);
            }
        });
        
        this.socket.on('cursorMove', (data) => {
            if (data.userId !== this.userId) {
                this.canvasManager.updateCursor(data.userId, data.x, data.y, data.userColor);
            }
        });
        
        this.socket.on('undo', (data) => {
            this.canvasManager.handleUndo(data.operationId);
        });
        this.socket.on('redo', (data) => {
            this.canvasManager.handleRedo(data.operationId);
        });
        
        this.socket.on('clear', (data) => {
            this.canvasManager.handleClear();
        });
        
        this.canvasManager.onDrawStart = (x, y, tool, color, strokeWidth) => {
            this.socket.emit('drawStart', { x, y, tool, color, strokeWidth });
        };
        this.canvasManager.onDrawMove = (x, y) => {
            this.socket.emit('drawMove', { x, y });
        };
        this.canvasManager.onDrawEnd = () => {
            this.socket.emit('drawEnd');
        };
        this.canvasManager.onCursorMove = (x, y) => {
            this.socket.emit('cursorMove', { x, y });
        };
    }
    loadCanvasState(operations) {
        
        if (!Array.isArray(operations)) {
            console.warn('Invalid canvas state received');
            return;
        }
        operations.forEach((op) => {
            try {
                if (op && op.points && Array.isArray(op.points) && op.points.length >= 2) {
                    this.canvasManager.handleRemoteDrawStart(op.userId || 'unknown', op.id || '', op.points[0].x, op.points[0].y, op.tool || 'brush', op.color || '#000000', op.strokeWidth || 5);
                    for (let i = 1; i < op.points.length; i++) {
                        const point = op.points[i];
                        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
                            this.canvasManager.handleRemoteDrawMove(op.userId || 'unknown', op.id || '', point.x, point.y);
                        }
                    }
                    this.canvasManager.handleRemoteDrawEnd(op.userId || 'unknown', op.id || '');
                }
            }
            catch (error) {
                console.error('Error loading operation:', error, op);
            }
        });
    }
    emitUndo() {
        this.socket.emit('undo');
    }
    emitRedo() {
        this.socket.emit('redo');
    }
    emitClear() {
        this.socket.emit('clear');
    }
    getUserId() {
        return this.userId;
    }
    getUserColor() {
        return this.userColor;
    }
    setUpdateConnectionStatus(callback) {
        this.updateConnectionStatus = callback;
    }
    setUpdateUsersList(callback) {
        this.updateUsersList = callback;
    }
    setUpdateUserCount(callback) {
        this.updateUserCount = callback;
    }
}
