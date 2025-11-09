import { CanvasManager } from './canvas.js';
import { WebSocketManager } from './websocket.js';


document.addEventListener('DOMContentLoaded', () => {
    
    const canvasManager = new CanvasManager('drawingCanvas', 'cursorCanvas');
    
    
    const wsManager = new WebSocketManager(canvasManager);
    
    
    setupToolControls(canvasManager);
    setupColorControls(canvasManager);
    setupStrokeWidthControl(canvasManager);
    setupActionButtons(wsManager);
    setupUserInterface(wsManager);
});

function setupToolControls(canvasManager: CanvasManager): void {
    const brushBtn = document.getElementById('brushTool');
    const eraserBtn = document.getElementById('eraserTool');
    
    brushBtn?.addEventListener('click', () => {
        canvasManager.setTool('brush');
        brushBtn.classList.add('active');
        eraserBtn?.classList.remove('active');
    });
    
    eraserBtn?.addEventListener('click', () => {
        canvasManager.setTool('eraser');
        eraserBtn.classList.add('active');
        brushBtn?.classList.remove('active');
    });
}

function setupColorControls(canvasManager: CanvasManager): void {
    const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
    const colorPresets = document.querySelectorAll('.color-preset');
    
    colorPicker?.addEventListener('input', (e) => {
        const color = (e.target as HTMLInputElement).value;
        canvasManager.setColor(color);
        updateActiveColorPreset(color);
    });
    
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.getAttribute('data-color');
            if (color) {
                canvasManager.setColor(color);
                colorPicker.value = color;
                updateActiveColorPreset(color);
            }
        });
    });
}

function updateActiveColorPreset(color: string): void {
    document.querySelectorAll('.color-preset').forEach(preset => {
        if (preset.getAttribute('data-color') === color) {
            preset.classList.add('active');
        } else {
            preset.classList.remove('active');
        }
    });
}

function setupStrokeWidthControl(canvasManager: CanvasManager): void {
    const strokeWidthSlider = document.getElementById('strokeWidth') as HTMLInputElement;
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    
    strokeWidthSlider?.addEventListener('input', (e) => {
        const width = parseInt((e.target as HTMLInputElement).value);
        canvasManager.setStrokeWidth(width);
        if (strokeWidthValue) {
            strokeWidthValue.textContent = `${width}px`;
        }
    });
}

function setupActionButtons(wsManager: WebSocketManager): void {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    undoBtn?.addEventListener('click', () => {
        wsManager.emitUndo();
    });
    
    redoBtn?.addEventListener('click', () => {
        wsManager.emitRedo();
    });
    
    clearBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
            wsManager.emitClear();
        }
    });
}

function setupUserInterface(wsManager: WebSocketManager): void {
    const connectionStatus = document.getElementById('connectionStatus');
    const userCount = document.getElementById('userCount');
    const userName = document.getElementById('userName');
    const userColorIndicator = document.getElementById('userColorIndicator');
    const usersList = document.getElementById('usersList');
    
    
    wsManager.setUpdateConnectionStatus((status, connected) => {
        if (connectionStatus) {
            connectionStatus.textContent = status;
            connectionStatus.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
        }
    });
    
    
    wsManager.setUpdateUserCount((count) => {
        if (userCount) {
            userCount.textContent = `Users: ${count}`;
        }
    });
    
    
    wsManager.setUpdateUsersList((users) => {
        if (usersList) {
            usersList.innerHTML = '';
            users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <div class="user-item-color" style="background-color: ${user.color};"></div>
                    <span class="user-item-name">${user.name}</span>
                `;
                usersList.appendChild(userItem);
            });
        }
        
        
        const currentUserId = wsManager.getUserId();
        const currentUser = users.find(u => u.id === currentUserId);
        if (currentUser) {
            if (userName) {
                userName.textContent = currentUser.name;
            }
            if (userColorIndicator) {
                userColorIndicator.style.backgroundColor = currentUser.color;
            }
        }
    });
}

