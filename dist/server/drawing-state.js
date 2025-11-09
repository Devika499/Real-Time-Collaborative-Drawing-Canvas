"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingState = void 0;
const uuid_1 = require("uuid");
class DrawingState {
    constructor() {
        this.states = new Map();
    }
    getRoomState(roomId) {
        if (!this.states.has(roomId)) {
            this.states.set(roomId, {
                operations: [],
                undoStack: [],
                redoStack: [],
                currentOperation: null
            });
        }
        return this.states.get(roomId);
    }
    startDraw(roomId, userId, data) {
        const state = this.getRoomState(roomId);
        // Clear redo stack when starting a new operation
        state.redoStack = [];
        const operation = {
            id: (0, uuid_1.v4)(),
            userId,
            tool: data.tool,
            color: data.color,
            strokeWidth: data.strokeWidth,
            points: [{ x: data.x, y: data.y }],
            timestamp: Date.now()
        };
        state.currentOperation = operation;
        return operation;
    }
    addPoint(roomId, userId, x, y) {
        const state = this.getRoomState(roomId);
        if (state.currentOperation && state.currentOperation.userId === userId) {
            state.currentOperation.points.push({ x, y });
            return state.currentOperation;
        }
        // If no current operation, create one (shouldn't happen in normal flow)
        const operation = {
            id: (0, uuid_1.v4)(),
            userId,
            tool: 'brush',
            color: '#000000',
            strokeWidth: 5,
            points: [{ x, y }],
            timestamp: Date.now()
        };
        state.currentOperation = operation;
        return operation;
    }
    endDraw(roomId, userId) {
        const state = this.getRoomState(roomId);
        if (state.currentOperation && state.currentOperation.userId === userId) {
            const operation = state.currentOperation;
            state.operations.push(operation);
            state.currentOperation = null;
            return operation;
        }
        return null;
    }
    undo(roomId) {
        const state = this.getRoomState(roomId);
        if (state.operations.length === 0) {
            return null;
        }
        const operation = state.operations.pop();
        state.undoStack.push(operation);
        return operation;
    }
    redo(roomId) {
        const state = this.getRoomState(roomId);
        if (state.undoStack.length === 0) {
            return null;
        }
        const operation = state.undoStack.pop();
        state.operations.push(operation);
        return operation;
    }
    clear(roomId) {
        const state = this.getRoomState(roomId);
        state.operations = [];
        state.undoStack = [];
        state.redoStack = [];
        state.currentOperation = null;
    }
    getState(roomId) {
        const state = this.getRoomState(roomId);
        return [...state.operations];
    }
    getOperation(roomId, operationId) {
        const state = this.getRoomState(roomId);
        return state.operations.find(op => op.id === operationId) ||
            state.undoStack.find(op => op.id === operationId);
    }
}
exports.DrawingState = DrawingState;
