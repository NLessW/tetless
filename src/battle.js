'use strict';

// CPU 보드 셀 크기 (캔버스 150×300, 그리드 10×20)
const CPU_CELL = 15;

class ComputerBattleAI {
    constructor(level, hooks = {}) {
        this.level = Math.max(1, Math.min(3, level));
        this.onAttack = hooks.onAttack || null;
        this.onDefeat = hooks.onDefeat || null;
        this.onState = hooks.onState || null;

        this.board = new Board();
        this.bag = new Bag();
        this.currentPiece = null;

        this.pendingGarbage = 0;
        this.garbageHoleColumn = Math.floor(Math.random() * COLS);
        this.combo = -1;
        this.b2b = -1;
        this.gameOver = false;
        this.sentTotal = 0;

        this.timer = null;
        this.rafId = null;

        // 캔버스 참조
        this.canvas = document.getElementById('cpu-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    }

    start() {
        this.stop();
        this.board.reset();
        this.bag = new Bag();
        this.currentPiece = null;
        this.pendingGarbage = 0;
        this.combo = -1;
        this.b2b = -1;
        this.gameOver = false;
        this.sentTotal = 0;

        // 죽음 오버레이 숨기기
        const deadEl = document.getElementById('cpu-dead-overlay');
        if (deadEl) deadEl.classList.add('hidden');

        this._spawn();
        const speed = { 1: 900, 2: 470, 3: 300 }[this.level];
        this.timer = setInterval(() => this._tick(), speed);
        this._render();
        this._emitState();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    _render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const canvas = this.canvas;
        const cell = CPU_CELL;

        // 배경
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 그리드 선
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cell, 0);
            ctx.lineTo(c * cell, canvas.height);
            ctx.stroke();
        }
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * cell);
            ctx.lineTo(canvas.width, r * cell);
            ctx.stroke();
        }

        // 보드 블록 (HIDDEN_ROWS 제외하고 표시)
        const grid = this.board.grid;
        for (let r = HIDDEN_ROWS; r < ROWS + HIDDEN_ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const type = grid[r][c];
                if (!type) continue;
                const color =
                    type === 'GARBAGE' ? COLORS.GARBAGE : COLORS[type];
                const drawR = r - HIDDEN_ROWS;
                ctx.fillStyle = color;
                ctx.fillRect(
                    c * cell + 1,
                    drawR * cell + 1,
                    cell - 2,
                    cell - 2,
                );
                // 하이라이트
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(c * cell + 1, drawR * cell + 1, cell - 2, 3);
            }
        }

        // 현재 피스 (ghost 포함)
        if (this.currentPiece && !this.gameOver) {
            const piece = this.currentPiece;
            const shape =
                piece.data.shapes[piece.rotation % piece.data.shapes.length];
            const color = COLORS[piece.type];

            // ghost
            const ghostY = this._findDropY(grid, shape, piece.x);
            if (ghostY !== null) {
                ctx.fillStyle = 'rgba(255,255,255,0.10)';
                for (let r = 0; r < shape.length; r++) {
                    for (let c = 0; c < shape[r].length; c++) {
                        if (!shape[r][c]) continue;
                        const dr = ghostY + r - HIDDEN_ROWS;
                        if (dr < 0) continue;
                        ctx.fillRect(
                            piece.x * cell + c * cell + 1,
                            dr * cell + 1,
                            cell - 2,
                            cell - 2,
                        );
                    }
                }
            }

            // 실제 피스 (y=0 기준으로 스폰되므로 현재 위치는 grid 맨 위)
            ctx.fillStyle = color;
            const spawnY = -HIDDEN_ROWS; // 현재 피스는 항상 최상단에 스폰 대기
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue;
                    // AI는 _tick에서 바로 락하므로 보드에 반영된 상태가 진실
                    // 여기선 현재 피스 위치를 ghost 위치(=최하단)에 그림
                    if (ghostY === null) continue;
                    const dr = ghostY + r - HIDDEN_ROWS;
                    if (dr < 0) continue;
                    ctx.fillRect(
                        piece.x * cell + c * cell + 1,
                        dr * cell + 1,
                        cell - 2,
                        cell - 2,
                    );
                    ctx.fillStyle = 'rgba(255,255,255,0.18)';
                    ctx.fillRect(
                        piece.x * cell + c * cell + 1,
                        dr * cell + 1,
                        cell - 2,
                        3,
                    );
                    ctx.fillStyle = color;
                }
            }
        }

        // garbage incoming bar (왼쪽 빨간 바)
        if (this.pendingGarbage > 0) {
            const barH = Math.min(this.pendingGarbage * cell, canvas.height);
            ctx.fillStyle = 'rgba(255,60,60,0.75)';
            ctx.fillRect(0, canvas.height - barH, 4, barH);
        }

        if (!this.gameOver) {
            this.rafId = requestAnimationFrame(() => this._render());
        }
    }

    receiveGarbage(lines) {
        if (this.gameOver || !lines || lines <= 0) return;
        this.pendingGarbage += lines;
        this._emitState();
    }

    _spawn() {
        const type = this.bag.next();
        this.currentPiece = new Piece(type);
        if (
            !this.board.isValid(
                this.currentPiece.currentShape(),
                this.currentPiece.x,
                this.currentPiece.y,
            )
        ) {
            this.gameOver = true;
            this.stop();
            if (this.onDefeat) this.onDefeat();
        }
    }

    _tick() {
        if (this.gameOver) return;
        if (!this.currentPiece) this._spawn();
        if (this.gameOver) return;

        const best = this._pickBestPlacement();
        if (!best) {
            this.gameOver = true;
            this.stop();
            if (this.onDefeat) this.onDefeat();
            return;
        }

        const { gridAfter, cleared } = this._lockSimulation(best);
        this.board.grid = gridAfter;

        let tSpinType = null;
        if (this.level >= 3 && this.currentPiece.type === 'T' && cleared > 0) {
            if (Math.random() < 0.45) tSpinType = 'TSPIN';
        }

        const isTSpin = tSpinType === 'TSPIN';
        const isTetris = cleared === 4;
        const isB2B = isTSpin || isTetris;
        if (isB2B && cleared > 0) {
            this.b2b = this.b2b >= 0 ? this.b2b + 1 : 0;
        } else if (cleared > 0) {
            this.b2b = -1;
        }

        if (cleared > 0) this.combo++;
        else this.combo = -1;

        let attack = computeTetrioAttack({
            cleared,
            tSpinType,
            b2bChain: Math.max(0, this.b2b),
            combo: this.combo,
            perfectClear: false,
        });

        if (this.level === 1) attack = Math.max(0, Math.floor(attack * 0.55));

        if (attack > 0 && this.pendingGarbage > 0) {
            const canceled = Math.min(attack, this.pendingGarbage);
            attack -= canceled;
            this.pendingGarbage -= canceled;
        }

        if (cleared === 0 && this.pendingGarbage > 0) {
            const rise = Math.min(4, this.pendingGarbage);
            this.pendingGarbage -= rise;
            this._applyGarbage(rise);
        }

        if (attack > 0 && this.onAttack) {
            this.sentTotal += attack;
            this.onAttack(attack);
        }

        if (!this.gameOver) {
            this._spawn();
        }

        this._emitState();
    }

    _applyGarbage(lines) {
        for (let i = 0; i < lines; i++) {
            if (this.board.grid[0].some((c) => c !== 0)) {
                this.gameOver = true;
                this.stop();
                if (this.onDefeat) this.onDefeat();
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

    _pickBestPlacement() {
        const piece = this.currentPiece;
        const candidates = [];

        for (let rot = 0; rot < 4; rot++) {
            const shape = piece.data.shapes[rot];
            for (let x = -2; x < COLS + 2; x++) {
                const y = this._findDropY(this.board.grid, shape, x);
                if (y === null) continue;

                const cloned = this._cloneGrid(this.board.grid);
                this._placeOnGrid(cloned, shape, x, y, piece.type);
                const cleared = this._clearLinesOnGrid(cloned);
                const score = this._evaluate(cloned, cleared, piece.type, rot);
                candidates.push({ x, y, rot, score, cleared });
            }
        }

        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0];
    }

    _evaluate(grid, cleared, pieceType, rotation) {
        const heights = this._columnHeights(grid);
        const totalHeight = heights.reduce((a, b) => a + b, 0);
        const bumpiness = heights
            .slice(1)
            .reduce((sum, h, i) => sum + Math.abs(h - heights[i]), 0);
        const holes = this._countHoles(grid);

        let score = 0;

        if (this.level === 1) {
            score += cleared * 2.2;
            score -= totalHeight * 0.35;
            score -= holes * 2.0;
            score -= bumpiness * 0.25;
            score += Math.random() * 3.5;
            return score;
        }

        const wellDepth = this._wellDepth(heights, 9);

        if (this.level === 2) {
            score += cleared * 2.0;
            if (cleared === 4) score += 30;
            if (cleared === 3) score += 6;
            score += wellDepth * 1.6;
            score -= totalHeight * 0.45;
            score -= holes * 2.8;
            score -= bumpiness * 0.35;
            return score;
        }

        score += cleared * 2.0;
        if (cleared === 4) score += 22;
        if (pieceType === 'T') score += 2.5;
        if (pieceType === 'T' && cleared >= 1) score += 8;
        if (pieceType === 'T' && rotation !== 0) score += 1.2;
        score += wellDepth * 1.2;
        score -= totalHeight * 0.5;
        score -= holes * 3.0;
        score -= bumpiness * 0.35;
        return score;
    }

    _wellDepth(heights, col) {
        if (col <= 0 || col >= COLS - 1) return 0;
        const left = heights[col - 1];
        const right = heights[col + 1];
        const self = heights[col];
        return Math.max(0, Math.min(left, right) - self);
    }

    _columnHeights(grid) {
        const heights = Array(COLS).fill(0);
        for (let c = 0; c < COLS; c++) {
            let h = 0;
            for (let r = 0; r < ROWS + HIDDEN_ROWS; r++) {
                if (grid[r][c] !== 0) {
                    h = ROWS + HIDDEN_ROWS - r;
                    break;
                }
            }
            heights[c] = h;
        }
        return heights;
    }

    _countHoles(grid) {
        let holes = 0;
        for (let c = 0; c < COLS; c++) {
            let foundBlock = false;
            for (let r = 0; r < ROWS + HIDDEN_ROWS; r++) {
                if (grid[r][c] !== 0) foundBlock = true;
                else if (foundBlock) holes++;
            }
        }
        return holes;
    }

    _lockSimulation(move) {
        const piece = this.currentPiece;
        const shape = piece.data.shapes[move.rot];
        const grid = this._cloneGrid(this.board.grid);
        this._placeOnGrid(grid, shape, move.x, move.y, piece.type);
        const cleared = this._clearLinesOnGrid(grid);
        return { gridAfter: grid, cleared };
    }

    _cloneGrid(grid) {
        return grid.map((row) => [...row]);
    }

    _findDropY(grid, shape, x) {
        let y = -4;
        while (this._isValidOnGrid(grid, shape, x, y + 1)) y++;
        if (!this._isValidOnGrid(grid, shape, x, y)) return null;
        return y;
    }

    _isValidOnGrid(grid, shape, offsetX, offsetY) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = offsetX + c;
                const ny = offsetY + r;
                if (nx < 0 || nx >= COLS) return false;
                if (ny >= ROWS + HIDDEN_ROWS) return false;
                if (ny >= 0 && grid[ny][nx] !== 0) return false;
            }
        }
        return true;
    }

    _placeOnGrid(grid, shape, x, y, type) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const ny = y + r;
                const nx = x + c;
                if (
                    ny >= 0 &&
                    ny < ROWS + HIDDEN_ROWS &&
                    nx >= 0 &&
                    nx < COLS
                ) {
                    grid[ny][nx] = type;
                }
            }
        }
    }

    _clearLinesOnGrid(grid) {
        let cleared = 0;
        for (let r = ROWS + HIDDEN_ROWS - 1; r >= 0; r--) {
            if (grid[r].every((c) => c !== 0)) {
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(0));
                cleared++;
                r++;
            }
        }
        return cleared;
    }

    _emitState() {
        if (!this.onState) return;
        this.onState({
            pendingGarbage: this.pendingGarbage,
            sentTotal: this.sentTotal,
            alive: !this.gameOver,
        });
    }
}

