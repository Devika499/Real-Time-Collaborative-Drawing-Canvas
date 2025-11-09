# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization.

https://real-time-collaborative-drawing-canvas-2sko.onrender.com/

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Devika499/Real-Time-Collaborative-Drawing-Canvas.git
cd Drawing canvas
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## 🧪 Testing with Multiple Users

1. **Start the server** (see Quick Start above)

2. **Open multiple browser windows/tabs**:
   - Open `http://localhost:3000` in multiple browser windows
   - Or use different browsers (Chrome, Firefox, Safari)
   - Or use incognito/private windows

3. **Test real-time collaboration**:
   - Draw on one window and see it appear in real-time on other windows
   - Try drawing simultaneously from multiple windows
   - Test undo/redo functionality across users
   - Observe user cursors moving in real-time

4. **Test features**:
   - Switch between brush and eraser tools
   - Change colors and stroke widths
   - Use undo/redo buttons
   - Clear the canvas
   - Check the online users list

## 📁 Project Structure

```
collaborative-canvas/
├── client/                 # Frontend code
│   ├── index.html         # Main HTML file
│   ├── style.css          # Styles
│   ├── canvas.ts          # Canvas drawing logic
│   ├── websocket.ts       # WebSocket client
│   └── main.ts            # App initialization
├── server/                # Backend code
│   ├── server.ts          # Express + Socket.io server
│   ├── rooms.ts           # Room management
│   └── drawing-state.ts   # Canvas state management
├── shared/                # Shared types
│   └── types.ts           # TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

## 🎨 Features

### Drawing Tools
- **Brush**: Draw with customizable colors and stroke widths
- **Eraser**: Erase parts of the drawing
- **Color Picker**: Choose from preset colors or use custom color picker
- **Stroke Width**: Adjustable from 1px to 50px

### Real-time Collaboration
- **Live Drawing**: See other users' drawings as they draw (not after they finish)
- **User Indicators**: Visual cursors showing where other users are drawing
- **User Management**: See who's online with color-coded user list

### Advanced Features
- **Global Undo/Redo**: Undo and redo operations work across all users
- **Conflict Resolution**: Handles simultaneous drawing in overlapping areas
- **Mobile Support**: Touch events for drawing on mobile devices

## 🔧 Technical Details

### Stack
- **Frontend**: Vanilla TypeScript + HTML5 Canvas
- **Backend**: Node.js + Express + Socket.io
- **Language**: TypeScript

### Key Implementation Details
- Efficient canvas operations with path optimization
- Real-time event streaming via WebSockets
- Operation-based state management for undo/redo
- Client-side prediction for smooth drawing experience

## ⚠️ Known Limitations

1. **No Persistence**: Canvas state is not saved to database - refreshing the page will clear the canvas
2. **Single Room**: Currently supports one default room (multi-room support can be added)
3. **No Authentication**: Users are identified by socket ID only
4. **Performance**: May experience lag with 10+ simultaneous users drawing heavily

## 🐛 Troubleshooting

### Server won't start
- Make sure port 3000 is not in use
- Check that all dependencies are installed: `npm install`
- Verify TypeScript compilation: `npm run build`

### Drawings not syncing
- Check browser console for WebSocket connection errors
- Verify server is running
- Check network connectivity

### Canvas not displaying
- Ensure browser supports HTML5 Canvas
- Check browser console for JavaScript errors
- Try clearing browser cache

## 📝 Time Spent

- **Setup & Architecture**: 2 hours
- **Canvas Implementation**: 3 hours
- **WebSocket Integration**: 2 hours
- **Undo/Redo System**: 2 hours
- **UI/UX Polish**: 1 hour
- **Testing & Debugging**: 1 hour
- **Documentation**: 1 hour

**Total**: ~12 hours

