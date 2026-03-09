'use strict';

// ===== 피스 =====
// 책임: 단일 테트로미노의 형태·위치·회전 상태 관리
class Piece {
    constructor(type) {
        this.type = type;
        this.rotation = 0;
        this.data = TETROMINOES[type];
        const shape = this.currentShape();
        this.x = Math.floor((COLS - shape[0].length) / 2);
        this.y = 0;
    }

    currentShape() {
        return this.data.shapes[this.rotation];
    }

    color() {
        return this.data.color;
    }

    clone() {
        const p = new Piece(this.type);
        p.rotation = this.rotation;
        p.x = this.x;
        p.y = this.y;
        return p;
    }
}

// ===== 7-Bag 랜덤 생성기 =====
// 책임: 공정한 피스 순서 생성 (7종 셔플 반복)
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
