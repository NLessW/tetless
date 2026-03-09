'use strict';

// ===== T-스핀 감지 =====
// 책임: 4-코너 룰 기반 T-스핀 판별 (게임 로직과 분리)
function detectTSpin(board, piece, rotated, kickIndex) {
    if (piece.type !== 'T' || !rotated) return null;

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

    if (filledCorners < 3) return null;

    // T가 향하는 방향의 앞쪽 두 코너
    const frontCorners = {
        0: [0, 1], // 위
        1: [1, 3], // 오른쪽
        2: [2, 3], // 아래
        3: [0, 2], // 왼쪽
    };
    const front = frontCorners[piece.rotation];
    const frontFilled = filled[front[0]] && filled[front[1]];

    if (!frontFilled) {
        // kickIndex >= 4 이면 정식 T-스핀으로 승격
        return kickIndex >= 4 ? 'TSPIN' : 'TSPIN_MINI';
    }
    return 'TSPIN';
}
