'use strict';

// ===== 상수 =====
const COLS = 10;
const ROWS = 20;
const CELL = 30; // 셀 크기(px)
const HIDDEN_ROWS = 2; // 보드 위에 숨겨진 행(스폰 공간)

// 블록 색상
const COLORS = {
    I: '#00e5ff',
    O: '#ffee00',
    T: '#cc44ff',
    S: '#44ff66',
    Z: '#ff4444',
    J: '#4488ff',
    L: '#ff8800',
    GHOST: 'rgba(255,255,255,0.12)',
};

// 블록 기본 형태 (4가지 회전 상태 직접 정의 – SRS 기준)
const TETROMINOES = {
    I: {
        color: COLORS.I,
        shapes: [
            [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ],
            [
                [0, 0, 1, 0],
                [0, 0, 1, 0],
                [0, 0, 1, 0],
                [0, 0, 1, 0],
            ],
            [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
            ],
            [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
            ],
        ],
    },
    O: {
        color: COLORS.O,
        shapes: [
            [
                [1, 1],
                [1, 1],
            ],
            [
                [1, 1],
                [1, 1],
            ],
            [
                [1, 1],
                [1, 1],
            ],
            [
                [1, 1],
                [1, 1],
            ],
        ],
    },
    T: {
        color: COLORS.T,
        shapes: [
            [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0],
            ],
            [
                [0, 1, 0],
                [0, 1, 1],
                [0, 1, 0],
            ],
            [
                [0, 0, 0],
                [1, 1, 1],
                [0, 1, 0],
            ],
            [
                [0, 1, 0],
                [1, 1, 0],
                [0, 1, 0],
            ],
        ],
    },
    S: {
        color: COLORS.S,
        shapes: [
            [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0],
            ],
            [
                [0, 1, 0],
                [0, 1, 1],
                [0, 0, 1],
            ],
            [
                [0, 0, 0],
                [0, 1, 1],
                [1, 1, 0],
            ],
            [
                [1, 0, 0],
                [1, 1, 0],
                [0, 1, 0],
            ],
        ],
    },
    Z: {
        color: COLORS.Z,
        shapes: [
            [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0],
            ],
            [
                [0, 0, 1],
                [0, 1, 1],
                [0, 1, 0],
            ],
            [
                [0, 0, 0],
                [1, 1, 0],
                [0, 1, 1],
            ],
            [
                [0, 1, 0],
                [1, 1, 0],
                [1, 0, 0],
            ],
        ],
    },
    J: {
        color: COLORS.J,
        shapes: [
            [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0],
            ],
            [
                [0, 1, 1],
                [0, 1, 0],
                [0, 1, 0],
            ],
            [
                [0, 0, 0],
                [1, 1, 1],
                [0, 0, 1],
            ],
            [
                [0, 1, 0],
                [0, 1, 0],
                [1, 1, 0],
            ],
        ],
    },
    L: {
        color: COLORS.L,
        shapes: [
            [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0],
            ],
            [
                [0, 1, 0],
                [0, 1, 0],
                [0, 1, 1],
            ],
            [
                [0, 0, 0],
                [1, 1, 1],
                [1, 0, 0],
            ],
            [
                [1, 1, 0],
                [0, 1, 0],
                [0, 1, 0],
            ],
        ],
    },
};

// SRS 월 킥 데이터 (회전 전→후 상태)
// 일반 피스 (J, L, S, T, Z)
const WALL_KICK_JLSTZ = {
    '0→1': [
        [0, 0],
        [-1, 0],
        [-1, +1],
        [0, -2],
        [-1, -2],
    ],
    '1→0': [
        [0, 0],
        [+1, 0],
        [+1, -1],
        [0, +2],
        [+1, +2],
    ],
    '1→2': [
        [0, 0],
        [+1, 0],
        [+1, -1],
        [0, +2],
        [+1, +2],
    ],
    '2→1': [
        [0, 0],
        [-1, 0],
        [-1, +1],
        [0, -2],
        [-1, -2],
    ],
    '2→3': [
        [0, 0],
        [+1, 0],
        [+1, +1],
        [0, -2],
        [+1, -2],
    ],
    '3→2': [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, +2],
        [-1, +2],
    ],
    '3→0': [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, +2],
        [-1, +2],
    ],
    '0→3': [
        [0, 0],
        [+1, 0],
        [+1, +1],
        [0, -2],
        [+1, -2],
    ],
};

