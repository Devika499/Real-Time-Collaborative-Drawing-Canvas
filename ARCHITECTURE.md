# Architecture Documentation

## Overview

This document describes the architecture, data flow, and design decisions for the Collaborative Drawing Canvas application.

## System Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Browser   │◄──────────────────────────►│   Server    │
│   (Client)  │                             │  (Node.js)  │
└─────────────┘                             └─────────────┘
      │                                            │
      │                                            │
      ▼                                            ▼
┌─────────────┐                            ┌─────────────┐
│   Canvas    │                            │ Room State  │
│  Manager    │                            │  Manager    │
└─────────────┘                            └─────────────┘
```

## Data Flow Diagram

### Drawing Event Flow

```
User Action (Mouse/Touch)
    │
    ▼
Canvas Manager (Local Drawing)
    │
    ▼
WebSocket Client (Emit Event)
    │
    ▼
Socket.io Server (Receive Event)
    │
    ├─► Drawing State Manager (Store Operation)
    │
    └─► Broadcast to Other Clients
            │
            ▼
    WebSocket Client (Receive Event)
            │
            ▼
    Canvas Manager (Render Remote Drawing)
```

### Undo/Redo Flow

```
User Clicks Undo
    │
    ▼
WebSocket Client (Emit 'undo')
    │
    ▼
Server: Drawing State Manager
    │
    ├─► Pop last operation from operations[]
    ├─► Push to undoStack[]
    └─► Broadcast 'undo' with operationId
            │
            ▼
    All Clients Receive 'undo'
            │
            ▼
    Canvas Manager removes operation
    Canvas Manager redraws all remaining operations
```

## WebSocket Protocol

### Client → Server Messages

#### `drawStart`
Sent when user starts drawing.
```typescript
{
  x: number;           // Starting X coordinate
  y: number;           // Starting Y coordinate
  tool: string;        // 'brush' or 'eraser'
  color: string;       // Hex color code
  strokeWidth: number; // Stroke width in pixels
}
```

#### `drawMove`
Sent continuously while user is drawing.
```typescript
{
  x: number;  // Current X coordinate
  y: number;  // Current Y coordinate
}
```

#### `drawEnd`
Sent when user stops drawing.
```typescript
{}  // No data needed
```

#### `cursorMove`
Sent when user moves mouse (for cursor indicators).
```typescript
{
  x: number;  // Cursor X coordinate
  y: number;  // Cursor Y coordinate
}
```

#### `undo`
Request to undo last operation.
```typescript
{}  // No data needed
```

#### `redo`
Request to redo last undone operation.
```typescript
{}  // No data needed
```

#### `clear`
Request to clear entire canvas.
```typescript
{}  // No data needed
```

### Server → Client Messages

#### `init`
Sent when client first connects.
```typescript
{
  userId: string;        // Unique user ID
  userName: string;      // Display name
  userColor: string;     // Assigned color
  roomId: string;        // Room identifier
  canvasState: Operation[]; // Current canvas state
  users: User[];         // List of online users
}
```

#### `drawStart`
Broadcast when any user starts drawing.
```typescript
{
  userId: string;
  operationId: string;   // Unique operation ID
  x: number;
  y: number;
  tool: string;
  color: string;
  strokeWidth: number;
}
```

#### `drawMove`
Broadcast when any user continues drawing.
```typescript
{
  userId: string;
  operationId: string;
  x: number;
  y: number;
}
```

#### `drawEnd`
Broadcast when any user stops drawing.
```typescript
{
  userId: string;
  operationId: string;
}
```

#### `cursorMove`
Broadcast when any user moves cursor.
```typescript
{
  userId: string;
  x: number;
  y: number;
  userColor: string;
}
```

#### `undo`
Broadcast when any user undoes an operation.
```typescript
{
  operationId: string;  // ID of operation to undo
  userId: string;       // User who triggered undo
}
```

#### `redo`
Broadcast when any user redoes an operation.
```typescript
{
  operationId: string;  // ID of operation to redo
  userId: string;       // User who triggered redo
}
```

#### `clear`
Broadcast when canvas is cleared.
```typescript
{
  userId: string;  // User who cleared canvas
}
```

#### `userJoined`
Broadcast when new user joins.
```typescript
{
  userId: string;
  userName: string;
  userColor: string;
}
```

#### `userLeft`
Broadcast when user disconnects.
```typescript
{
  userId: string;
}
```

## Undo/Redo Strategy

### Problem
Implementing global undo/redo in a collaborative environment is challenging because:
1. Multiple users can perform operations simultaneously
2. Undo operations must be synchronized across all clients
3. We need to maintain operation history consistently

### Solution

**Operation-Based State Management**:
- Each drawing stroke is stored as a complete `DrawingOperation` object
- Operations are stored in chronological order in an array
- Undo moves operations from `operations[]` to `undoStack[]`
- Redo moves operations from `undoStack[]` back to `operations[]`

**Server-Side Authority**:
- Server maintains the single source of truth for canvas state
- All undo/redo requests go through the server
- Server broadcasts undo/redo events to all clients
- Clients redraw the entire canvas state after undo/redo

**Conflict Resolution**:
- Operations are identified by unique IDs
- When undo is triggered, the server finds the last operation (regardless of which user created it)
- All clients receive the same undo event and remove the same operation
- Canvas is redrawn from scratch to ensure consistency

**Implementation Details**:
```typescript
// Server maintains state per room
interface RoomState {
  operations: DrawingOperation[];    // Active operations
  undoStack: DrawingOperation[];      // Undone operations (for redo)
  redoStack: DrawingOperation[];      // Cleared when new operation starts
  currentOperation: DrawingOperation | null;
}

