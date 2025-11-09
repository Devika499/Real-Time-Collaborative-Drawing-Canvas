export interface Point {
    x: number;
    y: number;
}

export interface DrawingOperation {
    id: string;
    userId: string;
    tool: string;
    color: string;
    strokeWidth: number;
    points: Point[];
    timestamp: number;
}