// I 피스 월 킥
const WALL_KICK_I = {
    '0→1': [
        [0, 0],
        [-2, 0],
        [+1, 0],
        [-2, -1],
        [+1, +2],
    ],
    '1→0': [
        [0, 0],
        [+2, 0],
        [-1, 0],
        [+2, +1],
        [-1, -2],
    ],
    '1→2': [
        [0, 0],
        [-1, 0],
        [+2, 0],
        [-1, +2],
        [+2, -1],
    ],
    '2→1': [
        [0, 0],
        [+1, 0],
        [-2, 0],
        [+1, -2],
        [-2, +1],
    ],
    '2→3': [
        [0, 0],
        [+2, 0],
        [-1, 0],
        [+2, +1],
        [-1, -2],
    ],
    '3→2': [
        [0, 0],
        [-2, 0],
        [+1, 0],
        [-2, -1],
        [+1, +2],
    ],
    '3→0': [
        [0, 0],
        [+1, 0],
        [-2, 0],
        [+1, -2],
        [-2, +1],
    ],
    '0→3': [
        [0, 0],
        [-1, 0],
        [+2, 0],
        [-1, +2],
        [+2, -1],
    ],
};

// 점수 테이블
const SCORE_TABLE = {
    0: 0,
    1: 100,
    2: 300,
    3: 500,
    4: 800, // 테트리스
};

const T_SPIN_SCORE = {
    0: 400, // T-스핀 no line (미니 T-스핀 no line = 100)
    1: 800, // T-스핀 Single
    2: 1200, // T-스핀 Double
    3: 1600, // T-스핀 Triple
};

const T_SPIN_MINI_SCORE = {
    0: 100,
    1: 200,
    2: 400,
};

// ===== 보드 =====
class Board {
    constructor() {
        this.grid = Array.from({ length: ROWS + HIDDEN_ROWS }, () =>
            Array(COLS).fill(0)
        );
    }

    reset() {
        this.grid = Array.from({ length: ROWS + HIDDEN_ROWS }, () =>
            Array(COLS).fill(0)
        );
    }

    isValid(shape, offsetX, offsetY) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = offsetX + c;
                const ny = offsetY + r;
                if (nx < 0 || nx >= COLS) return false;
                if (ny >= ROWS + HIDDEN_ROWS) return false;
                if (ny >= 0 && this.grid[ny][nx]) return false;
            }
        }
        return true;
    }

    place(piece) {
        const shape = piece.currentShape();
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const ny = piece.y + r;
                const nx = piece.x + c;
                if (ny >= 0) {
                    this.grid[ny][nx] = piece.type;
                }
            }
        }
    }

    clearLines() {
        let clearedCount = 0;
        // 아래에서 위로 순회하되, 지운 뒤 r을 다시 검사하지 않도록 역방향 필터링
        for (let r = ROWS + HIDDEN_ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every((c) => c !== 0)) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill(0));
                clearedCount++;
                // splice 후 같은 r 위치에 새 행이 내려오므로 r을 증가시켜 재검사
                r++;
            }
        }
        return clearedCount;
    }

    isGameOver(piece) {
        return !this.isValid(piece.currentShape(), piece.x, piece.y);
    }
}

// ===== 피스 =====
class Piece {
    constructor(type) {
        this.type = type;
        this.rotation = 0;
        this.data = TETROMINOES[type];
        // 스폰 위치 (중앙)
        const shape = this.currentShape();
        this.x = Math.floor((COLS - shape[0].length) / 2);
        this.y = 0; // 숨겨진 행 영역에 스폰
    }

    currentShape() {
        return this.data.shapes[this.rotation];
    }

    color() {
        return this.data.color;
    }

    // 딥 클론
    clone() {
        const p = new Piece(this.type);
        p.rotation = this.rotation;
        p.x = this.x;
        p.y = this.y;
        return p;
    }
}

// ===== 7-bag 랜덤 =====
class Bag {
    constructor() {
        this.bag = [];
    }

    next() {
        if (this.bag.length === 0) this._refill();
        return this.bag.shift();
    }

    peek(n) {
        while (this.bag.length < n) this._refill();
        return this.bag.slice(0, n);
    }

    _refill() {
        const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        this.bag.push(...types);
    }
}

