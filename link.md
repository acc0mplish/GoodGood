# 외부 링크 목록 (link.md)

`Argus` → `GoodGood` 일괄 치환 후, 남아 있는 외부 주소 전수 조사 결과입니다.
"연결된 것"은 그 주소를 읽는 코드/설정, "용도"는 사용자에게 무엇으로 보이는지입니다.

---

## 1. 앱이 직접 여는 주소 (런타임)

### 1.1 앱 매니페스트 — `resources/app.json`

| 주소 | 필드 | 연결된 것 | 용도 |
|---|---|---|---|
| `https://goodgoodtask.com` | `homepage` | `crates/goodgood-app/src/config.rs` (`manifest()`), `src-gpui/src/commands.rs` `open_homepage()` / `homepage()` | 설정·정보 페이지의 "홈페이지" 버튼, 설치 프로그램의 프로젝트 링크, 웹사이트 페이지 언어별 URL 조합의 기준 주소 |
| ~~`https://qm.qq.com/q/97YqJAQRNK`~~ | ~~`community.url`~~ | 제거됨: `commands.rs` `open_community()`, `frontend/pages/about.rs` 카드, `resources/app.json`의 `community` 블록 | — |
| ~~`453803497`~~ | ~~`community.group`~~ | 제거됨: 그룹 번호 표시·복사 UI | — |
| ~~`https://t.me/goodgoodtask`~~ | ~~`community.channel`~~ | 제거됨: `commands.rs` `open_channel()`, 정보 페이지 채널 카드 | — |

### 1.2 업데이터 — `src-gpui/src/updater.rs`

| 주소 | 상수 | 연결된 것 | 용도 |
|---|---|---|---|
| `https://github.com/acc0mplish/GoodGood` | `REPO` | `updater.rs` 전체, `commands.rs` `open_repository()` / `project_page()`, `frontend/pages/about.rs` (저장소 카드) | GitHub 릴리스 매니페스트·설치 파일 다운로드, Releases/Issues/Discussions 링크, 정보 페이지 저장소 카드 |
| ~~`https://update.goodgoodtask.com`~~ | ~~`OFFICIAL_FEEDS`~~ | 제거됨: 업데이터는 GitHub Releases에서만 매니페스트를 읽습니다. 주소는 웹사이트 배포(`website/scripts/release.mjs` `feedOrigin`)에만 남아 있습니다. | — |
| ~~`https://dl.goodgoodtask.com`~~ | ~~`OFFICIAL_DOWNLOADS`~~ | 제거됨: 애플리케이션은 `{REPO}/releases/download/v{version}/…`에서만 받습니다. 주소는 웹사이트 다운로드 페이지(`downloadOrigin`)에만 남아 있습니다. | — |

파생 주소(위 상수에서 조립됨):
- `{REPO}/releases/latest/download/latest.json`, `beta.json`
- `{REPO}/releases/download/v{version}/GoodGood_{version}_x64-setup.exe`
- `{REPO}/releases/tag/v{version}` — `open_release_page()`

### 1.3 다운로드 프록시 프리셋 — `crates/goodgood-app/src/config.rs`

| 주소 | 연결된 것 | 용도 |
|---|---|---|
| `https://gh-proxy.com/` | `PROXY_PRESETS`, `settings.rs` `UpdateRoute::Proxy` | 설정 ▸ 업데이트의 "GitHub 프록시" 기본값 |
| `https://gh-proxy.org/` | 위와 동일 | 내장 대체 프록시 |
| `https://ghfast.top/` | 위와 동일 | 내장 대체 프록시 |

### 1.4 기타 앱 주소

| 주소 | 위치 | 연결된 것 | 용도 |
|---|---|---|---|
| `https://pawnio.eu/` | `src-gpui/src/commands.rs:927` | `open_pawnio()` | 커널 센서(PawnIO) 안내 링크 |
| `https://goodgoodtask.com/download/` 등 | `src-gpui/src/commands.rs` `website_page()` / `project_page()` | 정보 페이지 링크 카드, 포터블 버전 안내 | 언어별 `/en/`, `/de/`, `/ja/` … + `/download/`, `/changelog/`, `/docs/guide/` |

---

## 2. 패키징 / 배포

