import type { DrawingOperation, Point } from './shared/types.js';

export class CanvasManager {
    private drawingCanvas: HTMLCanvasElement;
    private cursorCanvas: HTMLCanvasElement;
    private drawingCtx: CanvasRenderingContext2D;
    private cursorCtx: CanvasRenderingContext2D;
    
    private isDrawing: boolean = false;
    private currentTool: string = 'brush';
    private currentColor: string = '#000000';
    private currentStrokeWidth: number = 5;
    
    private currentOperation: DrawingOperation | null = null;
    private currentOperationId: string = '';
    private operations: Map<string, DrawingOperation> = new Map();
    private undoStack: DrawingOperation[] = [];
    
    private userCursors: Map<string, { x: number; y: number; color: string }> = new Map();
    
    constructor(drawingCanvasId: string, cursorCanvasId: string) {
        const drawingCanvasEl = document.getElementById(drawingCanvasId);
        const cursorCanvasEl = document.getElementById(cursorCanvasId);
        
        if (!drawingCanvasEl || !(drawingCanvasEl instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas element with id "${drawingCanvasId}" not found`);
        }
        
        if (!cursorCanvasEl || !(cursorCanvasEl instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas element with id "${cursorCanvasId}" not found`);
        }
        
        this.drawingCanvas = drawingCanvasEl;
        this.cursorCanvas = cursorCanvasEl;
        
        const drawingCtx = this.drawingCanvas.getContext('2d');
        const cursorCtx = this.cursorCanvas.getContext('2d');
        
        if (!drawingCtx || !cursorCtx) {
            throw new Error('Could not get canvas context. Canvas API not supported.');
        }
        
        this.drawingCtx = drawingCtx;
        this.cursorCtx = cursorCtx;
        
        this.setupCanvas();
        this.setupEventListeners();
    }

    private setupCanvas(): void {
        // Set canvas size
        const container = this.drawingCanvas.parentElement;
        if (container) {
            const resize = () => {
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                this.drawingCanvas.width = width;
                this.drawingCanvas.height = height;
                this.cursorCanvas.width = width;
                this.cursorCanvas.height = height;
                
                // Redraw all operations after resize
                this.redrawAll();
            };
            
            resize();
            window.addEventListener('resize', resize);
        }
        
        // Set default drawing styles
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        this.drawingCtx.strokeStyle = this.currentColor;
        this.drawingCtx.lineWidth = this.currentStrokeWidth;
    }