// ===== T-스핀 감지 =====
// 4-코너 룰 적용
function detectTSpin(board, piece, rotated, kickIndex) {
    if (piece.type !== 'T' || !rotated) return null;

    const rot = piece.rotation;
    // T 피스의 4 모서리 위치 (피스 로컬 좌표, 3x3 기준)
    const corners = [
        { r: 0, c: 0 }, // 좌상
        { r: 0, c: 2 }, // 우상
        { r: 2, c: 0 }, // 좌하
        { r: 2, c: 2 }, // 우하
    ];

    let filledCorners = 0;
    const filled = corners.map(({ r, c }) => {
        const bx = piece.x + c;
        const by = piece.y + r;
        const isWall = bx < 0 || bx >= COLS || by >= ROWS + HIDDEN_ROWS;
        const isBlock = !isWall && by >= 0 && board.grid[by][bx] !== 0;
        const result = isWall || isBlock;
        if (result) filledCorners++;
        return result;
    });

    if (filledCorners < 3) return null; // 코너 3개 미만 → T-스핀 아님

    // "앞쪽" 두 코너 판별 (T-피스가 향하는 방향)
    // rot: 0=위, 1=오른쪽, 2=아래, 3=왼쪽
    const frontCorners = {
        0: [0, 1], // 좌상, 우상 (T가 위를 향함)
        1: [1, 3], // 우상, 우하
        2: [2, 3], // 좌하, 우하
        3: [0, 2], // 좌상, 좌하
    };
    const front = frontCorners[rot];
    const frontFilled = filled[front[0]] && filled[front[1]];

    if (!frontFilled) {
        // 미니 T-스핀 (앞 코너가 2개 다 막히지 않음)
        // 단, 5번째 킥(kickIndex === 4) 이면 정식 T-스핀으로 승격
        if (kickIndex === 4) return 'TSPIN';
        return 'TSPIN_MINI';
    }
    return 'TSPIN';
}