// Undo: Move from operations to undoStack
undo(roomId: string): DrawingOperation | null {
  const operation = state.operations.pop();
  if (operation) {
    state.undoStack.push(operation);
    return operation;  // Broadcast to all clients
  }
}

// Redo: Move from undoStack back to operations
redo(roomId: string): DrawingOperation | null {
  const operation = state.undoStack.pop();
  if (operation) {
    state.operations.push(operation);
    return operation;  // Broadcast to all clients
  }
}
```

## Performance Decisions

### 1. Path Optimization
**Decision**: Store complete point arrays for each stroke rather than individual point events.

**Rationale**:
- Reduces WebSocket message overhead
- Enables efficient redrawing
- Simplifies undo/redo implementation
- Trade-off: Slightly higher memory usage (acceptable for drawing apps)

### 2. Client-Side Prediction
**Decision**: Draw locally immediately, then sync with server.

**Rationale**:
- Provides instant visual feedback
- Reduces perceived latency
- Server still maintains authority for conflict resolution
- If server rejects operation, client can rollback (not implemented in v1)

### 3. Full Canvas Redraw on Undo/Redo
**Decision**: Redraw entire canvas from operations array rather than selective erasure.

**Rationale**:
- Ensures consistency across all clients
- Simpler implementation
- Handles edge cases (overlapping operations, eraser)
- Performance is acceptable for typical drawing sizes

### 4. Event Batching
**Decision**: Send individual `drawMove` events rather than batching.

**Rationale**:
- Simpler implementation
- Lower latency for real-time feel
- Socket.io handles batching internally
- Can be optimized later if needed (e.g., throttle to 60fps)

### 5. Canvas Layering
**Decision**: Use two canvas layers - one for drawing, one for cursors.

**Rationale**:
- Cursor layer can be cleared/redrawn without affecting drawing
- Better performance (no need to redraw drawing when cursor moves)
- Cleaner separation of concerns

## Conflict Resolution

### Simultaneous Drawing
**Scenario**: Two users draw in overlapping areas at the same time.

**Resolution**:
- Both operations are stored independently
- Operations are rendered in chronological order (by timestamp)
- Last operation drawn appears on top
- No data loss - both strokes are preserved

### Undo Conflicts
**Scenario**: User A draws, User B draws, User A undoes.

**Resolution**:
- Server maintains chronological operation list
- Undo removes the LAST operation (User B's), not User A's
- This is the expected behavior for a shared undo stack
- Alternative: Per-user undo stacks (not implemented, but possible)

### Network Latency
**Scenario**: User draws while network is slow.

**Resolution**:
- Client draws locally immediately (optimistic update)
- Server eventually receives and broadcasts operation
- If operation arrives out of order, timestamp ensures correct rendering order
- No special handling needed - operations are idempotent

## Scalability Considerations

### Current Limitations
- In-memory state (lost on server restart)
- Single server instance
- No horizontal scaling support

### Potential Improvements
1. **Database Persistence**: Store operations in database (MongoDB, PostgreSQL)
2. **Redis for State**: Use Redis for shared state across server instances
3. **Operation Compression**: Compress point arrays for large drawings
4. **Room Isolation**: Implement multiple rooms with separate state
5. **Rate Limiting**: Prevent abuse with rate limiting
6. **Operation Pruning**: Archive old operations to prevent memory bloat

### Handling 1000 Concurrent Users
1. **Horizontal Scaling**: Multiple server instances with Redis pub/sub
2. **Room Sharding**: Distribute users across multiple rooms
3. **Operation Throttling**: Limit operations per user per second
4. **Selective Broadcasting**: Only send updates to users in same "region"
5. **CDN for Static Assets**: Serve client files from CDN
6. **WebSocket Connection Pooling**: Use load balancer with sticky sessions

## Security Considerations

### Current Implementation
- No authentication (users identified by socket ID)
- No input validation (assumes trusted clients)
- CORS enabled for all origins

### Production Improvements
1. **Authentication**: JWT tokens, OAuth integration
2. **Input Validation**: Validate coordinates, colors, stroke widths
3. **Rate Limiting**: Prevent DoS attacks
4. **Room Access Control**: Private rooms with access tokens
5. **Content Moderation**: Filter inappropriate drawings
6. **HTTPS/WSS**: Encrypt all communications

## Testing Strategy

### Unit Tests (Not Implemented)
- Canvas drawing operations
- State management functions
- WebSocket message handling

### Integration Tests (Not Implemented)
- End-to-end drawing flow
- Multi-user scenarios
- Undo/redo consistency

### Manual Testing
- Multiple browser windows
- Different browsers
- Mobile devices
- Network latency simulation
- Concurrent drawing stress test

## Future Enhancements

1. **Shapes Tool**: Rectangle, circle, line tools
2. **Text Tool**: Add text annotations
3. **Image Upload**: Paste/upload images to canvas
4. **Layers**: Multiple drawing layers
5. **Export**: Save canvas as PNG/JPEG
6. **History Timeline**: Visual timeline of all operations
7. **Collaborative Cursors**: Show what other users are about to draw
8. **Voice Chat**: Integrated voice communication
9. **Screen Sharing**: Share screen while drawing
10. **Version Control**: Branch/merge canvas states

