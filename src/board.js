'use strict';

// ===== 보드 =====
// 책임: 그리드 상태 관리, 유효성 검사, 라인 클리어
class Board {
    constructor() {
        this.grid = this._emptyGrid();
    }

    _emptyGrid() {
        return Array.from({ length: ROWS + HIDDEN_ROWS }, () =>
            Array(COLS).fill(0)
        );
    }

    reset() {
        this.grid = this._emptyGrid();
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
                if (ny >= 0) this.grid[ny][nx] = piece.type;
            }
        }
    }

    clearLines() {
        let clearedCount = 0;
        for (let r = ROWS + HIDDEN_ROWS - 1; r >= 0; r--) {
            if (this.grid[r].every((c) => c !== 0)) {
                this.grid.splice(r, 1);
                this.grid.unshift(Array(COLS).fill(0));
                clearedCount++;
                r++; // splice 후 같은 r 위치 재검사
            }
        }
        return clearedCount;
    }

    isPerfectClear() {
        return this.grid.every((row) => row.every((c) => c === 0));
    }

    isGameOver(piece) {
        return !this.isValid(piece.currentShape(), piece.x, piece.y);
    }
}