// ===== 메인 게임 클래스 =====
class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        this.board = new Board();
        this.bag = new Bag();

        this.currentPiece = null;
        this.heldPiece = null;
        this.canHold = true;

        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = -1;
        this.b2b = -1; // Back-to-Back 카운터
        this.mode = null; // '40line' | 'infinity'

        this.gameOver = false;
        this.paused = false;

        this.lastTime = 0;
        this.dropAccum = 0; // 자동 낙하 누적 ms
        this.lockDelay = 0; // 잠금 지연 누적 ms
        this.lockMoves = 0; // 잠금 지연 중 이동 횟수
        this.isOnGround = false;

        this.rafId = null;

        // T-스핀 상태
        this.lastRotated = false;
        this.lastKickIndex = 0;
        this.lastTSpinType = null; // 'TSPIN' | 'TSPIN_MINI' | null

        // 타이머 (40라인 모드)
        this.startTime = 0;
        this.elapsed = 0;
        this.timerInterval = null;

        this.inputLock = false; // DAS/ARR 처리용
        this.dasTimer = null;
        this.arrTimer = null;
        this.heldKeys = {};

        this._bindEvents();
    }

    // ===== 게임 시작 =====
    start(mode) {
        this.mode = mode;
        this.board.reset();
        this.bag = new Bag();
        this.currentPiece = null;
        this.heldPiece = null;
        this.canHold = true;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = -1;
        this.b2b = -1;
        this.gameOver = false;
        this.paused = false;
        this.lastRotated = false;
        this.lastKickIndex = 0;
        this.lastTSpinType = null;
        this.elapsed = 0;
        this.dropAccum = 0;
        this.heldKeys = {};

        this._updateUI();
        this._spawnPiece();
        this.lastTime = performance.now();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.startTime = performance.now();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this._updateTimer(), 100);

        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame((t) => this._loop(t));
    }

    // ===== 게임 루프 =====
    _loop(time) {
        if (this.gameOver || this.paused) return;

        const dt = time - this.lastTime;
        this.lastTime = time;

        this.dropAccum += dt;
        const dropInterval = this._dropInterval();

        if (this.dropAccum >= dropInterval) {
            this.dropAccum -= dropInterval;
            this._softDrop(false);
        }

        // 잠금 지연 처리
        if (this.isOnGround) {
            this.lockDelay += dt;
            if (this.lockDelay >= 500 || this.lockMoves >= 15) {
                this._lockPiece();
            }
        }

        this._render();
        this.rafId = requestAnimationFrame((t) => this._loop(t));
    }

    _dropInterval() {
        // Guideline 속도 공식 (레벨당)
        const lvl = Math.min(this.level, 20);
        return Math.pow(0.8 - (lvl - 1) * 0.007, lvl - 1) * 1000;
    }

    // ===== 피스 스폰 =====
    _spawnPiece() {
        const type = this.bag.next();
        this.currentPiece = new Piece(type);
        this.canHold = true;
        this.lastRotated = false;
        this.lastTSpinType = null;
        this.isOnGround = false;
        this.lockDelay = 0;
        this.lockMoves = 0;

        if (this.board.isGameOver(this.currentPiece)) {
            this._triggerGameOver();
        }
    }

    // ===== 이동 =====
    _moveLeft() {
        if (!this.currentPiece) return;
        const p = this.currentPiece;
        if (this.board.isValid(p.currentShape(), p.x - 1, p.y)) {
            p.x--;
            this.lastRotated = false;
            this._resetLockIfOnGround();
            AudioEngine.SFX.move();
        }
    }

    _moveRight() {
        if (!this.currentPiece) return;
        const p = this.currentPiece;
        if (this.board.isValid(p.currentShape(), p.x + 1, p.y)) {
            p.x++;
            this.lastRotated = false;
            this._resetLockIfOnGround();
            AudioEngine.SFX.move();
        }
    }

    _softDrop(manual) {
        if (!this.currentPiece) return;
        const p = this.currentPiece;
        if (this.board.isValid(p.currentShape(), p.x, p.y + 1)) {
            p.y++;
            this.isOnGround = false;
            this.lockDelay = 0;
            if (manual) {
                this.score += 1;
                AudioEngine.SFX.softDrop();
            }
            this.lastRotated = false;
        } else {
            this.isOnGround = true;
        }
    }

    _hardDrop() {
        if (!this.currentPiece) return;
        const p = this.currentPiece;
        let dropped = 0;
        while (this.board.isValid(p.currentShape(), p.x, p.y + 1)) {
            p.y++;
            dropped++;
        }
        this.score += dropped * 2;
        this.lastRotated = false;
        AudioEngine.SFX.hardDrop();
        this._lockPiece();
    }

    // ===== 홀드 =====
    _hold() {
        if (!this.canHold || !this.currentPiece) return;
        this.canHold = false;
        const type = this.currentPiece.type;
        if (this.heldPiece) {
            const swapType = this.heldPiece;
            this.heldPiece = type;
            this.currentPiece = new Piece(swapType);
        } else {
            this.heldPiece = type;
            this._spawnPiece();
        }
        this.lastRotated = false;
        this.lastTSpinType = null;
        this.isOnGround = false;
        this.lockDelay = 0;
        this.lockMoves = 0;
        AudioEngine.SFX.hold();
        this._renderHold();
    }

    // ===== 회전 (SRS) =====
    _rotate(dir) {
        // dir: 1 = 시계, -1 = 반시계
        if (!this.currentPiece) return;
        const p = this.currentPiece;
        const prevRot = p.rotation;
        const newRot = (((p.rotation + dir) % 4) + 4) % 4;
        const key = `${prevRot}→${newRot}`;

        const kicks = p.type === 'I' ? WALL_KICK_I[key] : WALL_KICK_JLSTZ[key];
        if (!kicks) return;

        for (let i = 0; i < kicks.length; i++) {
            const [dx, dy] = kicks[i];
            if (this.board.isValid(p.data.shapes[newRot], p.x + dx, p.y + dy)) {
                p.x += dx;
                p.y += dy;
                p.rotation = newRot;
                this.lastRotated = true;
                this.lastKickIndex = i;
                this.lastTSpinType = detectTSpin(this.board, p, true, i);
                this._resetLockIfOnGround();
                AudioEngine.SFX.rotate();
                return;
            }
        }
        // 모든 킥 실패 → 회전 안 됨
    }

    _resetLockIfOnGround() {
        if (this.isOnGround) {
            this.lockDelay = 0;
            this.lockMoves++;
        }
    }

    // ===== 잠금 =====
    _lockPiece() {
        if (!this.currentPiece) return;
        this.board.place(this.currentPiece);

        // T-스핀 판별
        const tSpinType = this.lastTSpinType;

        const cleared = this.board.clearLines();

        // 라인 클리어 사운드
        if (cleared > 0) {
            if (tSpinType === 'TSPIN') {
                AudioEngine.SFX.tSpin();
            } else if (tSpinType === 'TSPIN_MINI') {
                AudioEngine.SFX.tSpinMini();
            } else if (cleared === 4) {
                AudioEngine.SFX.tetris();
            } else if (cleared >= 2) {
                AudioEngine.SFX.clearDouble();
            } else {
                AudioEngine.SFX.clearSingle();
            }
        } else {
            AudioEngine.SFX.lock();
        }

        this._processScore(cleared, tSpinType);

        this.isOnGround = false;
        this.lockDelay = 0;
        this.lockMoves = 0;
        this.lastRotated = false;
        this.lastTSpinType = null;

        // 40라인 모드 체크
        if (this.mode === '40line' && this.lines >= 40) {
            this._triggerClear();
            return;
        }

        this._spawnPiece();
        this._renderNext();
        this._renderHold();
    }

    // ===== 점수 계산 =====
    _processScore(cleared, tSpinType) {
        const isTSpin = tSpinType === 'TSPIN';
        const isMini = tSpinType === 'TSPIN_MINI';
        const isTetris = cleared === 4;
        const isB2B = isTetris || isTSpin; // B2B 조건

        let points = 0;
        let actionText = '';

        if (isTSpin) {
            points = T_SPIN_SCORE[cleared] || T_SPIN_SCORE[0];
            const labels = [
                'T-SPIN!',
                'T-SPIN\nSINGLE',
                'T-SPIN\nDOUBLE',
                'T-SPIN\nTRIPLE',
            ];
            actionText = labels[Math.min(cleared, 3)];
        } else if (isMini) {
            points = T_SPIN_MINI_SCORE[Math.min(cleared, 2)];
            actionText = cleared > 0 ? `MINI T-SPIN\nSINGLE` : 'MINI T-SPIN';
        } else {
            points = SCORE_TABLE[cleared] || 0;
            if (cleared === 1) actionText = 'SINGLE';
            else if (cleared === 2) actionText = 'DOUBLE';
            else if (cleared === 3) actionText = 'TRIPLE';
            else if (cleared === 4) actionText = 'TETRIS!';
        }

        // Back-to-Back 보너스
        if (isB2B && this.b2b >= 0 && cleared > 0) {
            points = Math.floor(points * 1.5);
            this.b2b++;
            actionText = 'B2B\n' + actionText;
        } else if (isB2B && cleared > 0) {
            this.b2b = 0;
        } else if (!isB2B && cleared > 0) {
            this.b2b = -1;
        }

        // 콤보 보너스
        if (cleared > 0) {
            this.combo++;
            if (this.combo > 0) {
                points += 50 * this.combo * this.level;
                if (!actionText) actionText = `${this.combo} COMBO`;
                else actionText += `\n${this.combo} COMBO`;
            }
        } else {
            this.combo = -1;
        }

        // 레벨 곱
        points *= this.level;
        this.score += points;
        this.lines += cleared;

        // 레벨 업 (10줄마다)
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            AudioEngine.SFX.levelUp();
            AudioEngine.BGM.updateTempo(this.level);
        }

        // 콤보 사운드
        if (cleared > 0 && this.combo > 0) {
            AudioEngine.SFX.combo(this.combo);
        }

        if (actionText) this._showActionText(actionText.replace(/\n/g, '\n'));

        this._updateUI();
    }

    _showActionText(text) {
        const el = document.getElementById('action-text');
        el.classList.remove('show');
        void el.offsetWidth; // reflow
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 900);
    }

    // ===== 고스트 피스 =====
    _getGhostY() {
        if (!this.currentPiece) return null;
        const p = this.currentPiece;
        let ghostY = p.y;
        while (this.board.isValid(p.currentShape(), p.x, ghostY + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    // ===== 렌더링 =====
    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 그리드 라인
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
            }
        }

        // 보드 블록
        for (let r = HIDDEN_ROWS; r < ROWS + HIDDEN_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board.grid[r][c]) {
                    this._drawCell(
                        ctx,
                        c,
                        r - HIDDEN_ROWS,
                        COLORS[this.board.grid[r][c]]
                    );
                }
            }
        }

        // 고스트 피스
        if (this.currentPiece) {
            const ghostY = this._getGhostY();
            const shape = this.currentPiece.currentShape();
            const p = this.currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue;
                    const gy = ghostY + r - HIDDEN_ROWS;
                    if (gy >= 0 && gy < ROWS) {
                        this._drawCellGhost(ctx, p.x + c, gy, p.color());
                    }
                }
            }
        }

        // 현재 피스
        if (this.currentPiece) {
            const shape = this.currentPiece.currentShape();
            const p = this.currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue;
                    const dy = p.y + r - HIDDEN_ROWS;
                    if (dy >= 0 && dy < ROWS) {
                        this._drawCell(ctx, p.x + c, dy, p.color());
                    }
                }
            }
        }
    }

    _drawCell(ctx, cx, cy, color) {
        const x = cx * CELL;
        const y = cy * CELL;
        const s = CELL;
        const r = 3;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r);
        ctx.fill();

        // 하이라이트
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, s - 4, 6, 2);
        ctx.fill();

        // 어두운 테두리
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r);
        ctx.stroke();
    }

    _drawCellGhost(ctx, cx, cy, color) {
        const x = cx * CELL;
        const y = cy * CELL;
        const s = CELL;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, s - 4, s - 4, 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    _renderMiniBoard(ctx, canvas, type, cellSize) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!type) return;
        const data = TETROMINOES[type];
        const shape = data.shapes[0];
        const rows = shape.length;
        const cols = shape[0].length;
        const offX = Math.floor((canvas.width / cellSize - cols) / 2);
        const offY = Math.floor((canvas.height / cellSize - rows) / 2);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c]) {
                    this._drawCell(ctx, offX + c, offY + r, data.color);
                }
            }
        }
    }

    _renderHold() {
        const cellSize = 24;
        this.holdCtx.clearRect(
            0,
            0,
            this.holdCanvas.width,
            this.holdCanvas.height
        );
        if (!this.heldPiece) return;
        const data = TETROMINOES[this.heldPiece];
        const shape = data.shapes[0];
        const rows = shape.length;
        const cols = shape[0].length;
        const offX = Math.floor((this.holdCanvas.width / cellSize - cols) / 2);
        const offY = Math.floor((this.holdCanvas.height / cellSize - rows) / 2);

        const alpha = this.canHold ? 1 : 0.4;
        this.holdCtx.globalAlpha = alpha;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c]) {
                    // 임시 canvas 크기 조정
                    const px = (offX + c) * cellSize;
                    const py = (offY + r) * cellSize;
                    const s = cellSize;
                    this.holdCtx.fillStyle = data.color;
                    this.holdCtx.beginPath();
                    this.holdCtx.roundRect(px + 1, py + 1, s - 2, s - 2, 2);
                    this.holdCtx.fill();
                    this.holdCtx.fillStyle = 'rgba(255,255,255,0.2)';
                    this.holdCtx.beginPath();
                    this.holdCtx.roundRect(px + 2, py + 2, s - 4, 5, 1);
                    this.holdCtx.fill();
                }
            }
        }
        this.holdCtx.globalAlpha = 1;
    }

    _renderNext() {
        const cellSize = 20;
        this.nextCtx.clearRect(
            0,
            0,
            this.nextCanvas.width,
            this.nextCanvas.height
        );
        const nexts = this.bag.peek(5);
        for (let i = 0; i < nexts.length; i++) {
            const type = nexts[i];
            const data = TETROMINOES[type];
            const shape = data.shapes[0];
            const rows = shape.length;
            const cols = shape[0].length;
            const slotH = 96;
            const slotY = i * slotH;
            const offX = Math.floor(
                (this.nextCanvas.width / cellSize - cols) / 2
            );
            const baseY = slotY + Math.floor((slotH / cellSize - rows) / 2);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (!shape[r][c]) continue;
                    const px = (offX + c) * cellSize;
                    const py = (baseY + r) * cellSize;
                    const s = cellSize;
                    this.nextCtx.fillStyle = data.color;
                    this.nextCtx.beginPath();
                    this.nextCtx.roundRect(px + 1, py + 1, s - 2, s - 2, 2);
                    this.nextCtx.fill();
                    this.nextCtx.fillStyle = 'rgba(255,255,255,0.2)';
                    this.nextCtx.beginPath();
                    this.nextCtx.roundRect(px + 2, py + 2, s - 4, 4, 1);
                    this.nextCtx.fill();
                }
            }
        }
    }

    // ===== UI 업데이트 =====
    _updateUI() {
        document.getElementById('score-display').textContent =
            this.score.toLocaleString();
        document.getElementById('level-display').textContent = this.level;
        document.getElementById('lines-display').textContent = this.lines;
        document.getElementById('combo-display').textContent = Math.max(
            0,
            this.combo
        );
        document.getElementById('b2b-display').textContent = Math.max(
            0,
            this.b2b
        );
    }

    _updateTimer() {
        if (this.gameOver || this.paused) return;
        this.elapsed = performance.now() - this.startTime;
        const totalSec = Math.floor(this.elapsed / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        document.getElementById('time-display').textContent = `${min}:${sec
            .toString()
            .padStart(2, '0')}`;
    }

    // ===== 게임 오버 / 클리어 =====
    _triggerGameOver() {
        this.gameOver = true;
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.rafId);
        AudioEngine.BGM.stop();
        AudioEngine.SFX.gameOver();

        document.getElementById('overlay-title').textContent = 'GAME OVER';
        document.getElementById('overlay-title').style.color = 'var(--danger)';
        document.getElementById(
            'overlay-score'
        ).textContent = `SCORE: ${this.score.toLocaleString()}`;
        document.getElementById('overlay-time').textContent = '';
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    _triggerClear() {
        this.gameOver = true;
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.rafId);
        AudioEngine.BGM.stop();
        AudioEngine.SFX.gameComplete();

        const totalSec = Math.floor(this.elapsed / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        const ms = Math.floor((this.elapsed % 1000) / 10);
        const timeStr = `${min}:${sec.toString().padStart(2, '0')}.${ms
            .toString()
            .padStart(2, '0')}`;

        document.getElementById('overlay-title').textContent = '40 LINE CLEAR!';
        document.getElementById('overlay-title').style.color = 'var(--success)';
        document.getElementById(
            'overlay-score'
        ).textContent = `SCORE: ${this.score.toLocaleString()}`;
        document.getElementById(
            'overlay-time'
        ).textContent = `TIME: ${timeStr}`;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    // ===== 입력 처리 =====
    _bindEvents() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
    }

    _onKeyDown(e) {
        if (this.gameOver) return;

        const key = e.code;

        // 이미 눌린 키 무시 (DAS/ARR 방지 - 자체 처리)
        if (this.heldKeys[key]) return;
        this.heldKeys[key] = true;

        switch (key) {
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                this._moveLeft();
                this._startDAS('left');
                break;
            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                this._moveRight();
                this._startDAS('right');
                break;
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                this._softDrop(true);
                this._startDAS('down');
                break;
            case 'ArrowUp':
            case 'KeyX':
                e.preventDefault();
                this._rotate(1);
                break;
            case 'KeyZ':
                e.preventDefault();
                this._rotate(-1);
                break;
            case 'Space':
                e.preventDefault();
                this._hardDrop();
                break;
            case 'KeyC':
            case 'ShiftLeft':
            case 'ShiftRight':
                e.preventDefault();
                this._hold();
                break;
        }
        this._render();
        this._renderHold();
        this._renderNext();
    }

    _onKeyUp(e) {
        const key = e.code;
        delete this.heldKeys[key];
        if (
            [
                'ArrowLeft',
                'KeyA',
                'ArrowRight',
                'KeyD',
                'ArrowDown',
                'KeyS',
            ].includes(key)
        ) {
            this._stopDAS();
        }
    }

    // DAS (지연 자동 반복) / ARR (자동 반복 비율)
    _startDAS(dir) {
        this._stopDAS();
        this.dasTimer = setTimeout(() => {
            this.arrTimer = setInterval(() => {
                if (dir === 'left') this._moveLeft();
                else if (dir === 'right') this._moveRight();
                else if (dir === 'down') this._softDrop(true);
                this._render();
            }, 50); // ARR: 50ms
        }, 170); // DAS: 170ms
    }

    _stopDAS() {
        if (this.dasTimer) {
            clearTimeout(this.dasTimer);
            this.dasTimer = null;
        }
        if (this.arrTimer) {
            clearInterval(this.arrTimer);
            this.arrTimer = null;
        }
    }
}

