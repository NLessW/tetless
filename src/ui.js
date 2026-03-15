'use strict';

// ===== UI 컨트롤러 =====
// 책임: 화면 전환, 버튼 이벤트 바인딩, 옵션 모달, 모바일 스케일, 초기화
// (게임 로직·오디오·인증 등과 무관한 DOM 조작만 담당)

const game = new TetrisGame();
const battleManager = new BattleManager(game);
let currentMode = null;
let currentBattleLevel = 1;

// ===== 화면 전환 =====
function showScreen(id) {
    document
        .querySelectorAll('.screen')
        .forEach((s) => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const mc = document.getElementById('mobile-controls');
    if (mc) mc.classList.toggle('visible', id === 'game-screen');
}

// ===== 메인 UI (로그인 상태) =====
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

// ===== 게임 시작 =====
function startGame(mode) {
    currentMode = mode;
    showScreen('game-screen');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    AudioEngine.init();
    AudioEngine.BGM.stop();
    AudioEngine.BGM.play();
    battleManager.stop();
    game.start(mode, { battleEnabled: false });
    game._renderHold();
    game._renderNext();
}

function startBattle(level) {
    currentMode = 'battle';
    currentBattleLevel = level;
    showScreen('game-screen');
    document.getElementById('game-over-overlay').classList.add('hidden');
    document.getElementById('pause-overlay').classList.add('hidden');
    AudioEngine.init();
    AudioEngine.BGM.stop();
    AudioEngine.BGM.play();
    battleManager.start(level);
    game._renderHold();
    game._renderNext();
}

// ===== 뮤트 버튼 =====
function updateMuteButtons() {
    const muted = AudioEngine.isMuted();
    const label = muted ? '🔇 없음' : '🔊 소리';
    document.getElementById('btn-mute-main').textContent = label;
    const bm = document.getElementById('btn-mute-m');
    if (bm) bm.textContent = label;
    const optBtn = document.getElementById('btn-mute-opt');
    if (optBtn) optBtn.textContent = label;
}

// ===== 게임 시작 버튼 =====
document
    .getElementById('btn-40line')
    .addEventListener('click', () => startGame('40line'));
document
    .getElementById('btn-infinity')
    .addEventListener('click', () => startGame('infinity'));
document.getElementById('btn-battle').addEventListener('click', () => {
    const raw = window.prompt('배틀 난이도를 선택하세요 (1, 2, 3)', '1');
    const level = Number(raw);
    if (![1, 2, 3].includes(level)) return;
    startBattle(level);
});

// ===== 게임 오버 오버레이 =====
document.getElementById('btn-retry').addEventListener('click', () => {
    document.getElementById('game-over-overlay').classList.add('hidden');
    game._stopDAS();
    if (currentMode === 'battle') {
        startBattle(currentBattleLevel);
    } else {
        startGame(currentMode);
    }
});

document.getElementById('btn-menu').addEventListener('click', () => {
    if (game.rafId) cancelAnimationFrame(game.rafId);
    clearInterval(game.timerInterval);
    game._stopDAS();
    battleManager.stop();
    AudioEngine.BGM.stop();
    document.getElementById('game-over-overlay').classList.add('hidden');
    showScreen('main-screen');
});

// ===== 볼륨 슬라이더 (메인 화면) =====
document.getElementById('vol-bgm').addEventListener('input', (e) => {
    AudioEngine.setBgmVolume(e.target.value / 100);
});
document.getElementById('vol-sfx').addEventListener('input', (e) => {
    AudioEngine.setSfxVolume(e.target.value / 100);
});

// ===== 뮤트 버튼 (메인) =====
document.getElementById('btn-mute-main').addEventListener('click', () => {
    AudioEngine.init();
    AudioEngine.toggleMute();
    updateMuteButtons();
});

// ===== 모바일 네비 버튼 =====
const _backAction = () => {
    if (game.rafId) cancelAnimationFrame(game.rafId);
    clearInterval(game.timerInterval);
    game._stopDAS();
    battleManager.stop();
    AudioEngine.BGM.stop();
    showScreen('main-screen');
};

document.getElementById('btn-back-m').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    AudioEngine.SFX.menuClick();
    _backAction();
});
document.getElementById('btn-mute-m').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    AudioEngine.toggleMute();
    updateMuteButtons();
});
document.getElementById('btn-pause-m').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (game.paused) game._resume();
    else game._pause();
});

