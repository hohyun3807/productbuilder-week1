// 테트리스 게임 로직
const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
const nextPreviewCanvas = document.getElementById('nextPreview');
const nextPreviewCtx = nextPreviewCanvas.getContext('2d');

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const BLOCK_SIZE = 24;

let board = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0));
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;

// 테트로미노 형태 정의
const TETROMINOS = {
    I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
    O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
    T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
    S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
    Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
    J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
    L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' }
};

const TETROMINO_KEYS = Object.keys(TETROMINOS);

class Tetromino {
    constructor(type = null) {
        type = type || TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
        this.type = type;
        this.shape = JSON.parse(JSON.stringify(TETROMINOS[type].shape));
        this.color = TETROMINOS[type].color;
        this.x = Math.floor(GRID_WIDTH / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    rotate() {
        const newShape = [];
        for (let i = 0; i < this.shape[0].length; i++) {
            const row = [];
            for (let j = this.shape.length - 1; j >= 0; j--) {
                row.push(this.shape[j][i]);
            }
            newShape.push(row);
        }
        this.shape = newShape;
    }

    rotateBack() {
        for (let i = 0; i < 3; i++) {
            this.rotate();
        }
    }
}

let currentTetromino = new Tetromino();
let nextTetromino = new Tetromino();

function canMove(piece, offsetX, offsetY) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;

                if (newX < 0 || newX >= GRID_WIDTH || newY >= GRID_HEIGHT) {
                    return false;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placeTetromino(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0 && boardY < GRID_HEIGHT && boardX >= 0 && boardX < GRID_WIDTH) {
                    board[boardY][boardX] = piece.color;
                }
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(GRID_WIDTH).fill(0));
            linesCleared++;
            y++;
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        const points = [0, 40, 100, 300, 1200];
        score += (points[Math.min(linesCleared, 4)] || 1200) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 800 - (level - 1) * 50);
    }

    updateStats();
}

function draw() {
    // 배경 그리기
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 그리드 라인
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }

    // 보드에 놓인 블록 그리기
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }

    // 현재 테트로미노 그리기
    if (currentTetromino && currentTetromino.shape) {
        for (let y = 0; y < currentTetromino.shape.length; y++) {
            for (let x = 0; x < currentTetromino.shape[y].length; x++) {
                if (currentTetromino.shape[y][x]) {
                    drawBlock(currentTetromino.x + x, currentTetromino.y + y, currentTetromino.color);
                }
            }
        }
    }
}

function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}

function drawNextPreview() {
    nextPreviewCtx.fillStyle = '#000';
    nextPreviewCtx.fillRect(0, 0, nextPreviewCanvas.width, nextPreviewCanvas.height);

    if (nextTetromino && nextTetromino.shape) {
        const shape = nextTetromino.shape;
        const startX = (4 - shape[0].length) * 15;
        const startY = (4 - shape.length) * 15;

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    nextPreviewCtx.fillStyle = nextTetromino.color;
                    nextPreviewCtx.fillRect(startX + x * 15 + 1, startY + y * 15 + 1, 13, 13);
                    nextPreviewCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    nextPreviewCtx.lineWidth = 1;
                    nextPreviewCtx.strokeRect(startX + x * 15 + 1, startY + y * 15 + 1, 13, 13);
                }
            }
        }
    }
}

function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
    document.getElementById('level').textContent = level;
}

function gameOver() {
    gameRunning = false;
    gamePaused = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    alert(`게임 오버!\n점수: ${score}\n라인: ${lines}\n레벨: ${level}`);
}

function startGame() {
    board = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 800;
    dropCounter = 0;
    lastTime = 0;
    updateStats();

    currentTetromino = new Tetromino();
    nextTetromino = new Tetromino();
    gameRunning = true;
    gamePaused = false;

    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;

    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        document.getElementById('pauseBtn').textContent = gamePaused ? '계속하기' : '일시정지';
        if (!gamePaused) {
            lastTime = 0;
            requestAnimationFrame(gameLoop);
        }
    }
}

function gameLoop(currentTime) {
    if (!gameRunning) {
        return;
    }

    if (gamePaused) {
        draw();
        drawNextPreview();
        return;
    }

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        if (canMove(currentTetromino, 0, 1)) {
            currentTetromino.y++;
        } else {
            placeTetromino(currentTetromino);
            clearLines();

            currentTetromino = nextTetromino;
            nextTetromino = new Tetromino();

            if (!canMove(currentTetromino, 0, 0)) {
                gameOver();
                return;
            }
        }
        dropCounter = 0;
    }

    draw();
    drawNextPreview();
    requestAnimationFrame(gameLoop);
}

// 키 입력 처리
document.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) return;

    switch (e.key) {
        case 'ArrowLeft':
            if (canMove(currentTetromino, -1, 0)) {
                currentTetromino.x--;
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (canMove(currentTetromino, 1, 0)) {
                currentTetromino.x++;
            }
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (canMove(currentTetromino, 0, 1)) {
                currentTetromino.y++;
                score += 1;
                updateStats();
            }
            e.preventDefault();
            break;
        case 'z':
        case 'Z':
            currentTetromino.rotate();
            if (!canMove(currentTetromino, 0, 0)) {
                currentTetromino.rotateBack();
            }
            e.preventDefault();
            break;
        case 'x':
        case 'X':
            currentTetromino.rotateBack();
            if (!canMove(currentTetromino, 0, 0)) {
                currentTetromino.rotate();
            }
            e.preventDefault();
            break;
        case ' ':
            while (canMove(currentTetromino, 0, 1)) {
                currentTetromino.y++;
                score += 2;
            }
            updateStats();
            e.preventDefault();
            break;
    }
});

// 버튼 이벤트
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('pauseBtn').addEventListener('click', togglePause);

// 초기화
draw();
drawNextPreview();