// ===== 인증 시스템 =====
const Auth = {
    STORAGE_KEY: 'tetless_users',
    SESSION_KEY: 'tetless_session',

    getUsers() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    },

    saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    },

    getCurrentUser() {
        return JSON.parse(sessionStorage.getItem(this.SESSION_KEY) || 'null');
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(
            (u) => u.email === email && u.password === password
        );
        if (!user)
            return {
                ok: false,
                msg: '이메일 또는 비밀번호가 올바르지 않습니다.',
            };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
        return { ok: true, user };
    },

    signup(nickname, email, password) {
        if (!nickname || nickname.length < 2)
            return { ok: false, msg: '닉네임은 2자 이상이어야 합니다.' };
        if (!email.includes('@'))
            return { ok: false, msg: '올바른 이메일을 입력하세요.' };
        if (password.length < 6)
            return { ok: false, msg: '비밀번호는 6자 이상이어야 합니다.' };
        const users = this.getUsers();
        if (users.find((u) => u.email === email))
            return { ok: false, msg: '이미 사용중인 이메일입니다.' };
        const user = { nickname, email, password };
        users.push(user);
        this.saveUsers(users);
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
        return { ok: true, user };
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
    },
};

// ===== UI 컨트롤러 =====
const game = new TetrisGame();
let currentMode = null;