| 주소·식별자 | 위치 | 연결된 것 | 용도 |
|---|---|---|---|
| `acc0mplish.GoodGood` | `website/scripts/distribution.mjs:62` | winget 매니페스트 생성 | `winget/manifests/a/acc0mplish/GoodGood/{version}/` 경로 |
| `https://goodgoodtask.com/download/` | `website/scripts/distribution.mjs:22` | `dl` Worker `_redirects` | 루트 → 다운로드 페이지 302 |
| `https://goodgoodtask.com/:splat` | `website/scripts/distribution.mjs:59` | `www` Worker `_redirects` | `www` → 본도메인 301 |
| `https://api.github.com/repos/acc0mplish/GoodGood/releases/latest` | `scripts/publish-beta.mjs:51` | GitHub API 호출 | 베타 릴리스 조회 |
| `https://app.signpath.io/Api/v1/...` | `scripts/signpath-preflight.mjs:14` | `SIGNPATH_ORGANIZATION_ID` 환경변수 | 코드 서명 서비스 API |
| `goodgoodtask-website-production` | `.github/workflows/website.yml:14` | concurrency 그룹 | 배포 동시성 제어 |

이메일 주소:
| 주소 | 위치 | 용도 |
|---|---|---|
| `contact@example.com` | `website/src/components/site/Footer.tsx`, `README*.md`, `PRIVACY.md` | 사이트 문의(자리 표시자) |
| `security@example.com` | `website/src/views/Policy.tsx`, `website/scripts/build.mjs`, `PRIVACY.md` | 취약점 신고(자리 표시자), `security.txt` |

---

## 3. 저장소·문서 배지 (README 계열)

| 주소 | 위치 | 용도 |
|---|---|---|
| `https://img.shields.io/github/v/release/acc0mplish/GoodGood` | 각 `README*.md` | 최신 릴리스 배지 |
| `https://img.shields.io/github/downloads/acc0mplish/GoodGood/total` | 각 `README*.md` | 다운로드 수 배지 |
| `https://github.com/acc0mplish/GoodGood/discussions/categories/q-a` | `.github/ISSUE_TEMPLATE/config.yml`, `.github/CONTRIBUTING.md` | Q&A 토론 |
| `https://github.com/acc0mplish/GoodGood/security/advisories/new` | `.github/ISSUE_TEMPLATE/config.yml`, `.github/SECURITY.md` | 비공개 취약점 신고 |
| `https://github.com/acc0mplish/GoodGood/security/policy` | `.github/ISSUE_TEMPLATE/bug_report.yml` | 보안 정책 |
| `https://github.com/acc0mplish/GoodGood/blob/main/README.md#code-signing-policy` | `.github/workflows/release.yml:176` | 서명 정책 링크 |
| `https://goodgoodtask.com/docs/guide/` | `.github/ISSUE_TEMPLATE/config.yml` | 사용 안내 |

---

## 4. 웹사이트 — `website/`

| 주소 | 위치 | 연결된 것 | 용도 |
|---|---|---|---|
| `https://goodgoodtask.com/` | `website/src/components/replica/Pages.tsx:1522` | 정보 페이지 목업 | 목업의 홈페이지 카드 |
| `https://github.com/acc0mplish/GoodGood` | `website/src/components/replica/Pages.tsx:1534` | 정보 페이지 목업 | 목업의 저장소 카드 |
| `.../issues/new/choose`, `.../discussions`, `.../releases` | `Pages.tsx:1543-1545` | 목업 버튼 | 목업의 저장소 하위 페이지 |
| `https://github.com/bronyaicu` 외 | `website/src/data/supporters.json` | 후원자 목록 | 후원자 프로필 링크 |
| `goodgoodtask.com`, `www`, `dl.`, `update.` | `docs/development/website.md` (문서) | Cloudflare Workers 4개 | 배포 설명 |

---

## 5. 번역 카탈로그에 박힌 브랜드/링크 문구

주소 자체는 없지만 특정 서비스에 묶인 문구입니다 (`locales/*/*.json`).

