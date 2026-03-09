# TETLESS

> 외부 라이브러리·음원 파일 없이 순수 Vanilla JS + Web Audio API로 구현한 테트리스 클론

![Version](https://img.shields.io/badge/version-demo-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 목차

- [기능](#기능)
- [조작법](#조작법)
- [프로젝트 구조](#프로젝트-구조)
- [실행 방법](#실행-방법)
- [기술 스택](#기술-스택)

---

## 기능

### 게임 플레이
- **40 LINE 모드** — 40줄 클리어 타임어택
- **INFINITY 모드** — 점수 무한 도전 오리지널 테트리스
- **SRS 회전 시스템** — Guideline 표준 슈퍼 로테이션 시스템 + 180° 회전
- **T-스핀** — 4-코너 룰 기반 T-스핀 / 미니 T-스핀 완전 지원
- **7-Bag 랜덤** — 편향 없는 공정한 피스 순서
- **고스트 피스** — 낙하 위치 미리보기
- **홀드** — 피스 보관 및 교환
- **넥스트 4개** 미리보기
- **Back-to-Back** 보너스 (테트리스 / T-스핀 연속 시)
- **콤보** 보너스
- **퍼펙트 클리어** 보너스
- **Lock Delay** — 500ms / 최대 15회 이동

### 감도 설정 (옵션 모달)
| 항목 | 범위 | 설명 |
|------|------|------|
| ARR | 0 ~ 5 | 자동 반복 속도 (0 = 즉시 벽까지) |
| DAS | 1 ~ 20 | 처음 키 입력 후 반복 시작 딜레이 |
| DCD | 0 ~ 20 | DAS 완료 후 ARR 시작 전 추가 딜레이 |
| SDF | 5× ~ ∞ | 소프트 드롭 배율 |

### 오디오
- Web Audio API로 코드 생성한 **BGM** (코로베이니키 / 테트리스 테마, 레벨에 따라 템포 증가)
- **효과음** 완비 — 이동, 회전, 하드드롭, 잠금, 라인 클리어, T-스핀, 레벨업, 게임오버 등
- BGM / SFX 독립 볼륨 조절
- 전체 뮤트 (`M` 키 / 버튼)

### UI
- 데스크탑 + 모바일 반응형 레이아웃
- 모바일 터치 컨트롤 (DAS/ARR 지원)
- 일시정지 (3초 카운트다운 재개)
- 로그인 / 회원가입 (localStorage 기반, 준비 중)

---

## 조작법

### 키보드
| 키 | 동작 |
|----|------|
| `← / →` | 이동 |
| `↓` / `S` | 소프트 드롭 |
| `Space` | 하드 드롭 |
| `↑` / `X` | 시계 방향 회전 |
| `Z` | 반시계 방향 회전 |
| `A` | 180° 회전 |
| `C` / `Shift` | 홀드 |
| `Esc` | 일시정지 / 재개 |
| `M` | 전체 뮤트 토글 |

### 모바일
하단 터치 컨트롤 패널 사용

---

## 프로젝트 구조

```
tetless/
├── index.html          # 메인 HTML (메인화면, 게임화면, 모달)
├── css/
│   └── style.css       # 전체 스타일 (다크 테마)
└── src/
    ├── constants.js    # 게임 상수, 테트로미노 형태, SRS 월킥, 점수 테이블
    ├── board.js        # Board 클래스 — 그리드 상태 관리, 라인 클리어
    ├── piece.js        # Piece 클래스, Bag 클래스 — 피스 형태·위치, 7-bag 생성
    ├── tspin.js        # detectTSpin() — 4-코너 룰 T-스핀 판별
    ├── settings.js     # GameSettings — ARR/DAS/DCD/SDF 저장·로드
    ├── auth.js         # Auth — 회원가입·로그인·로그아웃
    ├── game.js         # TetrisGame 클래스 — 게임 루프, 입력, 렌더링
    ├── audio.js        # AudioEngine — BGM/SFX (Web Audio API)
    └── ui.js           # UI 컨트롤러 — 화면 전환, 이벤트, 옵션, 스케일
```

각 파일은 **단일 책임 원칙(SRP)** 에 따라 분리되어 있습니다.

---

## 실행 방법

별도 빌드 과정 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
# 로컬 서버로 실행 (권장 — AudioContext 정책 때문)
npx serve .
# 또는
python3 -m http.server 8080
```

이후 브라우저에서 `http://localhost:8080` 접속.

> **참고**: Web Audio API는 사용자 상호작용(클릭) 이후 활성화되므로  
> 게임 시작 버튼을 누른 뒤 BGM이 재생됩니다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 언어 | Vanilla JavaScript (ES6+) |
| 렌더링 | Canvas 2D API |
| 오디오 | Web Audio API (파일 없음, 전부 코드 생성) |
| 스타일 | CSS3 (변수, flex, grid, 애니메이션) |
| 저장소 | localStorage (설정, 유저), sessionStorage (세션) |
| 빌드 | 없음 (Zero dependency) |

---

## 라이선스

MIT