function showScreen(id) {
    document
        .querySelectorAll('.screen')
        .forEach((s) => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function updateMainUI() {
    const user = Auth.getCurrentUser();
    const greeting = document.getElementById('user-greeting');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');

    if (user) {
        greeting.textContent = `👋 ${user.nickname}`;
        greeting.classList.remove('hidden');
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
    } else {
        greeting.classList.add('hidden');
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
    }
}

function startGame(mode) {
    currentMode = mode;
    showScreen('game-screen');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('time-box').style.display =
        mode === '40line' ? '' : '';
    AudioEngine.init();
    AudioEngine.BGM.stop();
    setTimeout(() => AudioEngine.BGM.play(), 100);
    game.start(mode);
    game._renderHold();
    game._renderNext();
}

// 버튼 이벤트
document
    .getElementById('btn-40line')
    .addEventListener('click', () => startGame('40line'));
document
    .getElementById('btn-infinity')
    .addEventListener('click', () => startGame('infinity'));
document.getElementById('btn-back').addEventListener('click', () => {
    if (game.rafId) cancelAnimationFrame(game.rafId);
    clearInterval(game.timerInterval);
    game._stopDAS();
    AudioEngine.BGM.stop();
    showScreen('main-screen');
});

document.getElementById('btn-retry').addEventListener('click', () => {
    document.getElementById('game-over-overlay').classList.add('hidden');
    game._stopDAS();
    startGame(currentMode);
});

document.getElementById('btn-menu').addEventListener('click', () => {
    if (game.rafId) cancelAnimationFrame(game.rafId);
    clearInterval(game.timerInterval);
    game._stopDAS();
    AudioEngine.BGM.stop();
    document.getElementById('game-over-overlay').classList.add('hidden');
    showScreen('main-screen');
});

// 로그인 모달

// 뮤트 버튼 (2개)
function updateMuteButtons() {
    const muted = AudioEngine.isMuted();
    const label = muted ? '🔇 없음' : '🔊 소리';
    document.getElementById('btn-mute-main').textContent = label;
    document.getElementById('btn-mute-game').textContent = label;
}

document.getElementById('btn-mute-main').addEventListener('click', () => {
    AudioEngine.init();
    AudioEngine.toggleMute();
    updateMuteButtons();
});

document.getElementById('btn-mute-game').addEventListener('click', () => {
    AudioEngine.toggleMute();
    updateMuteButtons();
});

// 볼륨 슬라이더
document.getElementById('vol-bgm').addEventListener('input', (e) => {
    AudioEngine.setBgmVolume(e.target.value / 100);
});
document.getElementById('vol-sfx').addEventListener('input', (e) => {
    AudioEngine.setSfxVolume(e.target.value / 100);
});

// M키 단충키 (게임 중)
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !game.gameOver) {
        AudioEngine.toggleMute();
        updateMuteButtons();
    }
});