| 키 | 문구(영어) | 연결된 것 |
|---|---|---|
| `onboarding.github` | "Download from GitHub" | 포터블 안내 → `open_project_page` |
| `onboarding.updates.body` | "GoodGood gets new versions from GitHub Releases…" | 업데이트 안내 |
| `onboarding.updates.routeDirect` / `routeProxy` | "GitHub only" / "GitHub proxy only" | 다운로드 소스 선택 |
| `settings.update.source` | "Updates come from GitHub Releases…" | 설정 ▸ 업데이트 |
| `settings.update.route.*` | `auto` / `direct` / `proxy` | 설정 ▸ 다운로드 소스 |
| `settings.update.custom.*` | "A prefix added before GitHub URLs…" | 사용자 지정 프록시 |
| ~~`settings.about.community.*` / `channel.*`~~ | 제거됨 | 정보 페이지 카드와 함께 사라졌습니다 |
| `settings.about.star.*` | "Star GoodGood on GitHub" | GitHub 별 카드 |
| `shell.portable.github` | "Download from GitHub" | 포터블 안내 |
| `shell.star.*` | "Star on GitHub" 등 | 별 요청 카드 |
| `updates.dialog.github` / `earlier` / `empty` | "View on GitHub" 등 | 업데이트 대화상자 |

---

## 6. 소스 주석 속 외부 참고 링크 (런타임과 무관)

| 주소 | 위치 | 용도 |
|---|---|---|
| `github.com/fastfetch-cli/fastfetch/...gpu_windows.c` | `crates/goodgood-core/src/hardware/gpu/metadata.rs:37` | GPU 메타데이터 구현 참고 |
| `github.com/namazso/PawnIO.Setup/releases/download/2.2.0/...` | `crates/goodgood-service/src/driver/package.rs` | PawnIO 설치 파일 다운로드 |
| `github.com/namazso/PawnIO.Modules/releases/download/0.2.11/...` | `crates/goodgood-service/src/driver/package.rs` | PawnIO 고정 모듈 |
| `github.com/irusanov/ZenStates-Core` | `crates/goodgood-core/src/hardware/cpu/...` | Zen 상태 참고 구현 |
| `nsis.sourceforge.io`, `stackoverflow.com/a/42816728` | `packaging/windows/*.nsi`, `utils.nsh` | 설치 프로그램 기법 참고 |
| `github.com/kichik/nsis`, `github.com/tauri-apps/tauri/pull/10106` | `packaging/windows/installer-template.nsi` | NSIS 동작 근거 |
| `spdx.org/licenses/`, `rust-lang/rust/blob/master/COPYRIGHT` | `scripts/notices.mjs` | 라이선스 고지 생성 |

---

## 7. "외부 주소 싹다 삭제" 처리 결과

| 삭제 대상 | 영향 | 처리 |
|---|---|---|
| `REPO` (`github.com/acc0mplish/GoodGood`) | 업데이트 기능 전체가 이 주소를 씁니다 | **유지** — 업데이터의 유일한 소스입니다 |
| `OFFICIAL_FEEDS` / `OFFICIAL_DOWNLOADS` | 공식 미러 경로 | **제거** — `ReleaseSource`는 `GitHub`과 `Proxy(String)`만 가집니다 |
| `PROXY_PRESETS` 3개 | 프록시 경로 | **유지** — 설정 ▸ 다운로드 소스에서 계속 씁니다 |
| `community.url` / `channel` / `group` | 정보 페이지 QQ·Telegram 카드 | **제거** — 카드, 명령, 지역화 키를 함께 지웠습니다 |
| `homepage` (`goodgoodtask.com`) | 정보 페이지 홈페이지 카드, 설치 안내 링크 | **유지** — 웹사이트가 계속 운영됩니다 |
| 이메일 2개 | 사이트 문의·보안 신고 경로 | **자리 표시자로 교체** — `contact@example.com`, `security@example.com` |
| `acc0mplish.GoodGood` (winget) | winget 배포 경로 | **유지** |
| shields.io 배지 | README 배지 | **유지** — QQ·Telegram 배지만 삭제 |
| `.github/` 디렉터리 | 워크플로, 이슈 템플릿, 기여·보안 문서 | **삭제** — 릴리스 워크플로도 함께 사라졌으므로 `docs/development/release.md`의 CI 서술은 수동 절차로 읽어야 합니다 |

이 문서는 `Argus` → `GoodGood` 치환 직후의 조사 기록이며, 위 표가 실제 처리 결과입니다.
