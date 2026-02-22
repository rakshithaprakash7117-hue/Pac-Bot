const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreVal');
const statusEl = document.getElementById('statusVal');
const instructions = document.getElementById('instructions');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
// Debug Elements
const debugParams = document.getElementById('debugParams');
const debugX = document.getElementById('debugX');
const debugY = document.getElementById('debugY');
const debugBot = document.getElementById('debugBot');
// Game settings
const TILE_SIZE = 40;
const ROWS = 15;
const COLS = 20;
// 1 = wall, 0 = path with dot, 2 = path without dot, 3 = start area, 4 = exit
const initialMaze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 3, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 4, 1],
    [1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
let maze = [];
let dots = [];
// Game State
let isPlaying = false;
let score = 0;
let isBot = false;
// Bot Detection Buffer
const historySize = 60;
let mouseHistory = []; // {dx, dy}
let player = {
    x: TILE_SIZE * 1.5,
    y: TILE_SIZE * 1.5,
    radius: 12,
    isDragging: false,
    color: '#ffee00'
};
let ghosts = [
    { x: TILE_SIZE * 9.5, y: TILE_SIZE * 11.5, color: '#ff00e6', speed: 1.5 }
];
// Helper: distance
function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}
// Map prep
function resetMaze() {
    maze = initialMaze.map(row => [...row]);
    dots = [];
    for (let r = 0; r < maze.length; r++) {
        for (let c = 0; c < maze[0].length; c++) {
            if (maze[r][c] === 0) {
                dots.push({ x: c * TILE_SIZE + TILE_SIZE / 2, y: r * TILE_SIZE + TILE_SIZE / 2, eaten: false });
            }
        }
    }
}
function initGame() {
    resetMaze();
    player.x = TILE_SIZE * 1.5;
    player.y = TILE_SIZE * 1.5;
    player.isDragging = false;
    score = 0;
    scoreEl.innerText = score;
    isBot = false;
    mouseHistory = [];
    ghosts[0].x = TILE_SIZE * 5.5;
    ghosts[0].y = TILE_SIZE * 9.5; // Starts near player
    ghosts[0].speed = 1.0;
    statusEl.innerText = "READY";
    statusEl.style.color = "var(--success-color)";
    instructions.classList.add('hidden');
    overlay.classList.add('hidden');
    isPlaying = true;
    requestAnimationFrame(gameLoop);
}
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);
// Mouse Controls
let mousePos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
canvas.addEventListener('mousedown', (e) => {
    if (!isPlaying) return;
    let rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;
    if (dist(mx, my, player.x, player.y) < player.radius * 2) {
        player.isDragging = true;
        mousePos = { x: mx, y: my };
        lastMousePos = { x: mx, y: my };
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (!isPlaying || !player.isDragging) return;
    let rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;
    // Bot tracking updates
    let dx = Math.abs(mx - lastMousePos.x);
    let dy = Math.abs(my - lastMousePos.y);
    if (dx > 0 || dy > 0) {
        mouseHistory.push({ dx, dy });
        if (mouseHistory.length > historySize) {
            mouseHistory.shift();
        }
    }
    mousePos = { x: mx, y: my };
    lastMousePos = { x: mx, y: my };
});
canvas.addEventListener('mouseup', () => { player.isDragging = false; });
canvas.addEventListener('mouseout', () => { player.isDragging = false; });
// Bot Detection Heuristic
function calculateBotProbability() {
    if (mouseHistory.length < 30) return false;
    // Calculate variance of speed. A human mouse drag is never perfectly constant speed.
    let sumX = 0, sumY = 0;
    mouseHistory.forEach(h => { sumX += h.dx; sumY += h.dy; });
    let meanX = sumX / mouseHistory.length;
    let meanY = sumY / mouseHistory.length;
    let sqDiffX = 0, sqDiffY = 0;
    mouseHistory.forEach(h => {
        sqDiffX += Math.pow(h.dx - meanX, 2);
        sqDiffY += Math.pow(h.dy - meanY, 2);
    });
    let varX = sqDiffX / mouseHistory.length;
    let varY = sqDiffY / mouseHistory.length;
    // Debug output
    // debugX.innerText = varX.toFixed(3);
    // debugY.innerText = varY.toFixed(3);
    // If movement is perfectly linear/constant velocity, variance approaches 0
    if (meanX > 0 && meanY > 0 && (varX < 0.1 || varY < 0.1)) {
        return true;
    }
    // Also check for bot straight line locks (0 variance on one axis while moving fast on another)
    if ((meanX > 5 && varY < 0.05) || (meanY > 5 && varX < 0.05)) {
        return true;
    }
    return false;
}
// Wall collision check
function isWall(x, y, r) {
    let checkPoints = [
        { cx: x - r, cy: y - r },
        { cx: x + r, cy: y - r },
        { cx: x - r, cy: y + r },
        { cx: x + r, cy: y + r }
    ];
    for (let p of checkPoints) {
        let col = Math.floor(p.cx / TILE_SIZE);
        let row = Math.floor(p.cy / TILE_SIZE);
        if (row >= 0 && row < maze.length && col >= 0 && col < maze[0].length) {
            if (maze[row][col] === 1) return true;
        }
    }
    return false;
}
// grid pathing
function findNextMove(sx, sy, tx, ty) {
    let startC = Math.floor(sx / TILE_SIZE);
    let startR = Math.floor(sy / TILE_SIZE);
    let targetC = Math.floor(tx / TILE_SIZE);
    let targetR = Math.floor(ty / TILE_SIZE);
    if (startR === targetR && startC === targetC) return { x: tx, y: ty };
    if (startR < 0 || startR >= maze.length || startC < 0 || startC >= maze[0].length) return { x: tx, y: ty };
    if (targetR < 0 || targetR >= maze.length || targetC < 0 || targetC >= maze[0].length) return { x: tx, y: ty };
    let queue = [{ r: startR, c: startC, path: [] }];
    let visited = Array.from({ length: maze.length }, () => Array(maze[0].length).fill(false));
    visited[startR][startC] = true;
    let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr.r === targetR && curr.c === targetC) {
            if (curr.path.length > 0) {
                let nextStep = curr.path[0];
                return { x: nextStep.c * TILE_SIZE + TILE_SIZE / 2, y: nextStep.r * TILE_SIZE + TILE_SIZE / 2 };
            }
            return { x: tx, y: ty };
        }
        for (let d of dirs) {
            let nr = curr.r + d[0]; let nc = curr.c + d[1];
            if (nr >= 0 && nr < maze.length && nc >= 0 && nc < maze[0].length && !visited[nr][nc] && maze[nr][nc] !== 1) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc, path: [...curr.path, { r: nr, c: nc }] });
            }
        }
    }
    return { x: tx, y: ty };
}
function update() {
    if (!isPlaying) return;
    // Movement
    if (player.isDragging) {
        // Attempt move
        if (!isWall(mousePos.x, mousePos.y, player.radius)) {
            player.x = mousePos.x;
            player.y = mousePos.y;
        } else {
            // Drop player if dragged into wall to punish humans
            player.isDragging = false;
        }
    }
    // Bot Check Event
    isBot = calculateBotProbability();
    // debugBot.innerText = isBot ? "TRUE" : "FALSE";
    if (isBot) {
        statusEl.innerText = "BOT_DETECTED";
        statusEl.style.color = "var(--Ghost-color)";
    }
    // Map Progress Factor (Halfway point logic)
    let progressFactor = player.x / canvas.width;
    // Ghost AI
    let ghost = ghosts[0];
    let targetObj = findNextMove(ghost.x, ghost.y, player.x, player.y);
    let dx = targetObj.x - ghost.x;
    let dy = targetObj.y - ghost.y;
    let len = Math.hypot(dx, dy);
    // If past midway point, ghosts become impossible for humans
    let baseSpeed = 1.2;
    if (progressFactor > 0.45) { // The trap is sprung early
        baseSpeed = 6.0; // Humanly impossible to outrun
    }
    // If bot detected, slow the ghost down completely to "let them pass"
    if (isBot) {
        baseSpeed = 0.3;
    }
    if (len > 0) {
        ghost.x += (dx / len) * baseSpeed;
        ghost.y += (dy / len) * baseSpeed;
    }
    // Check Dot Eating
    dots.forEach(d => {
        if (!d.eaten && dist(player.x, player.y, d.x, d.y) < player.radius + 5) {
            d.eaten = true;
            score += 10;
            scoreEl.innerText = score;
        }
    });
    // Check Exit (Win Condition)
    let col = Math.floor(player.x / TILE_SIZE);
    let row = Math.floor(player.y / TILE_SIZE);
    if (maze[row] && maze[row][col] === 4) {
        gameOver(true);
    }
    // Check Death
    if (dist(player.x, player.y, ghost.x, ghost.y) < player.radius * 2) {
        gameOver(false);
    }
}
function gameOver(win) {
    isPlaying = false;
    player.isDragging = false;
    overlay.classList.remove('hidden');
    if (win) {
        overlayTitle.innerText = "SYSTEM BYPASSED";
        overlayTitle.style.color = "var(--success-color)";
        overlayMessage.innerText = `ACCESS DENIED : too perfect?`;
    } else {
        overlayTitle.innerText = "GAME OVER";
        overlayTitle.style.color = "var(--ghost-color)";
        if (isBot) {
            overlayMessage.innerText = "Error: Ghost caught you.";
        } else {
            overlayMessage.innerText = "Welcome Human. too slow??";
        }
    }
}
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw Maze
    for (let r = 0; r < maze.length; r++) {
        for (let c = 0; c < maze[0].length; c++) {
            if (maze[r][c] === 1) {
                // Wall
                ctx.fillStyle = '#050510';
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00f3ff';
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.shadowBlur = 0;
            } else if (maze[r][c] === 4) {
                // Exit
                ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ff41';
                ctx.fillStyle = '#00ff41';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText("EXIT", c * TILE_SIZE + 2, r * TILE_SIZE + 25);
                ctx.shadowBlur = 0;
            }
        }
    }
    // Draw Dots
    ctx.fillStyle = '#ffee00';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ffee00';
    dots.forEach(d => {
        if (!d.eaten) {
            ctx.beginPath();
            ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.shadowBlur = 0;
    // Draw Ghost
    ctx.fillStyle = ghosts[0].color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = ghosts[0].color;
    ctx.beginPath();
    ctx.arc(ghosts[0].x, ghosts[0].y, player.radius + 2, Math.PI, 0);
    ctx.lineTo(ghosts[0].x + player.radius + 2, ghosts[0].y + player.radius + 2);
    ctx.lineTo(ghosts[0].x - player.radius - 2, ghosts[0].y + player.radius + 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Draw Player
    ctx.fillStyle = player.color;
    if (player.isDragging) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = player.color;
    }
    ctx.beginPath();
    // Pacman mouth animation based on time
    let mouth = 0.2;
    if (isPlaying && player.isDragging) {
        let t = Date.now() / 100;
        mouth = 0.2 + Math.abs(Math.sin(t)) * 0.2;
    }
    // Determine rotation based on drag direction
    let angle = 0;
    if (mouseHistory.length > 0) {
        let lx = mousePos.x - lastMousePos.x;
        // Basic facing direction fallback
    }
    ctx.arc(player.x, player.y, player.radius, mouth * Math.PI, (2 - mouth) * Math.PI);
    ctx.lineTo(player.x, player.y);
    ctx.fill();
    ctx.shadowBlur = 0;
}
function gameLoop() {
    update();
    render();
    if (isPlaying) {
        requestAnimationFrame(gameLoop);
    }
}
// Initial static render
resetMaze();
render();