// 메인 버튼 효과음
[
    'btn-40line',
    'btn-infinity',
    'btn-back',
    'btn-retry',
    'btn-menu',
    'btn-login',
    'btn-close-modal',
    'btn-do-login',
    'btn-do-signup',
].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
        el.addEventListener('mousedown', () => {
            AudioEngine.init();
            AudioEngine.SFX.menuClick();
        });
});

document.getElementById('btn-login').addEventListener('click', () => {
    document.getElementById('login-modal').classList.remove('hidden');
});

document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('login-modal').classList.add('hidden');
});

document.getElementById('modal-backdrop') &&
    document.querySelector('.modal-backdrop').addEventListener('click', () => {
        document.getElementById('login-modal').classList.add('hidden');
    });

document.querySelector('.modal-backdrop').addEventListener('click', () => {
    document.getElementById('login-modal').classList.add('hidden');
});

// 탭 전환
document.querySelectorAll('.modal-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document
            .querySelectorAll('.modal-tab')
            .forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        document
            .querySelectorAll('.tab-content')
            .forEach((c) => c.classList.add('hidden'));
        document
            .getElementById(`tab-${tab.dataset.tab}`)
            .classList.remove('hidden');
    });
});

// 로그인
document.getElementById('btn-do-login').addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const result = Auth.login(email, password);
    if (result.ok) {
        document.getElementById('login-modal').classList.add('hidden');
        updateMainUI();
    } else {
        document.getElementById('login-error').textContent = result.msg;
    }
});

// 회원가입
document.getElementById('btn-do-signup').addEventListener('click', () => {
    const nickname = document.getElementById('signup-nickname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const result = Auth.signup(nickname, email, password);
    if (result.ok) {
        document.getElementById('login-modal').classList.add('hidden');
        updateMainUI();
    } else {
        document.getElementById('signup-error').textContent = result.msg;
    }
});

// 로그아웃
document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.logout();
    updateMainUI();
});

// 엔터키로 로그인
document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-do-login').click();
});
document.getElementById('signup-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-do-signup').click();
});

// 초기화
updateMainUI();
showScreen('main-screen');