// ===== 일시정지 오버레이 버튼 =====
document
    .getElementById('btn-resume')
    .addEventListener('click', () => game._resume());

document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
    game.paused = false;
    game._stopDAS();
    if (currentMode === 'battle') {
        startBattle(currentBattleLevel);
    } else {
        startGame(currentMode);
    }
});

document.getElementById('btn-to-main').addEventListener('click', () => {
    document.getElementById('pause-overlay').classList.add('hidden');
    game.paused = false;
    if (game.rafId) cancelAnimationFrame(game.rafId);
    clearInterval(game.timerInterval);
    game._stopDAS();
    battleManager.stop();
    AudioEngine.BGM.stop();
    showScreen('main-screen');
});

// ===== M키 단축키 =====
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !game.gameOver) {
        AudioEngine.toggleMute();
        updateMuteButtons();
    }
});

// ===== 메뉴 버튼 효과음 =====
[
    'btn-40line',
    'btn-infinity',
    'btn-battle',
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

// ===== 로그인 모달 =====
document.getElementById('btn-login').addEventListener('click', () => {
    alert('준비중입니다.');
});
document.getElementById('btn-close-modal').addEventListener('click', () => {
    alert('준비중입니다.');
});
document
    .querySelector('#login-modal .modal-backdrop')
    ?.addEventListener('click', () => {
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

// 엔터키
document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-do-login').click();
});
document.getElementById('signup-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-do-signup').click();
});

// ===== 옵션 모달 =====
function sdfLabel(idx) {
    return SDF_LABELS[idx];
}
function arrLabel(v) {
    return v === 0 ? '0 (즉시)' : String(v);
}
function dasLabel(v) {
    return String(v);
}
function dcdLabel(v) {
    return v === 0 ? '0 (없음)' : String(v);
}

function syncOptionUI() {
    const s = GameSettings.current;
    document.getElementById('opt-arr').value = s.arr;
    document.getElementById('opt-das').value = s.das;
    document.getElementById('opt-dcd').value = s.dcd;
    document.getElementById('opt-sdf').value = s.sdf;
    document.getElementById('arr-val-display').textContent = arrLabel(s.arr);
    document.getElementById('das-val-display').textContent = dasLabel(s.das);
    document.getElementById('dcd-val-display').textContent = dcdLabel(s.dcd);
    document.getElementById('sdf-val-display').textContent = sdfLabel(s.sdf);

    const bgmVol = Math.round(AudioEngine.getBgmVolume() * 100);
    const sfxVol = Math.round(AudioEngine.getSfxVolume() * 100);
    document.getElementById('vol-bgm-opt').value = bgmVol;
    document.getElementById('vol-sfx-opt').value = sfxVol;
    document.getElementById('vol-bgm-num').textContent = bgmVol;
    document.getElementById('vol-sfx-num').textContent = sfxVol;
    updateMuteButtons();
}

function openOptionModal() {
    syncOptionUI();
    document.getElementById('option-modal').classList.remove('hidden');
}
function closeOptionModal() {
    document.getElementById('option-modal').classList.add('hidden');
}

document
    .getElementById('btn-option-main')
    .addEventListener('click', openOptionModal);
document
    .getElementById('btn-option-game')
    ?.addEventListener('click', openOptionModal);
document
    .getElementById('btn-close-option')
    .addEventListener('click', closeOptionModal);
document
    .getElementById('option-backdrop')
    .addEventListener('click', closeOptionModal);

// 슬라이더 실시간 반영
document.getElementById('opt-arr').addEventListener('input', (e) => {
    const v = +e.target.value;
    GameSettings.current.arr = v;
    document.getElementById('arr-val-display').textContent = arrLabel(v);
});
document.getElementById('opt-das').addEventListener('input', (e) => {
    const v = +e.target.value;
    GameSettings.current.das = v;
    document.getElementById('das-val-display').textContent = dasLabel(v);
});
document.getElementById('opt-dcd').addEventListener('input', (e) => {
    const v = +e.target.value;
    GameSettings.current.dcd = v;
    document.getElementById('dcd-val-display').textContent = dcdLabel(v);
});
document.getElementById('opt-sdf').addEventListener('input', (e) => {
    const v = +e.target.value;
    GameSettings.current.sdf = v;
    document.getElementById('sdf-val-display').textContent = sdfLabel(v);
});

