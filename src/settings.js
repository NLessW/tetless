'use strict';

// ===== 게임 설정 =====
// 책임: ARR/DAS/DCD/SDF 값 저장·로드·조회
// ARR: 0~5  (0=즉시, 단위×16ms)
// DAS: 1~20 (단위×10ms)
// DCD: 0~20 (DAS 완료 후 추가 딜레이, 단위×5ms)
// SDF: 슬라이더 0~8 인덱스 → 배율
const SDF_MAP = [5, 6, 8, 10, 15, 20, 30, 40, Infinity];
const SDF_LABELS = ['5×', '6×', '8×', '10×', '15×', '20×', '30×', '40×', '∞'];

const GameSettings = {
    STORAGE_KEY: 'tetless_settings',

    defaults: {
        arr: 1, // 0~5
        das: 10, // 1~20
        dcd: 10, // 0~20
        sdf: 2, // 0~8
    },

    current: null,

    load() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
            this.current = saved
                ? { ...this.defaults, ...saved }
                : { ...this.defaults };
        } catch {
            this.current = { ...this.defaults };
        }
    },

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.current));
    },

    /** ARR (ms): 0이면 즉시(0ms), 아니면 값×16ms */
    getARRms() {
        return this.current.arr === 0 ? 0 : this.current.arr * 16;
    },
    /** DAS (ms): 값×10ms */
    getDASms() {
        return this.current.das * 10;
    },
    /** DCD (ms): 값×5ms */
    getDCDms() {
        return this.current.dcd * 5;
    },
    /** SDF 배율 */
    getSDFMultiplier() {
        return SDF_MAP[this.current.sdf];
    },
};