    private setupEventListeners(): void {
        // Mouse events
        this.drawingCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.drawingCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.drawingCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.drawingCanvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Touch events for mobile support
        this.drawingCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.drawingCanvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.drawingCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    private getCanvasCoordinates(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
        const rect = this.drawingCanvas.getBoundingClientRect();
        
        if (e instanceof MouseEvent) {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        } else if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        
        return null;
    }

    private handleMouseDown(e: MouseEvent): void {
        e.preventDefault();
        const coords = this.getCanvasCoordinates(e);
        if (coords) {
            this.startDrawing(coords.x, coords.y);
        }
    }

    private handleMouseMove(e: MouseEvent): void {
        const coords = this.getCanvasCoordinates(e);
        if (coords) {
            if (this.isDrawing) {
                this.continueDrawing(coords.x, coords.y);
            }
            // Emit cursor position for user indicators
            this.onCursorMove?.(coords.x, coords.y);
        }
    }

    private handleMouseUp(e: MouseEvent): void {
        if (this.isDrawing) {
            this.stopDrawing();
        }
    }

    private handleTouchStart(e: TouchEvent): void {
        e.preventDefault();
        const coords = this.getCanvasCoordinates(e);
        if (coords) {
            this.startDrawing(coords.x, coords.y);
        }
    }

    private handleTouchMove(e: TouchEvent): void {
        e.preventDefault();
        const coords = this.getCanvasCoordinates(e);
        if (coords) {
            if (this.isDrawing) {
                this.continueDrawing(coords.x, coords.y);
            }
        }
    }

    private handleTouchEnd(e: TouchEvent): void {
        e.preventDefault();
        if (this.isDrawing) {
            this.stopDrawing();
        }
    }

    private startDrawing(x: number, y: number): void {
        this.isDrawing = true;
        
        this.currentOperation = {
            id: '',
            userId: '',
            tool: this.currentTool,
            color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
            strokeWidth: this.currentStrokeWidth,
            points: [{ x, y }],
            timestamp: Date.now()
        };
        
        this.onDrawStart?.(x, y, this.currentTool, this.currentColor, this.currentStrokeWidth);
    }

    private continueDrawing(x: number, y: number): void {
        if (!this.currentOperation) return;
        
        const lastPoint = this.currentOperation.points[this.currentOperation.points.length - 1];
        this.currentOperation.points.push({ x, y });
        
        // Draw locally for immediate feedback
        this.drawSegment(lastPoint, { x, y }, this.currentOperation);
        
        this.onDrawMove?.(x, y);
    }

    private stopDrawing(): void {
        if (!this.isDrawing || !this.currentOperation) return;
        
        this.isDrawing = false;
        
        if (this.currentOperation.points.length > 0) {
            this.onDrawEnd?.();
        }
        
        // Operation will be stored when we receive the operationId from server
        // (handled in handleLocalDrawStart or handleLocalDrawEnd)
        
        this.currentOperation = null;
    }

    private drawSegment(start: Point, end: Point, operation: DrawingOperation): void {
        this.drawingCtx.save();
        
        if (operation.tool === 'eraser') {
            this.drawingCtx.globalCompositeOperation = 'destination-out';
            this.drawingCtx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.drawingCtx.globalCompositeOperation = 'source-over';
            this.drawingCtx.strokeStyle = operation.color;
        }
        
        this.drawingCtx.lineWidth = operation.strokeWidth;
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(start.x, start.y);
        this.drawingCtx.lineTo(end.x, end.y);
        this.drawingCtx.stroke();
        
        this.drawingCtx.restore();
    }

    // Public methods for external drawing operations
    handleRemoteDrawStart(
        userId: string,
        operationId: string,
        x: number,
        y: number,
        tool: string,
        color: string,
        strokeWidth: number
    ): void {
        const operation: DrawingOperation = {
            id: operationId,
            userId,
            tool,
            color,
            strokeWidth,
            points: [{ x, y }],
            timestamp: Date.now()
        };
        
        this.operations.set(operationId, operation);
    }

    handleRemoteDrawMove(userId: string, operationId: string, x: number, y: number): void {
        const operation = this.operations.get(operationId);
        if (!operation) return;
        
        const lastPoint = operation.points[operation.points.length - 1];
        operation.points.push({ x, y });
        
        this.drawSegment(lastPoint, { x, y }, operation);
    }

    handleRemoteDrawEnd(userId: string, operationId: string): void {
        const operation = this.operations.get(operationId);
        if (!operation) return;
        
        // Operation is complete, keep it in operations map for undo/redo
    }

    handleLocalDrawStart(operationId: string): void {
        // Store the operationId and save the current operation
        this.currentOperationId = operationId;
        if (this.currentOperation) {
            this.currentOperation.id = operationId;
            this.operations.set(operationId, this.currentOperation);
        }
    }

    handleLocalDrawEnd(operationId: string): void {
        // If we didn't get the operationId in drawStart, store it now
        if (this.currentOperation && !this.currentOperationId) {
            this.currentOperation.id = operationId;
            this.operations.set(operationId, this.currentOperation);
            this.currentOperation = null;
        }
        this.currentOperationId = '';
    }

    handleUndo(operationId: string): void {
        const operation = this.operations.get(operationId);
        if (operation) {
            this.undoStack.push(operation);
            this.operations.delete(operationId);
            this.redrawAll();
        }
    }

    handleRedo(operationId: string): void {
        const operation = this.undoStack.find(op => op.id === operationId);
        if (operation) {
            const index = this.undoStack.indexOf(operation);
            this.undoStack.splice(index, 1);
            this.operations.set(operationId, operation);
            this.redrawAll();
        }
    }

    handleClear(): void {
        this.operations.clear();
        this.undoStack = [];
        this.clearCanvas();
    }

    private redrawAll(): void {
        this.clearCanvas();
        
        // Redraw all active operations in order
        const sortedOperations = Array.from(this.operations.values())
            .sort((a, b) => a.timestamp - b.timestamp);
        
        for (const operation of sortedOperations) {
            if (operation.points.length < 2) continue;
            
            for (let i = 1; i < operation.points.length; i++) {
                this.drawSegment(operation.points[i - 1], operation.points[i], operation);
            }
        }
    }

    private clearCanvas(): void {
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }

    updateCursor(userId: string, x: number, y: number, color: string): void {
        this.userCursors.set(userId, { x, y, color });
        this.drawCursors();
    }

    removeCursor(userId: string): void {
        this.userCursors.delete(userId);
        this.drawCursors();
    }

    private drawCursors(): void {
        this.cursorCtx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
        
        this.userCursors.forEach((cursor, userId) => {
            this.cursorCtx.save();
            this.cursorCtx.fillStyle = cursor.color;
            this.cursorCtx.beginPath();
            this.cursorCtx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2);
            this.cursorCtx.fill();
            
            // Draw a ring around the cursor
            this.cursorCtx.strokeStyle = cursor.color;
            this.cursorCtx.lineWidth = 2;
            this.cursorCtx.beginPath();
            this.cursorCtx.arc(cursor.x, cursor.y, 12, 0, Math.PI * 2);
            this.cursorCtx.stroke();
            
            this.cursorCtx.restore();
        });
    }

    setTool(tool: string): void {
        this.currentTool = tool;
    }

    setColor(color: string): void {
        this.currentColor = color;
    }

    setStrokeWidth(width: number): void {
        this.currentStrokeWidth = width;
    }

    // Callbacks for WebSocket communication
    onDrawStart?: (x: number, y: number, tool: string, color: string, strokeWidth: number) => void;
    onDrawMove?: (x: number, y: number) => void;
    onDrawEnd?: () => void;
    onCursorMove?: (x: number, y: number) => void;
}