// 옵션 볼륨 슬라이더
document.getElementById('vol-bgm-opt').addEventListener('input', (e) => {
    AudioEngine.setBgmVolume(e.target.value / 100);
    document.getElementById('vol-bgm-num').textContent = e.target.value;
    const el = document.getElementById('vol-bgm');
    if (el) el.value = e.target.value;
});
document.getElementById('vol-sfx-opt').addEventListener('input', (e) => {
    AudioEngine.setSfxVolume(e.target.value / 100);
    document.getElementById('vol-sfx-num').textContent = e.target.value;
    const el = document.getElementById('vol-sfx');
    if (el) el.value = e.target.value;
});

// 옵션 뮤트 버튼
document.getElementById('btn-mute-opt').addEventListener('click', () => {
    AudioEngine.toggleMute();
    updateMuteButtons();
});

// 저장 버튼
document.getElementById('btn-option-save').addEventListener('click', () => {
    GameSettings.current.arr = +document.getElementById('opt-arr').value;
    GameSettings.current.das = +document.getElementById('opt-das').value;
    GameSettings.current.dcd = +document.getElementById('opt-dcd').value;
    GameSettings.current.sdf = +document.getElementById('opt-sdf').value;
    GameSettings.save();
    closeOptionModal();
    const btn = document.getElementById('btn-option-save');
    btn.textContent = '✓ 저장됨';
    btn.style.background = 'linear-gradient(135deg, #1a6b3a, #116633)';
    setTimeout(() => {
        btn.textContent = '저장';
        btn.style.background = '';
    }, 1200);
});

// ===== 모바일 게임 레이아웃 자동 스케일 =====
function applyGameScale() {
    const IS_MOBILE =
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(hover: none)').matches ||
        window.innerWidth <= 768;

    const resetIds = ['game-canvas', 'hold-canvas', 'next-canvas'];
    if (!IS_MOBILE) {
        resetIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.width = '';
                el.style.height = '';
            }
        });
        document.querySelectorAll('.side-panel').forEach((p) => {
            p.style.width = '';
        });
        const layout = document.querySelector('.game-layout');
        if (layout) {
            layout.style.gap = '';
            layout.style.padding = '';
        }
        return;
    }

    const SIDE_W = 90;
    const CANVAS_W = 240,
        CANVAS_H = 480;
    const HOLD_W = 80,
        HOLD_H = 80;
    const NEXT_W = 90,
        NEXT_H = 380;
    const GAP = 8,
        PAD = 8;
    const LAYOUT_W = PAD + SIDE_W + GAP + CANVAS_W + GAP + SIDE_W + PAD;
    const LAYOUT_H = CANVAS_H + PAD * 2;
    const CONTROLS_H = 175;
    const SAFE_V = 16;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleW = vw / LAYOUT_W;
    const scaleH = (vh - CONTROLS_H - SAFE_V) / LAYOUT_H;
    const scale = Math.min(scaleW, scaleH, 1.0);
    const s = (v) => Math.round(v * scale) + 'px';

    const gc = document.getElementById('game-canvas');
    if (gc) {
        gc.style.width = s(CANVAS_W);
        gc.style.height = s(CANVAS_H);
    }
    const hc = document.getElementById('hold-canvas');
    if (hc) {
        hc.style.width = s(HOLD_W);
        hc.style.height = s(HOLD_H);
    }
    const nc = document.getElementById('next-canvas');
    if (nc) {
        nc.style.width = s(NEXT_W);
        nc.style.height = s(NEXT_H);
    }

    document.querySelectorAll('.side-panel').forEach((p) => {
        p.style.width = s(SIDE_W);
    });
    const layout = document.querySelector('.game-layout');
    if (layout) {
        layout.style.gap = s(GAP);
        layout.style.padding = s(PAD);
    }
}

// ===== 초기화 =====
GameSettings.load();
updateMainUI();
applyGameScale();
window.addEventListener('resize', applyGameScale);
showScreen('main-screen');