class BattleManager {
    constructor(game) {
        this.game = game;
        this.ai = null;
        this.level = 1;
        this.active = false;
    }

    start(level = 1) {
        this.stop();
        this.level = Math.max(1, Math.min(3, level));
        this.active = true;

        // 배틀 패널 표시
        const panel = document.getElementById('battle-panel');
        if (panel) panel.classList.remove('hidden');

        this.ai = new ComputerBattleAI(this.level, {
            onAttack: (lines) => this.game.receiveGarbage(lines),
            onDefeat: () => this._onCpuDefeat(),
            onState: (state) => this._updateBattlePanel(state),
        });

        this.game.start('battle', {
            battleEnabled: true,
            onAttack: (lines) => this.ai.receiveGarbage(lines),
            onDefeat: () => this._onPlayerDefeat(),
            onGarbageChange: (pending) => this._updatePlayerIncoming(pending),
        });

        this.ai.start();
        this._updatePlayerIncoming(0);
        this._updateBattlePanel({
            pendingGarbage: 0,
            sentTotal: 0,
            alive: true,
        });
        this._setStatus(`BATTLE LV.${this.level}`);
    }

    stop() {
        this.active = false;
        if (this.ai) {
            this.ai.stop();
            this.ai = null;
        }

        // 배틀 패널 숨김
        const panel = document.getElementById('battle-panel');
        if (panel) panel.classList.add('hidden');
        const deadEl = document.getElementById('cpu-dead-overlay');
        if (deadEl) deadEl.classList.add('hidden');

        this._setStatus('IDLE');
        this._updatePlayerIncoming(0);
        this._updateBattlePanel({
            pendingGarbage: 0,
            sentTotal: 0,
            alive: false,
        });
    }

