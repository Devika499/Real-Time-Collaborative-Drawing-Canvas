import { v4 as uuidv4 } from 'uuid';
import { Point, DrawingOperation } from '../shared/types';

export { Point, DrawingOperation };

interface RoomState {
    operations: DrawingOperation[];
    undoStack: DrawingOperation[];
    redoStack: DrawingOperation[];
    currentOperation: DrawingOperation | null;
}

export class DrawingState {
    private states: Map<string, RoomState> = new Map();

    private getRoomState(roomId: string): RoomState {
        if (!this.states.has(roomId)) {
            this.states.set(roomId, {
                operations: [],
                undoStack: [],
                redoStack: [],
                currentOperation: null
            });
        }
        return this.states.get(roomId)!;
    }

    startDraw(roomId: string, userId: string, data: {
        x: number;
        y: number;
        tool: string;
        color: string;
        strokeWidth: number;
    }): DrawingOperation {
        const state = this.getRoomState(roomId);
        
        // Clear redo stack when starting a new operation
        state.redoStack = [];

        const operation: DrawingOperation = {
            id: uuidv4(),
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

    addPoint(roomId: string, userId: string, x: number, y: number): DrawingOperation {
        const state = this.getRoomState(roomId);
        
        if (state.currentOperation && state.currentOperation.userId === userId) {
            state.currentOperation.points.push({ x, y });
            return state.currentOperation;
        }

        // If no current operation, create one (shouldn't happen in normal flow)
        const operation: DrawingOperation = {
            id: uuidv4(),
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

    endDraw(roomId: string, userId: string): DrawingOperation | null {
        const state = this.getRoomState(roomId);
        
        if (state.currentOperation && state.currentOperation.userId === userId) {
            const operation = state.currentOperation;
            state.operations.push(operation);
            state.currentOperation = null;
            return operation;
        }

        return null;
    }

    undo(roomId: string): DrawingOperation | null {
        const state = this.getRoomState(roomId);
        
        if (state.operations.length === 0) {
            return null;
        }

        const operation = state.operations.pop()!;
        state.undoStack.push(operation);
        return operation;
    }

    redo(roomId: string): DrawingOperation | null {
        const state = this.getRoomState(roomId);
        
        if (state.undoStack.length === 0) {
            return null;
        }

        const operation = state.undoStack.pop()!;
        state.operations.push(operation);
        return operation;
    }

    clear(roomId: string): void {
        const state = this.getRoomState(roomId);
        state.operations = [];
        state.undoStack = [];
        state.redoStack = [];
        state.currentOperation = null;
    }

    getState(roomId: string): DrawingOperation[] {
        const state = this.getRoomState(roomId);
        return [...state.operations];
    }

    getOperation(roomId: string, operationId: string): DrawingOperation | undefined {
        const state = this.getRoomState(roomId);
        return state.operations.find(op => op.id === operationId) ||
               state.undoStack.find(op => op.id === operationId);
    }
}

