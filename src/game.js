'use strict';

// ===== TetrisGame =====
// 책임: 게임 루프, 피스 이동/회전/잠금, 렌더링, 입력 처리
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
        this.b2b = -1;
        this.mode = null; // '40line' | 'infinity'

        this.gameOver = false;
        this.paused = false;

        this.lastTime = 0;
        this.dropAccum = 0;
        this.lockDelay = 0;
        this.lockMoves = 0;
        this.isOnGround = false;

        this.rafId = null;

        this.lastRotated = false;
        this.lastKickIndex = 0;
        this.lastTSpinType = null;

        this.startTime = 0;
        this.elapsed = 0;
        this.timerInterval = null;

        this.dasTimer = null;
        this.dcdTimer = null;
        this.arrTimer = null;
        this.heldKeys = {};
        this.isSoftDropping = false;

        this.pendingGarbage = 0;
        this.garbageHoleColumn = Math.floor(Math.random() * COLS);
        this.battleEnabled = false;
        this.onAttack = null;
        this.onDefeat = null;
        this.onGarbageChange = null;

        this._bindEvents();
    }

    // ===== 시작 =====
    start(mode, options = {}) {
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
        this.isSoftDropping = false;
        this.pendingGarbage = 0;
        this.garbageHoleColumn = Math.floor(Math.random() * COLS);
        this.battleEnabled = Boolean(options.battleEnabled);
        this.onAttack = options.onAttack || null;
        this.onDefeat = options.onDefeat || null;
        this.onGarbageChange = options.onGarbageChange || null;

        this._updateUI();
        this._spawnPiece();
        this.lastTime = performance.now();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.startTime = performance.now();
        this.timerInterval = setInterval(() => this._updateTimer(), 100);

        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame((t) => this._loop(t));
    }

    receiveGarbage(lines) {
        if (!lines || lines <= 0 || this.gameOver) return;
        this.pendingGarbage += lines;
        this._updateUI();
        if (this.onGarbageChange) {
            this.onGarbageChange(this.pendingGarbage);
        }
    }

    _applyGarbage(lines) {
        if (!lines || lines <= 0) return;
        for (let i = 0; i < lines; i++) {
            if (this.board.grid[0].some((c) => c !== 0)) {
                this._triggerGameOver();
                return;
            }
            if (Math.random() < 0.35) {
                this.garbageHoleColumn = Math.floor(Math.random() * COLS);
            }
            const garbageLine = Array(COLS).fill('GARBAGE');
            garbageLine[this.garbageHoleColumn] = 0;
            this.board.grid.shift();
            this.board.grid.push(garbageLine);
        }
    }

    // ===== 게임 루프 =====
    _loop(time) {
        if (this.gameOver || this.paused) return;

        const dt = time - this.lastTime;
        this.lastTime = time;

        this.dropAccum += dt;
        const sdf = this.isSoftDropping ? GameSettings.getSDFMultiplier() : 1;
        const dropInterval = sdf === Infinity ? 0 : this._dropInterval() / sdf;

        if (sdf === Infinity) {
            if (this.isSoftDropping) {
                while (
                    this.board.isValid(
                        this.currentPiece.currentShape(),
                        this.currentPiece.x,
                        this.currentPiece.y + 1,
                    )
                ) {
                    this.currentPiece.y++;
                    this.score += 1;
                }
                this.isOnGround = true;
                this.isSoftDropping = false;
            }
        } else if (this.dropAccum >= dropInterval) {
            this.dropAccum -= dropInterval;
            this._softDrop(false);
        }

        // 매 프레임 실제 접지 여부 동기화
        if (this.currentPiece) {
            const actuallyOnGround = !this.board.isValid(
                this.currentPiece.currentShape(),
                this.currentPiece.x,
                this.currentPiece.y + 1,
            );
            if (!actuallyOnGround) {
                this.isOnGround = false;
                this.lockDelay = 0;
            } else {
                this.isOnGround = true;
            }
        }

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
        const lvl = Math.min(this.level, 20);
        return Math.pow(0.8 - (lvl - 1) * 0.007, lvl - 1) * 1000;
    }

    // ===== 스폰 =====
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
        if (!this.currentPiece) return;
        const p = this.currentPiece;
        const prevRot = p.rotation;
        const newRot = (((p.rotation + dir) % 4) + 4) % 4;
        const key = `${prevRot}→${newRot}`;

        if (p.type === 'O') {
            p.rotation = newRot;
            this.lastRotated = true;
            this.lastKickIndex = 0;
            this.lastTSpinType = null;
            this._resetLockIfOnGround();
            AudioEngine.SFX.rotate();
            return;
        }

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
        // 공중 고정 방지
        if (
            this.board.isValid(
                this.currentPiece.currentShape(),
                this.currentPiece.x,
                this.currentPiece.y + 1,
            )
        ) {
            this.isOnGround = false;
            this.lockDelay = 0;
            return;
        }

        this.board.place(this.currentPiece);

        const tSpinType = this.lastTSpinType;
        const cleared = this.board.clearLines();
        const isPerfectClear = cleared > 0 && this.board.isPerfectClear();

        if (isPerfectClear) {
            AudioEngine.SFX.perfectClear();
        } else if (cleared > 0) {
            if (tSpinType === 'TSPIN') AudioEngine.SFX.tSpin();
            else if (tSpinType === 'TSPIN_MINI') AudioEngine.SFX.tSpinMini();
            else if (cleared === 4) AudioEngine.SFX.tetris();
            else if (cleared >= 2) AudioEngine.SFX.clearDouble();
            else AudioEngine.SFX.clearSingle();
        } else {
            AudioEngine.SFX.lock();
        }

        const combat = this._processScore(cleared, tSpinType, isPerfectClear);

        if (this.battleEnabled) {
            let outgoing = combat.attack;

            if (outgoing > 0 && this.pendingGarbage > 0) {
                const canceled = Math.min(outgoing, this.pendingGarbage);
                outgoing -= canceled;
                this.pendingGarbage -= canceled;
            }

            if (cleared === 0 && this.pendingGarbage > 0) {
                const rise = Math.min(4, this.pendingGarbage);
                this.pendingGarbage -= rise;
                this._applyGarbage(rise);
            }

            if (outgoing > 0 && this.onAttack) {
                this.onAttack(outgoing, combat);
            }

            if (this.onGarbageChange) {
                this.onGarbageChange(this.pendingGarbage);
            }
        }

        this.isOnGround = false;
        this.lockDelay = 0;
        this.lockMoves = 0;
        this.lastRotated = false;
        this.lastTSpinType = null;

        if (this.mode === '40line' && this.lines >= 40) {
            this._triggerClear();
            return;
        }

        this._spawnPiece();
        this._renderNext();
        this._renderHold();
    }

    // ===== 점수 계산 =====
    _processScore(cleared, tSpinType, isPerfectClear = false) {
        const isTSpin = tSpinType === 'TSPIN';
        const isMini = tSpinType === 'TSPIN_MINI';
        const isTetris = cleared === 4;
        const isB2B = isTetris || isTSpin;

        const PERFECT_CLEAR_SCORE = { 1: 800, 2: 1200, 3: 1800, 4: 2000 };

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
            actionText = cleared > 0 ? 'MINI T-SPIN\nSINGLE' : 'MINI T-SPIN';
        } else {
            points = SCORE_TABLE[cleared] || 0;
            if (cleared === 1) actionText = 'SINGLE';
            else if (cleared === 2) actionText = 'DOUBLE';
            else if (cleared === 3) actionText = 'TRIPLE';
            else if (cleared === 4) actionText = 'TETRIS!';
        }

        if (isB2B && this.b2b >= 0 && cleared > 0) {
            points = Math.floor(points * 1.5);
            this.b2b++;
            actionText = 'B2B\n' + actionText;
        } else if (isB2B && cleared > 0) {
            this.b2b = 0;
        } else if (!isB2B && cleared > 0) {
            this.b2b = -1;
        }

        if (isPerfectClear) {
            const pcBonus = PERFECT_CLEAR_SCORE[Math.min(cleared, 4)] || 800;
            points += pcBonus;
            actionText = 'PERFECT\nCLEAR!';
        }

        if (cleared > 0) {
            this.combo++;
            if (this.combo > 0) {
                points += 50 * this.combo * this.level;
                actionText += actionText
                    ? `\n${this.combo} COMBO`
                    : `${this.combo} COMBO`;
            }
        } else {
            this.combo = -1;
        }

        points *= this.level;
        this.score += points;
        this.lines += cleared;

        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            AudioEngine.SFX.levelUp();
            AudioEngine.BGM.updateTempo(this.level);
        }

        if (cleared > 0 && this.combo > 0) {
            AudioEngine.SFX.combo(this.combo);
        }

        if (actionText) this._showActionText(actionText);
        this._updateUI();

        const attack = computeTetrioAttack({
            cleared,
            tSpinType,
            b2bChain: Math.max(0, this.b2b),
            combo: this.combo,
            perfectClear: isPerfectClear,
        });

        return {
            cleared,
            tSpinType,
            perfectClear: isPerfectClear,
            attack,
            combo: this.combo,
            b2b: this.b2b,
        };
    }

    _showActionText(text) {
        const el = document.getElementById('action-text');
        el.classList.remove('show');
        void el.offsetWidth;
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 900);
    }

    // ===== 고스트 피스 =====
    _getGhostY() {
        if (!this.currentPiece) return null;
        const p = this.currentPiece;
        let ghostY = p.y;
        while (this.board.isValid(p.currentShape(), p.x, ghostY + 1)) ghostY++;
        return ghostY;
    }

    // ===== 렌더링 =====
    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 그리드 라인
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);

        // 보드 블록
        for (let r = HIDDEN_ROWS; r < ROWS + HIDDEN_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board.grid[r][c]) {
                    this._drawCell(
                        ctx,
                        c,
                        r - HIDDEN_ROWS,
                        COLORS[this.board.grid[r][c]],
                    );
                }
            }
        }

        // 고스트
        if (this.currentPiece) {
            const ghostY = this._getGhostY();
            const shape = this.currentPiece.currentShape();
            const p = this.currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue;
                    const gy = ghostY + r - HIDDEN_ROWS;
                    if (gy >= 0 && gy < ROWS)
                        this._drawCellGhost(ctx, p.x + c, gy, p.color());
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
                    if (dy >= 0 && dy < ROWS)
                        this._drawCell(ctx, p.x + c, dy, p.color());
                }
            }
        }
    }

    _drawCell(ctx, cx, cy, color) {
        const x = cx * CELL,
            y = cy * CELL,
            s = CELL,
            r = 3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, s - 4, 6, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r);
        ctx.stroke();
    }

    _drawCellGhost(ctx, cx, cy, color) {
        const x = cx * CELL,
            y = cy * CELL,
            s = CELL;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, s - 4, s - 4, 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    _renderHold() {
        const cellSize = 24;
        this.holdCtx.clearRect(
            0,
            0,
            this.holdCanvas.width,
            this.holdCanvas.height,
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
                if (!shape[r][c]) continue;
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
        this.holdCtx.globalAlpha = 1;
    }

    _renderNext() {
        const cellSize = 20;
        this.nextCtx.clearRect(
            0,
            0,
            this.nextCanvas.width,
            this.nextCanvas.height,
        );
        const nexts = this.bag.peek(4);
        for (let i = 0; i < nexts.length; i++) {
            const type = nexts[i];
            const data = TETROMINOES[type];
            const shape = data.shapes[0];
            const rows = shape.length;
            const cols = shape[0].length;
            const slotH = 96;
            const slotY = i * slotH;
            const offX = Math.floor(
                (this.nextCanvas.width / cellSize - cols) / 2,
            );
            const offY = Math.floor((slotH / cellSize - rows) / 2);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (!shape[r][c]) continue;
                    const px = (offX + c) * cellSize;
                    const py = slotY + (offY + r) * cellSize;
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
            this.combo,
        );
        document.getElementById('b2b-display').textContent = Math.max(
            0,
            this.b2b,
        );
        const incomingEl = document.getElementById('incoming-display');
        if (incomingEl) incomingEl.textContent = this.pendingGarbage;
        this._updateGarbageGauge();
    }

    _updateGarbageGauge() {
        const gauge = document.getElementById('garbage-gauge');
        if (!gauge) return;
        if (!this.battleEnabled) {
            gauge.classList.add('hidden');
            return;
        }
        gauge.classList.remove('hidden');
        const lines = this.pendingGarbage;
        // 최대 20줄 기준으로 퍼센트 계산
        const pct = Math.min(100, (lines / 20) * 100);
        const fill = document.getElementById('garbage-gauge-fill');
        if (fill) fill.style.height = pct + '%';
        const count = document.getElementById('garbage-gauge-count');
        if (count) count.textContent = lines > 0 ? lines : '';
        gauge.classList.toggle('critical', lines >= 10);
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
        document.getElementById('overlay-score').textContent =
            `SCORE: ${this.score.toLocaleString()}`;
        document.getElementById('overlay-time').textContent = '';
        document.getElementById('game-over-overlay').classList.remove('hidden');

        if (this.battleEnabled && this.onDefeat) {
            this.onDefeat();
        }
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
        document.getElementById('overlay-score').textContent =
            `SCORE: ${this.score.toLocaleString()}`;
        document.getElementById('overlay-time').textContent =
            `TIME: ${timeStr}`;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    // ===== 일시정지 =====
    _pause() {
        if (this.gameOver || this.paused) return;
        this.paused = true;
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
        clearInterval(this.timerInterval);
        this._stopDAS();
        document.getElementById('pause-overlay').classList.remove('hidden');
        document.getElementById('pause-countdown').textContent = '';
        const pb = document.getElementById('btn-pause-m');
        if (pb) pb.textContent = '▶';
    }

    _resume() {
        if (!this.paused) return;
        const overlay = document.getElementById('pause-overlay');
        const countEl = document.getElementById('pause-countdown');
        let count = 3;
        countEl.textContent = count;
        const triggerAnim = () => {
            countEl.style.animation = 'none';
            void countEl.offsetWidth;
            countEl.style.animation = '';
        };
        triggerAnim();
        const tick = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(tick);
                countEl.textContent = '';
                overlay.classList.add('hidden');
                this.paused = false;
                this.lastTime = performance.now();
                if (this.mode === '40line' && !this.gameOver) {
                    this.timerInterval = setInterval(
                        () => this._updateTimer(),
                        100,
                    );
                }
                this.rafId = requestAnimationFrame((t) => this._loop(t));
                const pb = document.getElementById('btn-pause-m');
                if (pb) pb.textContent = '⏸';
            } else {
                countEl.textContent = count;
                triggerAnim();
            }
        }, 1000);
    }

    // ===== 입력 =====
    _bindEvents() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        this._bindMobileControls();
    }

    _bindMobileControls() {
        const onTouch = (id, onStart, onEnd) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                el.setPointerCapture(e.pointerId);
                if (this.gameOver) return;
                onStart();
                this._render();
                this._renderHold();
                this._renderNext();
            });
            if (onEnd) {
                el.addEventListener('pointerup', (e) => {
                    e.preventDefault();
                    onEnd();
                });
                el.addEventListener('pointercancel', (e) => {
                    e.preventDefault();
                    onEnd();
                });
            }
        };

        onTouch(
            'mc-left',
            () => {
                this._moveLeft();
                this._startDAS('left');
            },
            () => this._stopDAS(),
        );
        onTouch(
            'mc-right',
            () => {
                this._moveRight();
                this._startDAS('right');
            },
            () => this._stopDAS(),
        );
        onTouch(
            'mc-soft',
            () => {
                this._softDrop(true);
                this._startDAS('down');
            },
            () => this._stopDAS(),
        );
        onTouch('mc-hard', () => this._hardDrop());
        onTouch('mc-cw', () => this._rotate(1));
        onTouch('mc-ccw', () => this._rotate(-1));
        onTouch('mc-180', () => this._rotate(2));
        onTouch('mc-hold', () => this._hold());
    }

    _onKeyDown(e) {
        if (e.code === 'Escape') {
            if (this.gameOver) return;
            if (this.paused) this._resume();
            else this._pause();
            return;
        }
        if (this.gameOver || this.paused) return;

        const key = e.code;
        if (this.heldKeys[key]) return;
        this.heldKeys[key] = true;

        switch (key) {
            case 'ArrowLeft':
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
                this.isSoftDropping = true;
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
            case 'KeyA':
                e.preventDefault();
                this._rotate(2);
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
        if (['ArrowDown', 'KeyS'].includes(key)) {
            this.isSoftDropping = false;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'KeyS'].includes(key)) {
            this._stopDAS();
        }
    }

    // ===== DAS / ARR / DCD =====
    _startDAS(dir) {
        this._stopDAS();
        const dasMs = GameSettings.getDASms();
        const dcdMs = GameSettings.getDCDms();
        const arrMs = GameSettings.getARRms();

        const execARR = () => {
            if (arrMs === 0) {
                if (dir === 'left') {
                    while (
                        this.board.isValid(
                            this.currentPiece.currentShape(),
                            this.currentPiece.x - 1,
                            this.currentPiece.y,
                        )
                    ) {
                        this.currentPiece.x--;
                        this.lastRotated = false;
                        this._resetLockIfOnGround();
                    }
                }
                if (dir === 'right') {
                    while (
                        this.board.isValid(
                            this.currentPiece.currentShape(),
                            this.currentPiece.x + 1,
                            this.currentPiece.y,
                        )
                    ) {
                        this.currentPiece.x++;
                        this.lastRotated = false;
                        this._resetLockIfOnGround();
                    }
                }
                if (dir === 'down') this._softDrop(true);
                this._render();
            } else {
                this.arrTimer = setInterval(() => {
                    if (dir === 'left') this._moveLeft();
                    else if (dir === 'right') this._moveRight();
                    else if (dir === 'down') this._softDrop(true);
                    this._render();
                }, arrMs);
            }
        };

        this.dasTimer = setTimeout(() => {
            if (dcdMs > 0) {
                this.dcdTimer = setTimeout(execARR, dcdMs);
            } else {
                execARR();
            }
        }, dasMs);
    }

    _stopDAS() {
        if (this.dasTimer) {
            clearTimeout(this.dasTimer);
            this.dasTimer = null;
        }
        if (this.dcdTimer) {
            clearTimeout(this.dcdTimer);
            this.dcdTimer = null;
        }
        if (this.arrTimer) {
            clearInterval(this.arrTimer);
            this.arrTimer = null;
        }
    }
}