    _onCpuDefeat() {
        if (!this.active) return;
        this.active = false;

        // CPU 죽음 오버레이
        const deadEl = document.getElementById('cpu-dead-overlay');
        if (deadEl) deadEl.classList.remove('hidden');

        this.game.gameOver = true;
        if (this.game.rafId) cancelAnimationFrame(this.game.rafId);
        clearInterval(this.game.timerInterval);
        this.game._stopDAS();

        document.getElementById('overlay-title').textContent = 'YOU WIN';
        document.getElementById('overlay-title').style.color = 'var(--success)';
        document.getElementById('overlay-score').textContent =
            `SCORE: ${this.game.score.toLocaleString()}`;
        document.getElementById('overlay-time').textContent =
            `COMPUTER DEFEATED (LV.${this.level})`;
        document.getElementById('game-over-overlay').classList.remove('hidden');

        this._setStatus('YOU WIN');
    }

    _onPlayerDefeat() {
        if (!this.active) return;
        this.active = false;
        this._setStatus('YOU LOSE');
    }

    _setStatus(text) {
        const el = document.getElementById('battle-status-display');
        if (el) el.textContent = text;
        const diffEl = document.getElementById('battle-diff-display');
        if (diffEl) diffEl.textContent = this.level;
    }

    _updatePlayerIncoming(lines) {
        const el = document.getElementById('incoming-display');
        if (el) el.textContent = lines;
    }

    _updateBattlePanel(state) {
        const cpuIncoming = document.getElementById('cpu-incoming-display');
        if (cpuIncoming) cpuIncoming.textContent = state.pendingGarbage;
        const cpuSent = document.getElementById('cpu-sent-display');
        if (cpuSent) cpuSent.textContent = state.sentTotal;
    }
}
