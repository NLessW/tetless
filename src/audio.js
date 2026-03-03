'use strict';

// ===== TETLESS Audio Engine =====
// Web Audio API 기반 — 외부 파일 없이 모든 사운드를 코드로 생성
const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let bgmGain = null;
    let sfxGain = null;

    // 볼륨 설정 (0~1)
    let bgmVolume = 0.45;
    let sfxVolume = 0.6;
    let muted = false;

    // BGM 관련
    let bgmNodes = []; // 현재 재생 중인 BGM 오실레이터들
    let bgmPlaying = false;
    let bgmScheduleTimer = null;
    let bgmBeat = 0; // 현재 비트 인덱스
    let bgmTempo = 138; // BPM
    let bgmStartTime = 0;

    // ===== 초기화 =====
    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 1;
        masterGain.connect(ctx.destination);

        bgmGain = ctx.createGain();
        bgmGain.gain.value = bgmVolume;
        bgmGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = sfxVolume;
        sfxGain.connect(masterGain);
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // ===== 유틸 =====
    function noteToHz(note, octave) {
        // 반음 단위 note (C=0, C#=1, D=2, ... B=11)
        const A4 = 440;
        const semitone = (octave - 4) * 12 + note - 9; // A4 기준
        return A4 * Math.pow(2, semitone / 12);
    }

    // 음이름 → Hz 변환
    const NOTE = {
        C: 0,
        Cs: 1,
        D: 2,
        Ds: 3,
        E: 4,
        F: 5,
        Fs: 6,
        G: 7,
        Gs: 8,
        A: 9,
        As: 10,
        B: 11,
    };
    function n(name, oct) {
        return noteToHz(NOTE[name], oct);
    }

    // ===== 단순 음 재생 (SFX용) =====
    function playTone(
        freq,
        type,
        startTime,
        duration,
        gainVal,
        fadeOut = true
    ) {
        if (!ctx || muted) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(gainVal, startTime);
        if (fadeOut) {
            g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        } else {
            g.gain.setValueAtTime(gainVal, startTime + duration - 0.005);
            g.gain.linearRampToValueAtTime(0, startTime + duration);
        }
        osc.connect(g);
        g.connect(sfxGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    function playNoise(startTime, duration, gainVal, highpass = 800) {
        if (!ctx || muted) return;
        const bufSize = ctx.sampleRate * duration;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = highpass;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        src.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);
        src.start(startTime);
        src.stop(startTime + duration + 0.01);
    }

    // ===== 효과음 =====
    const SFX = {
        // 블록 이동
        move() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            playTone(n('G', 5), 'square', t, 0.05, 0.08);
        },

        // 회전
        rotate() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            playTone(n('B', 5), 'square', t, 0.07, 0.1);
        },

        // 하드 드롭
        hardDrop() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            // 쿵 하는 충격음
            playTone(n('C', 3), 'sawtooth', t, 0.06, 0.35);
            playTone(n('G', 2), 'sawtooth', t + 0.02, 0.07, 0.25);
            playNoise(t, 0.08, 0.3, 300);
        },

        // 소프트 드롭
        softDrop() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            playTone(n('E', 4), 'sine', t, 0.04, 0.06);
        },

        // 블록 잠금 (일반)
        lock() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            playTone(n('A', 3), 'square', t, 0.05, 0.18);
            playNoise(t, 0.06, 0.12, 1200);
        },

        // 줄 1개 제거
        clearSingle() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            [n('C', 5), n('E', 5), n('G', 5)].forEach((f, i) => {
                playTone(f, 'square', t + i * 0.04, 0.12, 0.28);
            });
            playNoise(t, 0.15, 0.25, 600);
        },

        // 줄 2~3개 제거
        clearDouble() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            [n('C', 5), n('E', 5), n('G', 5), n('C', 6)].forEach((f, i) => {
                playTone(f, 'square', t + i * 0.035, 0.14, 0.3);
            });
            playNoise(t, 0.18, 0.3, 500);
        },

        // 테트리스 (4줄)
        tetris() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            const melody = [
                n('C', 5),
                n('E', 5),
                n('G', 5),
                n('C', 6),
                n('E', 6),
                n('G', 6),
            ];
            melody.forEach((f, i) => {
                playTone(f, 'sawtooth', t + i * 0.05, 0.18, 0.35);
            });
            playNoise(t, 0.3, 0.45, 300);
        },

        // T-스핀
        tSpin() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            // 특수한 상승 아르페지오
            const melody = [
                n('D', 5),
                n('Fs', 5),
                n('A', 5),
                n('D', 6),
                n('Fs', 6),
            ];
            melody.forEach((f, i) => {
                playTone(f, 'sawtooth', t + i * 0.04, 0.16, 0.4);
            });
            playNoise(t, 0.25, 0.5, 200);
            // 반짝임 효과
            playTone(n('A', 7), 'sine', t + 0.1, 0.3, 0.2);
        },

        // T-스핀 미니
        tSpinMini() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            [n('D', 5), n('Fs', 5), n('A', 5)].forEach((f, i) => {
                playTone(f, 'square', t + i * 0.04, 0.12, 0.25);
            });
            playNoise(t, 0.15, 0.3, 400);
        },

        // 홀드
        hold() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            playTone(n('G', 4), 'sine', t, 0.06, 0.12);
            playTone(n('D', 5), 'sine', t + 0.04, 0.06, 0.12);
        },

        // 레벨업
        levelUp() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            const melody = [n('C', 5), n('E', 5), n('G', 5), n('C', 6)];
            melody.forEach((f, i) => {
                playTone(f, 'sawtooth', t + i * 0.06, 0.14, 0.5);
            });
        },

        // 게임 오버
        gameOver() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            const melody = [
                n('G', 5),
                n('E', 5),
                n('C', 5),
                n('G', 4),
                n('E', 4),
                n('C', 4),
            ];
            melody.forEach((f, i) => {
                playTone(f, 'sawtooth', t + i * 0.12, 0.18, 0.4);
            });
        },

        // 40라인 클리어
        gameComplete() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            // 팡파르
            const fanfare = [
                n('C', 5),
                n('C', 5),
                n('C', 5),
                n('C', 5),
                n('G', 5),
                n('G', 5),
                n('G', 5),
                n('G', 5),
                n('A', 5),
                n('B', 5),
                n('C', 6),
                n('C', 6),
            ];
            fanfare.forEach((f, i) => {
                playTone(f, 'sawtooth', t + i * 0.09, 0.14, 0.55);
            });
        },

        // 콤보
        combo(count) {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            const baseFreq = n('C', 5) * Math.pow(1.05, count);
            playTone(
                baseFreq,
                'square',
                t,
                0.1,
                Math.min(0.2 + count * 0.03, 0.5)
            );
        },

        // 메뉴 클릭
        menuClick() {
            if (!ctx || muted) return;
            resume();
            const t = ctx.currentTime;
            playTone(n('G', 5), 'sine', t, 0.06, 0.15);
            playTone(n('B', 5), 'sine', t + 0.04, 0.06, 0.15);
        },
    };

    // ===== BGM — Korobeiniki (코로베이니키 / 테트리스 테마) =====
    // 멜로디를 [note이름, octave, 박자] 배열로 정의
    // 박자: 1=4분음표, 0.5=8분음표, 1.5=부점4분음표, 2=2분음표
    const BGM_MELODY_A = [
        // 마디 1
        ['E', 5, 1],
        ['B', 4, 0.5],
        ['C', 5, 0.5],
        ['D', 5, 1],
        ['C', 5, 0.5],
        ['B', 4, 0.5],
        // 마디 2
        ['A', 4, 1],
        ['A', 4, 0.5],
        ['C', 5, 0.5],
        ['E', 5, 1],
        ['D', 5, 0.5],
        ['C', 5, 0.5],
        // 마디 3
        ['B', 4, 1.5],
        ['C', 5, 0.5],
        ['D', 5, 1],
        ['E', 5, 1],
        // 마디 4
        ['C', 5, 1],
        ['A', 4, 1],
        ['A', 4, 2],
        // 마디 5
        ['D', 5, 1.5],
        ['F', 5, 0.5],
        ['A', 5, 1],
        ['G', 5, 0.5],
        ['F', 5, 0.5],
        // 마디 6
        ['E', 5, 1.5],
        ['C', 5, 0.5],
        ['E', 5, 1],
        ['D', 5, 0.5],
        ['C', 5, 0.5],
        // 마디 7
        ['B', 4, 1],
        ['B', 4, 0.5],
        ['C', 5, 0.5],
        ['D', 5, 1],
        ['E', 5, 1],
        // 마디 8
        ['C', 5, 1],
        ['A', 4, 1],
        ['A', 4, 2],
    ];

    const BGM_MELODY_B = [
        // 마디 9
        ['E', 5, 2],
        ['C', 5, 2],
        // 마디 10
        ['D', 5, 2],
        ['B', 4, 2],
        // 마디 11
        ['C', 5, 2],
        ['A', 4, 2],
        // 마디 12
        ['Gs', 4, 2],
        ['B', 4, 2],
        // 마디 13
        ['E', 5, 2],
        ['C', 5, 2],
        // 마디 14
        ['D', 5, 2],
        ['B', 4, 2],
        // 마디 15
        ['C', 5, 1],
        ['E', 5, 1],
        ['A', 5, 2],
        // 마디 16
        ['Gs', 5, 4],
    ];

    // 베이스라인
    const BGM_BASS_A = [
        ['A', 2, 1],
        ['E', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
        ['G', 2, 1],
        ['D', 3, 1],
        ['G', 2, 1],
        ['D', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
        ['F', 2, 1],
        ['C', 3, 1],
        ['F', 2, 1],
        ['C', 3, 1],
        ['C', 2, 1],
        ['G', 3, 1],
        ['C', 2, 1],
        ['G', 3, 1],
        ['G', 2, 1],
        ['D', 3, 1],
        ['G', 2, 1],
        ['D', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
        ['A', 2, 1],
        ['E', 3, 1],
    ];

    const BGM_BASS_B = [
        ['A', 2, 2],
        ['A', 2, 2],
        ['G', 2, 2],
        ['G', 2, 2],
        ['F', 2, 2],
        ['F', 2, 2],
        ['E', 2, 2],
        ['E', 2, 2],
        ['A', 2, 2],
        ['A', 2, 2],
        ['G', 2, 2],
        ['G', 2, 2],
        ['F', 2, 2],
        ['F', 2, 2],
        ['E', 2, 2],
        ['E', 2, 2],
    ];

    function scheduleSequence(notes, startTime, tempo, type, gainVal, isBass) {
        const beatDur = 60 / tempo;
        let t = startTime;
        const oscs = [];
        notes.forEach(([noteName, oct, beats]) => {
            const freq = n(noteName, oct);
            const dur = beats * beatDur;
            if (!muted) {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const env = ctx.createGain();
                osc.type = type;
                osc.frequency.value = freq;

                // 피치 글리드 (베이스는 부드럽게)
                if (isBass) {
                    osc.frequency.setValueAtTime(freq * 0.98, t);
                    osc.frequency.linearRampToValueAtTime(freq, t + 0.02);
                }

                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(gainVal, t + 0.01);
                g.gain.setValueAtTime(gainVal, t + dur * 0.75);
                g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);

                osc.connect(g);
                g.connect(bgmGain);
                osc.start(t);
                osc.stop(t + dur + 0.05);
                oscs.push(osc);
            }
            t += dur;
        });
        return { oscs, endTime: t };
    }

    // 타악기 패턴 (킥 + 스네어 + 하이햇)
    function schedulePercussion(startTime, tempo, bars) {
        if (muted) return;
        const beatDur = 60 / tempo;
        const barDur = beatDur * 4;
        for (let b = 0; b < bars; b++) {
            const barStart = startTime + b * barDur;
            for (let beat = 0; beat < 4; beat++) {
                const t = barStart + beat * beatDur;
                // 킥 (박자 1, 3)
                if (beat === 0 || beat === 2) {
                    playPercKick(t);
                }
                // 스네어 (박자 2, 4)
                if (beat === 1 || beat === 3) {
                    playPercSnare(t);
                }
                // 하이햇 (8분음표마다)
                playPercHihat(t);
                playPercHihat(t + beatDur * 0.5);
            }
        }
    }

    function playPercKick(t) {
        if (!ctx || muted) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        g.gain.setValueAtTime(0.6, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g);
        g.connect(bgmGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    function playPercSnare(t) {
        if (!ctx || muted) return;
        // 화이트 노이즈 스네어
        const bufSize = Math.floor(ctx.sampleRate * 0.12);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        src.connect(filter);
        filter.connect(g);
        g.connect(bgmGain);
        src.start(t);
        src.stop(t + 0.15);
    }

    function playPercHihat(t) {
        if (!ctx || muted) return;
        const bufSize = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(filter);
        filter.connect(g);
        g.connect(bgmGain);
        src.start(t);
        src.stop(t + 0.05);
    }

    // ===== BGM 루프 스케줄러 =====
    function scheduleBGMLoop(startTime) {
        if (!bgmPlaying || muted) return;

        const tempo = bgmTempo;
        const beatDur = 60 / tempo;

        // 파트 A (8마디) + 파트 B (8마디)
        const melA = scheduleSequence(
            BGM_MELODY_A,
            startTime,
            tempo,
            'square',
            0.22,
            false
        );
        scheduleSequence(BGM_BASS_A, startTime, tempo, 'triangle', 0.28, true);
        schedulePercussion(startTime, tempo, 8);

        const partBStart = melA.endTime;
        const melB = scheduleSequence(
            BGM_MELODY_B,
            partBStart,
            tempo,
            'square',
            0.22,
            false
        );
        scheduleSequence(BGM_BASS_B, partBStart, tempo, 'triangle', 0.28, true);
        schedulePercussion(partBStart, tempo, 8);

        const loopEnd = melB.endTime;
        const lookahead = loopEnd - ctx.currentTime - 0.5;

        bgmScheduleTimer = setTimeout(() => {
            if (bgmPlaying) scheduleBGMLoop(loopEnd);
        }, Math.max(0, lookahead * 1000));
    }

    // ===== BGM 제어 =====
    const BGM = {
        play() {
            if (bgmPlaying) return;
            init();
            resume();
            bgmPlaying = true;
            scheduleBGMLoop(ctx.currentTime + 0.1);
        },

        stop() {
            bgmPlaying = false;
            if (bgmScheduleTimer) {
                clearTimeout(bgmScheduleTimer);
                bgmScheduleTimer = null;
            }
            // GainNode를 통해 부드럽게 페이드아웃
            if (bgmGain) {
                bgmGain.gain.setValueAtTime(
                    bgmGain.gain.value,
                    ctx.currentTime
                );
                bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
                setTimeout(() => {
                    if (bgmGain) bgmGain.gain.value = bgmVolume;
                }, 400);
            }
        },

        setTempo(bpm) {
            bgmTempo = bpm;
        },

        // 레벨에 따라 템포 조정
        updateTempo(level) {
            const base = 138;
            const newTempo = Math.min(base + (level - 1) * 4, 220);
            bgmTempo = newTempo;
        },
    };

    // ===== 볼륨 / 뮤트 제어 =====
    function setBgmVolume(vol) {
        bgmVolume = Math.max(0, Math.min(1, vol));
        if (bgmGain) bgmGain.gain.value = muted ? 0 : bgmVolume;
    }

    function setSfxVolume(vol) {
        sfxVolume = Math.max(0, Math.min(1, vol));
        if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxVolume;
    }

    function toggleMute() {
        muted = !muted;
        if (masterGain) masterGain.gain.value = muted ? 0 : 1;
        return muted;
    }

    function isMuted() {
        return muted;
    }

    return {
        init,
        resume,
        SFX,
        BGM,
        setBgmVolume,
        setSfxVolume,
        toggleMute,
        isMuted,
    };
})();
