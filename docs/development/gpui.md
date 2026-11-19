# GPUI 개발

`start.bat`는 `scripts/desktop.mjs`로 GPUI 개발 인스턴스를 시작하고 `start.bat build`는 `scripts/build.mjs`로 릴리스 빌드를 만듭니다. 인터페이스 코드는 [`src-gpui/src/frontend`](../../src-gpui/src/frontend)에 있고 애플리케이션 메타데이터, 색상표, 글꼴, 애니메이션 매개변수와 바로 가기 표는 [`resources`](../../resources)에 있습니다.

인터페이스 아이콘은 구성 요소 라이브러리에 포함된 [Lucide](https://lucide.dev/) 디렉터리에서 가져옵니다. `frontend/assets.rs`의 `product_icons!` 표가 인터페이스에서 쓰는 아이콘 이름과 그에 대응하는 Lucide 아이콘을 나열하며 표에 있는 아이콘만 프로그램에 포함됩니다. 불러올 때 선 굵기를 16 px 기준 1.25 px로 바꾸고 이름이 `FilledIcon`으로 끝나는 아이콘은 윤곽도 함께 채웁니다. 새 아이콘을 넣을 때는 표에 한 줄을 추가하고 `theme::icon` 또는 `theme::glyph`로 이름을 지정해 그립니다.

컨트롤 위의 아이콘은 `moving_icon`으로 그리고 컨트롤 안에 `icon_probe`를 배치합니다(컨트롤은 `relative`여야 함). 포인터가 들어오면 아이콘이 `frontend/icon_motion.rs`의 `Motion::of`에 따라 한 번 동작하고 컨트롤이 다른 아이콘으로 바뀌면 새 아이콘이 튀어 들어옵니다. 아이콘은 한 장의 래스터이므로 동작은 전체 회전, 이동과 확대·축소만 하고 끝나면 변형이 없는 정지 상태로 돌아가며 반복하지 않습니다. "인터페이스 애니메이션"을 끄면 재생하지 않습니다. `btn`, `tool_button`, 분할 선택기, 페이지 탐색과 설정 그룹에 이미 연결되어 있고 테스트 인스턴스에서는 `icon_probe`가 컨트롤 이름으로 앵커를 등록하므로 `hoverAnchor`로 동작을 일으킬 수 있습니다.

프로세스 열은 `frontend/columns.rs`에 정의되어 있고 열 머리글 메뉴와 열 선택 대화 상자는 `frontend/columns/dialog.rs`에 있습니다. `processColumns`는 열의 선택, 순서와 너비를 저장하며 이름 열은 고정입니다. 표, 스크롤과 텍스트 배치는 [네이티브 인터페이스](../architecture/frontend.md)를 참고합니다.

샘플링, 저장과 시스템 작업은 백그라운드 Rust 모듈이 수행합니다. 인터페이스는 스냅숏 시각에 따라 표시값을 갱신하고 애니메이션 프레임은 기존 곡선 텍스처를 평행 이동합니다. 새 차트를 추가할 때는 샘플링 타임스탬프, 결측 구간과 창 표시 여부 판단을 유지하며 자세한 내용은 [곡선과 시간 축](../design/charts.md)을 참고합니다.

## 플랫폼 경계

Windows 플랫폼 계층은 HWND, 창 표시 여부와 시스템 이벤트를 맡고 호스트는 알림 영역, 전역 바로 가기, 단일 인스턴스, 설치와 작업 시작을 관리합니다. 현재 빌드 대상은 Windows x64이며 다른 플랫폼의 수집과 시스템 통합 계획은 [로드맵](../roadmap.md)을 참고합니다.

Windows 터치스크린의 `WM_POINTER` 메시지는 GPUI `TouchEvent`로 변환하고 좌표는 창 DPI와 인터페이스 배율로 환산하며 접촉마다 독립 식별자를 부여합니다. GPUI는 누르기, 두 번 누르기, 밀기, 관성과 길게 누르기를 담당합니다. Windows에서 텍스트 선택이나 도움말이 처리하지 않은 길게 누르기는 오른쪽 버튼 메뉴 경로로 들어갑니다. 포인터 캡처를 잃거나 시스템이 취소하거나 창이 숨겨지거나 포커스를 잃으면 끝나지 않은 접촉을 취소합니다. 포그라운드 창의 터치 텍스트 입력은 `InputPane`으로 시스템 터치 키보드를 요청합니다.

## 인터페이스 검증

`tools/window-probe`는 독립 식별자, 숨김 시작과 비활성 표시로 테스트 인스턴스를 실행하고 포그라운드 변화를 감시하며 Windows.Graphics.Capture로만 대상 창을 캡처합니다. 모의 스냅숏은 이 도구의 fixtures 디렉터리에 있습니다. 실기기 검증에서는 fixture를 생략하고 테스트 식별자와 테스트 모드를 유지하며 규칙 실행과 기록 쓰기를 끕니다.

`--fixture`는 모의 스냅숏을 그대로 사용하고 실제 수집기나 수집 쪽 서비스 클라이언트를 시작하지 않으므로 그래픽 초기화를 따로 확인할 수 있습니다. `--test`는 그 자체로 실제 수집을 유지합니다.

시작 정지 진단에는 `--startup-trace`를 덧붙입니다. 기존 진단 로그에 고정 단계 이름, 어댑터·쿼리 번호와 네이티브 반환 코드를 기록하고 한 줄씩 바로 디스크에 동기화합니다. 반복 쿼리는 첫 호출만 기록하고 진단 쓰기에 실패하면 종료 코드 74로 멈춥니다. 이 모드는 시작과 첫 샘플링에 걸리는 시간을 늘리므로 성능 측정에 쓰지 않습니다. 주 창은 여전히 `--hidden`, 테스트 식별자 등 인수에 따라 시작하며 수집과 그래픽 초기화 기록이 번갈아 나타날 수 있으므로 단계, 인스턴스와 작업 번호로 짝을 맞춥니다.

`--test` 인스턴스는 테스트 제어로 페이지, 테마와 대화 상자를 전환할 수 있습니다. 모의 스냅숏에서는 `hold`가 명령을 보류하고 `resolve`가 반환값을 제공하며 정상적인 성공 또는 실패 흐름으로 인터페이스를 갱신합니다. 개발 인스턴스의 제어 인터페이스는 종료 요청만 받습니다.

`node scripts/ui-smoke.mjs <식별자>`는 고정 표본으로 각 페이지, 테마, 언어와 좁은 창을 확인하고 열 머리글 정렬과 창 적중 영역을 검사하며 성능 페이지의 각 장치 개요가 기본 크기에서 완전히 표시되는지(다중 코어 보기는 1240×800 창에서 확인), 최소 크기에서 세로로 스크롤되는지 확인합니다. `--dev`는 개발 빌드를 사용하고 `--live --fluid --move`는 실제 표시 주기와 연속 이동, 숨김과 복원을 확인합니다. 결과는 `target/native-validation`에 있습니다.

### 스크린샷과 녹화

`node scripts/ui-shots.mjs <레이블> <단계 파일>`은 단계에 따라 격리되어 활성화되지 않는 테스트 창을 제어하며 새 인터페이스를 확인하고 회귀를 점검하는 데 사용합니다. 기본값은 개발 빌드 `target/debug/goodgood.exe`와 모의 스냅숏 `tools/window-probe/fixtures/desktop.json`입니다. `--release`는 릴리스 빌드로 바꾸고, `--live`는 실시간 데이터를 쓰며(이때 키 입력, 한 번 누르기와 끌기가 적용되지 않음), `--fixture`는 다른 스냅숏을 지정하고, `--theme`과 `--language`는 모양과 언어를 정하며, `--width`와 `--height`는 클라이언트 영역의 물리적 크기를 지정합니다. 프로브는 먼저 `cargo build --release -p goodgood-window-probe --features capture`로 빌드해야 합니다. 스크린샷, 녹화 프레임, 이어 붙인 그림과 `results.json`은 `target/native-validation/<레이블>`에 기록되고 테스트 식별자의 데이터 디렉터리는 끝날 때 삭제됩니다. 충족되지 않은 단언이 있으면 종료 코드 1로 끝납니다.

단계 파일은 단계 배열이거나 `{ "window": [너비, 높이], "steps": [...] }`입니다. 한 단계는 다음 항목을 조합할 수 있고 표의 순서대로 실행됩니다.

| 키 | 역할 |
|---|---|
| `note` | 설명을 출력합니다 |
| `control` | 테스트 제어를 보냅니다. 아래 표를 참고합니다 |
| `probe` | 프로브 명령을 보냅니다. 예: `size 1200 900` |
| `record` | `{ "name", "ms", "crop"? }`: 이 구간에 표시된 모든 프레임을 녹화합니다 |
| `wait` | 지정한 밀리초만큼 기다립니다 |
| `inspect` | `columns`, `menu`, `layout` 또는 `vitals`이며 `label`로 이름을 붙이고 결과를 `results.json`에 기록합니다 |
| `expect` | 점으로 구분한 경로로 `inspect` 결과를 확인합니다. 예: `{ "state.focus.item.label": "CPU 시간" }` |
| `capture` | 창을 PNG로 캡처합니다 |
| `captureFlyout` | 알림 영역의 마우스 올림 카드나 빠른 패널을 PNG로 캡처합니다(테스트 인스턴스의 표시되는 도구 창) |
| `captureWindow` | `{ "name", "class", "title"? }`: 테스트 인스턴스에서 지정한 창 클래스를 가지며 제목에 `title`이 들어 있는 표시되는 창을 캡처합니다. 예: 데스크톱 모니터(`Zed::Window`, 제목은 인터페이스 언어의 "데스크톱 모니터")와 대체 작업 표시줄(`GoodGoodTestTaskbar`) |
| `crop` | `{ "from", "name", "region": [x, y, 너비, 높이], "scale"? }`: 스크린샷을 잘라 확대합니다 |
| `sheet` | `{ "name", "from", "region", "columns"?, "scale"?, "every"?, "limit"? }`: 녹화 한 구간(또는 여러 스크린샷)의 같은 영역을 순서대로 한 장에 이어 붙입니다 |

녹화의 캡처 표면은 데스크톱과 같은 크기이므로 녹화 중에 창이 커져도 프레임마다 전체 화면이 담기고 프레임 시각은 녹화 디렉터리의 `index.json`에 기록됩니다. 프로브 명령 `size`는 창이 크기 변경을 처리한 뒤 `resized` 이벤트를 출력하며 그 안의 `qpc100ns`는 프레임 시각과 같은 시계이므로 크기를 바꾼 뒤 얼마 만에 새 크기의 화면이 표시되는지 계산할 수 있습니다.

`drag`는 축약형입니다. `{ "drag": { "at", "dx", "dy", "steps", "interval" } }`는 마우스 올림, 누르기, 균등한 단계별 이동과 놓기로 펼쳐지며 `record`와 `wait`를 함께 둘 수 있습니다. 예시는 `tools/window-probe/steps`에 있습니다. `header-menu.json`은 키보드로 열 머리글 메뉴를 조작하며 단계마다 단언하고, `column-drag.json`은 열 머리글과 "열 선택" 대화 상자의 끌기를 녹화해 이어 붙입니다.

[`process-suspend.json`](../../tools/window-probe/steps/process-suspend.json)은 일시 중단 상태가 섞인 앱 그룹 메뉴, 일시 중단 확인, 취소와 즉시 다시 시작, 밝은 테마와 어두운 테마의 확인 문구를 확인합니다. 모의 스냅숏에서의 작업은 테스트 진입점에서 끊기며 실제 일시 중단과 다시 시작은 수집 계층의 격리된 자식 프로세스 테스트로 검증합니다.

[`process-facts.json`](../../tools/window-probe/steps/process-facts.json)은 파일 버전, 아키텍처, 권한 상승 상태와 명령줄 열의 사용 설정, 알 수 없는 값, 앱 그룹 공통값, 좁은 창과 기본 열 복원을 확인하고 밝은 테마와 어두운 테마 화면을 캡처합니다.

[`about-scroll.json`](../../tools/window-probe/steps/about-scroll.json)은 정보 페이지에서 150% 인터페이스 배율, 큰 글꼴과 창 크기 변경 후의 스크롤 범위와 아래쪽 도달 가능성을 확인하며 `inspectLayout`의 `aboutScroll` 필드에 스크롤 위치와 경계가 기록됩니다.

[`diagnostic-summary.json`](../../tools/window-probe/steps/diagnostic-summary.json)은 정보 페이지의 진단 정보 복사 진입점, 밝은 테마와 어두운 테마, 작은 창과 큰 글꼴 배치를 확인합니다. 모의 스냅숏에서 복사 단추를 누르면 생성한 내용이 `inspectLayout.diagnosticCopy`에 기록되고 시스템 클립보드 내용은 유지됩니다. 요약 필드 필터링, 누락된 값과 배율 환산은 관련 단위 테스트가 다룹니다.

[`about-links.json`](../../tools/window-probe/steps/about-links.json)은 정보 페이지의 웹사이트와 GitHub 카드에 대한 마우스 올림, 밝은 테마와 어두운 테마, 최소 창과 큰 글꼴 배치를 확인하고 카드 아래쪽 단추를 누르면 해당 페이지만 열리고 카드 전체는 반응하지 않는지 검사합니다. 모의 스냅숏은 웹 페이지 열기 같은 명령을 수행하지 않으며 `inspectLayout.skippedRequest`에 최근에 건너뛴 명령과 그 인수가 기록됩니다. 각 페이지의 주소는 `commands.rs`의 단위 테스트가 다룹니다.

[`file-lock-layout.json`](../../tools/window-probe/steps/file-lock-layout.json)은 파일 선택, 쿼리 상태와 결과 변화 후 대화 상자의 안정성을 확인합니다. 모의 스냅숏 인스턴스는 `contentZoom`(0.5–3)으로 분수 배율 배치를 재현할 수 있고 `inspectLayout`의 `dialog.settled`는 높이 전환이 끝났음을 뜻합니다.

[`window-restore.json`](../../tools/window-probe/steps/window-restore.json)은 모의 스냅숏 인스턴스의 `nativeResize` 제어로 인터페이스 갱신 중에 네이티브 클라이언트 영역을 동기적으로 조정하여 크기 복원과 분수 배율 후의 배치를 확인합니다. `cargo test -p goodgood --test resize_reentry`는 알림 병합, 중첩 메시지 루프, 동기 배율 조정과 창 닫기를 다룹니다.

[`window-maximized-restore.json`](../../tools/window-probe/steps/window-maximized-restore.json)은 `restoreWindow`로 숨겨진 모의 스냅숏 인스턴스에 창 위치를 기록한 뒤 정식 위치 복원 경로로 창을 표시하여 최대화, 최소화 후 복원, 일반 창 복원과 밝은 테마·어두운 테마를 확인합니다. `inspectLayout.nativeWindow`는 실제 클라이언트 영역, 최대화 상태와 그것이 인터페이스 뷰포트와 일치하는지를 기록합니다. `cargo test -p goodgood --test restore_render_target`은 항상 숨겨진 네이티브 창에서 최소화 후 확대, 축소와 크기 유지 시의 그리기 버퍼 크기를 확인합니다.

[`tray-page.json`](../../tools/window-probe/steps/tray-page.json)은 알림 영역에서 연 페이지 선택, 대화 상자 맥락과 필터 유지를 확인합니다. `hide`／`show`는 네이티브 창 메시지로 알림 영역 복원을 일으키고, `close`는 닫기 단추의 `WM_CLOSE`를 보내 "닫을 때 알림 영역으로 숨기기"가 켜져 있으면 페이드 아웃을 거쳐 알림 영역으로 들어가며, `minimize`는 다른 창을 활성화하지 않고 최소화합니다. 둘 다 `show`로 복원합니다. `show`는 `qpc100ns`가 있는 `restoring` 이벤트를 먼저 출력하므로 프레임 추적의 제출 시각과 대조해 복원 후 첫 프레임을 확인할 수 있습니다. 모의 스냅숏 인스턴스의 `restored` 제어는 같은 이벤트 진입점에 최초 표시와 최소화 복원을 주입하여 페이지 정책을 검사합니다.

[`tray-flyouts.json`](../../tools/window-probe/steps/tray-flyouts.json)은 구성 요소 페이지, 마우스 올림 카드와 빠른 패널(새 버전 진입점 포함)의 밝은 테마·어두운 테마 화면과 구성 요소 페이지를 가리키는 설정 페이지의 카드를 캡처합니다. `--live`로 바꾸면 패널의 실시간 곡선을 확인할 수 있습니다. 실제 알림 영역의 마우스 올림과 오른쪽 버튼 누르기는 셸이 시작하며 테스트 인스턴스는 알림 영역 아이콘을 만들지 않습니다.

[`monitors.json`](../../tools/window-probe/steps/monitors.json)은 테스트 제어로 데스크톱 모니터와 작업 표시줄 모니터를 켜고 데스크톱 모니터 창과 대체 작업 표시줄을 밝은 테마·어두운 테마, 전체 표시값, 작업 표시줄 왼쪽, 곡선, 캡슐과 큰 숫자 스타일, 70% 불투명도에서 캡처하며 구성 요소 페이지의 해당 그룹도 함께 캡처합니다. 이어서 대체 작업 표시줄에서 작업 표시줄 모니터 패널을 열고(테스트 제어 `taskbarPanel`, 포그라운드를 얻지 않음) 밝은 테마·어두운 테마 화면을 캡처하고 패널의 옵션으로 스타일과 표시값을 바꾸어 선택 상태를 확인한 뒤 메뉴로 데스크톱 모니터를 끄고 작업 표시줄 모니터를 종료합니다. 테스트 인스턴스의 데스크톱 모니터는 겹침 순서의 맨 아래에 놓이고 작업 표시줄 모니터는 테스트 인스턴스 자신의 대체 작업 표시줄에 붙으며 탐색기의 작업 표시줄은 건드리지 않습니다. `inspectLayout.monitors`는 데스크톱 모니터의 표시 여부, 위치와 행별 표시값, 그리고 작업 표시줄 모니터의 화면 사각형을 출력합니다. [`monitor-metrics.json`](../../tools/window-probe/steps/monitor-metrics.json)은 구성 요소 페이지에서 표시값 옵션 세 개를 연속으로 누르고(간격 60 ms) 누를 때마다 적용되는지, 옵션 밖의 화면이 바뀌지 않는지 확인하고 누르기 전후 프레임을 녹화합니다. 이어서 `sample`로 그래픽 카드를 하나 더 넣고 디스크 하나, 네트워크 어댑터 하나와 기본이 아닌 그래픽 카드의 표시값을 각각 선택하여 저장된 표시값 순서와 장치 키를 확인합니다. 옵션의 테스트 앵커는 `<카드>-<행>-<표시값>`이며 예를 들어 `desktopMetrics-disk-0-diskTemperature`입니다.

[`tray-reopen.json`](../../tools/window-probe/steps/tray-reopen.json)은 숨겨진 주 창에서 카드가 빠른 패널로 바로 전환되는지, 다시 눌러 닫히는지, 다시 열리는지 확인하고 창 닫기 애니메이션의 경우도 다룹니다. `inspectLayout.tray`는 떠 있는 창의 네이티브 표시 상태와 샘플링 상태를 함께 기록하여 패널이 열려 있는 동안 포그라운드 샘플링 주기가 유지되고 닫은 뒤 백그라운드 주기로 돌아오는지 확인합니다.

[`process-visibility.json`](../../tools/window-probe/steps/process-visibility.json)은 Windows 구성 요소, 일반 프로세스와 소속 프로세스 연결이 없는 표본을 주입하여 세 가지 프로세스 보기, 연결 필터, 설정 페이지 규칙 편집과 작은 창 배치를 확인합니다. 모의 스냅숏 인스턴스의 `formValues`는 열린 양식의 입력값을 설정하고 이어서 실제 키보드 경로로 저장하거나 취소합니다. `inspectLayout.visibility`는 스위치 상태와 목록의 PID를 출력합니다.

[`process-users.json`](../../tools/window-probe/steps/process-users.json)은 `sample` 제어로 모의 스냅숏의 `sessions`와 각 프로세스의 세션 번호를 바꾸어 사용자가 하나일 때 그룹화하지 않는지, 두 번째 사용자가 로그인하면 자동으로 그룹화하는지, 세 가지 보기, 분류와 사용자 그룹 접기, 검색, 시스템 프로세스 숨기기, 같은 프로그램이 두 사용자 그룹에서 각각 한 행을 차지하는지, "항상 그룹화"와 "그룹화 안 함"이 로그인 사용자 수보다 우선하는지 확인합니다. `inspectLayout.userGroups`는 선택한 모드, 로그인 사용자 수, 그룹화 여부와 각 그룹 행의 제목, 프로세스 수, 펼침 상태를 출력합니다. 같은 파일은 또 `pointer`의 `context` 이벤트로 그룹 행에 오른쪽 버튼을 눌러 나타나는 메뉴를 확인합니다. 현재 사용자는 로그아웃할 수 있고 다른 사용자는 표준 권한에서 선택할 수 없으며 "시스템" 그룹은 접기만 있고 분류 제목에서는 메뉴가 열리지 않습니다. `data`로 `info.elevated`를 참으로 바꾼 뒤 다른 사용자를 로그아웃하고 확인 대화 상자를 거친 다음 `resolve`로 `sign_out_user`의 성공과 액세스 거부 두 결과를 제공합니다. 모의 스냅숏은 어떤 명령도 보내지 않으므로 실제 세션을 로그아웃하지 않습니다. `inspectLayout`의 `dialog.title`은 대화 상자 제목이고 `toasts`는 현재 표시 중인 알림 문구입니다.

[`vitals-visibility.json`](../../tools/window-probe/steps/vitals-visibility.json)은 개요 밴드의 고정 열 줄 높이 예산, 전체 접기, 빈 검색 결과, 수동 모드, 창 배율 조정과 애니메이션 중단을 확인하고 펼침과 접힘을 녹화합니다. `inspectLayout.vitals`는 전체 페이지 높이, 필요한 높이, 애니메이션 높이와 활성 곡선 수를 기록하며 숨김이 끝나면 활성 곡선 수는 0입니다.

[`disk-counters-unavailable.json`](../../tools/window-probe/steps/disk-counters-unavailable.json)은 디스크 두 개 중 하나의 성능 카운터를 사용할 수 없을 때의 장치 목록, 알 수 없는 값, 상세 페이지와 복구 후 표시값을 확인하고 작은 창도 다룹니다.

[`disk-details-layout.json`](../../tools/window-probe/steps/disk-details-layout.json)은 `data` 제어로 NVMe SSD 하나와 SATA HDD 하나의 상세 정보를 주입하고 기본, 최소, 넓은 창과 150% 인터페이스 배율에 큰 글꼴을 적용한 상태에서 디스크 상세 페이지의 위와 아래를 캡처하여 SMART 속성 표의 단 분할, 이름 줄바꿈과 값 줄바꿈을 확인합니다.

[`star-reminder.json`](../../tools/window-probe/steps/star-reminder.json)은 Star 알림 카드의 등장, 마우스 올림 시 점등, 두 단추와 설정 스위치의 연동을 확인하고 차트 위와 밝은 테마도 다룹니다. 테스트 인스턴스는 이 카드를 스스로 표시하지 않으며 `starPrompt` 제어로 발생시킵니다. `inspectLayout.star`는 카드 표시 여부와 알림 사용 여부를 출력합니다. 카드는 차트 위에 겹치며 단색 사각형, 텍스트와 아이콘만 쓰고 동작은 모두 한 번만 재생합니다. 그리기를 바꾼 뒤에는 `--live`와 `GOODGOOD_GPUI_DIAGNOSTICS=1`로 성능 페이지에서 `gpu-chart-foreground-reject`가 없는지 확인합니다.

[`portable-notice.json`](../../tools/window-probe/steps/portable-notice.json)은 `data` 제어로 `info.portable`을 포터블 버전으로 설정하고 시작 가이드 첫 단계의 설명 카드와 오른쪽 아래의 한 번만 표시되는 알림을 확인하며 차트 위, 밝은 테마, 최소 창과 큰 글꼴을 다룹니다. 테스트 인스턴스는 이 알림을 스스로 표시하지 않으며 `portableNotice` 제어로 발생시킵니다. 모의 스냅숏에서는 다운로드 진입점을 눌러도 브라우저가 열리지 않습니다. `--language`를 바꾸면 각 언어의 줄바꿈을 다시 확인할 수 있습니다.

[`performance-menus.json`](../../tools/window-probe/steps/performance-menus.json)은 성능 페이지의 두 오른쪽 버튼 메뉴를 확인합니다. CPU 차트의 "커널 시간 표시"는 전체 보기와 다중 코어 보기가 함께 쓰고, 장치 목록은 항목 하나를 숨기거나 "표시할 장치" 하위 메뉴에서 개별 선택하고 기본 표시로 되돌릴 수 있습니다. 이어서 선택한 항목을 숨긴 뒤의 선택 항목, 항목이 하나만 남으면 숨길 수 없는지, 다른 곳에서 이미 숨긴 장치를 열면 그 항목이 목록으로 돌아오는지, 밝은 테마를 확인합니다. `pointer`의 `context` 이벤트는 기록된 요소에서 오른쪽 버튼을 누르고 떼며 CPU 차트 영역은 `cpu-graphs`, 장치 항목은 `device-<장치 식별자>`로 기록됩니다. `inspectLayout.performance`는 목록에 표시되는 장치, 숨긴 장치의 식별자, 선택 항목, 커널 시간 스위치와 CPU 전체 차트·첫 논리 프로세서 차트의 시퀀스 번호를 출력합니다. 전환을 녹화할 때는 `record`를 그것을 일으키는 제어보다 한 단계 먼저 시작합니다(간격 약 700 ms). 캡처 세션을 만드는 데 수백 밀리초가 걸리므로 같은 단계에서 보낸 제어는 첫 프레임이 도착하기 전에 전환을 마칩니다.

[`device-order.json`](../../tools/window-probe/steps/device-order.json)은 장치 목록 정렬을 확인합니다. `sample`로 디스크의 드라이브 문자를 바꾼 뒤 "드라이브 문자순"과 "디스크 번호순"을 오가고, 네트워크 어댑터를 맨 위로 끌어도 디스크 순서가 유지되는지, 디스크 순서를 흐트러뜨린 뒤 "사용자 지정"으로 바꾸는지 확인하며 메뉴의 선택 표시와 "기본 순서 복원" 및 행의 자리 양보와 밀기를 녹화합니다. `inspectLayout.performance`의 `diskOrder`는 디스크 정렬 방식이고 `arranged`는 끌어서 저장한 순서입니다.

[`process-groups.json`](../../tools/window-probe/steps/process-groups.json)은 프로세스 페이지 그룹화를 확인합니다. 이름순으로 정렬한 세 분류와 그 색상, 스크롤 후 분류 제목이 위에 고정되고 다음 그룹 제목에 밀려나는지, 고정된 제목을 누르면 그 그룹이 접히는지, 사용자별 그룹화에서 사용자 제목과 분류 제목이 두 층으로 겹쳐 놓이는지, 스크롤 중의 그룹 이름이 스크롤을 멈추면 사라지는지 검사하고 밝은 테마, 150% 배율과 가로 스크롤 후 화면도 캡처합니다. `inspect columns`의 `state.groups`는 각 그룹의 제목 키, 색상과 행 수(`groups`), 고정된 제목과 그 위치(`held`), 그룹 이름(`name`, 표시되지 않으면 `null`)을 출력합니다.

[`column-widths.json`](../../tools/window-probe/steps/column-widths.json)은 프로세스 열의 자동 너비를 확인합니다. 넓은 창에서 가로 스크롤이 생기지 않는지, 열 경계에 마우스를 올리면 세로선과 도움말이 표시되는지, 열 경계를 끌면 그 열이 직접 지정한 너비를 유지하고 다른 열은 변하지 않는지, 열 경계를 두 번 누르면 자동 너비로 돌아가는지, "전체 너비"를 확인합니다. `inspectMenu`는 열 머리글 메뉴의 "이 열 자동 맞춤"이 열을 끌지 않은 상태에서 사용할 수 없는지 검사하고 `inspect columns`의 `autoWidth`와 `fullWidth`는 텍스트 열에서 대부분의 행과 모든 행에 필요한 너비입니다. [`column-widths-stable.json`](../../tools/window-probe/steps/column-widths-stable.json)은 프로세스 트리에서 가지를 접고 펼치며 검색할 때 각 열 너비가 그대로인지 확인합니다.

[`process-order-held.json`](../../tools/window-probe/steps/process-order-held.json)은 포인터를 올려 둔 동안 프로세스 표 정렬이 멈추는지 확인합니다. 포인터가 목록 위에 있을 때 `sample`로 CPU 표시값을 바꾸어도 행 순서가 유지되는지, 이어서 두 번 눌러 펼치고 접는 경우와 펼침 단추를 누르는 경우에 펼친 행이 해당 항목 뒤를 따르고 나머지 행은 움직이지 않는지, 포인터가 목록을 벗어나면 정렬이 돌아오는지, `holdOrderOnHover` 기본 설정을 끄면 마우스 올림이 더 이상 행 순서를 유지하지 않는지 검사합니다. `inspectLayout.processTree`의 `titles`는 각 행의 제목이고 `heldOrder`는 현재 행 순서가 정렬 결과와 다름을 뜻합니다.

[`status-rate.json`](../../tools/window-probe/steps/status-rate.json)은 상태 표시줄의 새로 고침 컨트롤을 확인합니다. 새로 고침 상태를 누르면 빈도 메뉴가 열리고 다시 누르면 접히며 1초 뒤 다시 누르면 열리는지, 오른쪽 끝 단추를 누르면 새로 고침이 일시 중지되고 다시 누르면 재개되는지 검사합니다. 일시 중지 단추는 창 안 좌표로 누르고(1400×900 창, 100% 배율) 스크린샷으로 단추 위치가 두 상태에서 같음을 확인합니다.

[`hardware-acceleration.json`](../../tools/window-probe/steps/hardware-acceleration.json)은 설정 페이지에서 "하드웨어 가속" 스위치를 눌러 창이 실행 중에 소프트웨어 렌더링 장치로 바뀌었다가 GPU로 돌아오는지 확인하고 두 장치에서 설정 페이지, 성능 페이지, 프로세스 페이지와 알림 영역 빠른 패널을 캡처합니다. 두 구간의 녹화가 전환 전후의 모든 프레임을 담아 전환 중에 빈 화면이 없음을 확인합니다. `inspectLayout.graphics`의 `softwareRequested`는 설정이 요청한 렌더링 방식이고 `software`는 창이 실제로 쓰는 어댑터에 소프트웨어 표시가 있는지입니다. 모의 스냅숏에서는 이 스위치가 평소대로 동작하고 테스트 인스턴스 자신의 렌더링 장치와 설정 파일만 바꿉니다. 이 단계는 GPU가 있는 머신에서 실행해야 하며 GPU가 없으면 두 설정 모두 소프트웨어 어댑터를 씁니다.

[`cpu-cores.json`](../../tools/window-probe/steps/cpu-cores.json)은 `sample`로 `/hardware/cpu`를 다른 프로세서로 바꾸어 다중 코어 보기의 배치와 코어 종류를 확인합니다. 같은 종류의 논리 프로세서 32개는 8열 4행으로 배치되고 창이 좁아져 8열이 들어가지 않으면 빈자리를 남기는 배치로 바뀝니다. 성능 코어 6개, 효율성 코어 8개, 저전력 효율성 코어 2개 구성은 세 가지 색, 배지, 필터 항목과 범례를 표시하고, 성능 코어와 저전력 효율성 코어만 있는 프로세서는 효율성 코어 필터 항목을 표시하지 않습니다. `inspectLayout.performance`의 `coreColumns`는 격자의 현재 열 수이고 `coreKinds`는 프로세서가 가진 코어 종류입니다. 열 수의 예상값은 125% 표시 배율에서 2000 × 1318 클라이언트 영역을 기준으로 정해져 있습니다.

테스트 제어는 페이지, 테마, 대화 상자 같은 기존 항목 외에 다음을 포함합니다.

| 제어 | 역할 |
|---|---|
| `preference` | `{ "키": 값 }`, 정상적인 기본 설정 경로로 임의의 기본 설정을 지정합니다 |
| `keys` | 키 시퀀스이며 정상적인 전달 경로를 거칩니다. 모의 스냅숏 전용입니다 |
| `hoverAnchor` | 포인터를 기록된 요소의 가운데로 옮깁니다 |
| `clickAnchor`, `dragAnchor` | 요소를 누릅니다. 한 요소에서 다른 요소 높이의 특정 비율 지점까지 끕니다. 모의 스냅숏 전용입니다 |
| `pointer` | `{ "at"?, "event", "dx"?, "dy"?, "clicks"? }`: 마우스 올림, 누르기, 누른 채 이동 또는 놓기이며 `context`는 오른쪽 버튼 누르기, `double`은 왼쪽 버튼 두 번 누르기입니다. `down`에 `"clicks": 2`를 주면 두 번 누르기의 두 번째 누르기가 되어 이어서 누른 채 이동할 수 있습니다. `at`은 기록된 요소, `header:<열>` 또는 `row:<행 순번>`(현재 표의 0부터 세는 행)이며 생략하면 제스처 시작점을 기준으로 하므로 끄는 동안 요소가 움직여도 영향이 없습니다 |
| `touch` | `{ "id", "at"?, "fraction"?, "event", "dx"?, "dy"? }`: 원시 터치 이벤트이며 모의 스냅숏 전용입니다. `event`는 `down`, `move`, `up`, `cancel` 또는 `tap`입니다. 접촉마다 새 `id`를 쓰고 같은 접촉 안에서는 유지합니다. `at`은 포인터 앵커를 따르며 창 안 좌표 `[x,y]`와 `about-scroll`도 받습니다. `fraction`은 앵커 안의 상대 위치이며 기본값은 가운데입니다. 이벤트는 정식 제스처 인식 경로를 거치고 길게 누르기는 `down` 후 최소 500 ms 기다려야 합니다 |
| `headerMenu` | 특정 열의 열 머리글 메뉴를 엽니다 |
| `inspectMenu` | 메뉴가 열렸는지, 키보드를 점유하는지, 현재 항목과 펼쳐진 하위 메뉴를 출력합니다 |
| `passive` | `mouse`, `wheel` 같은 입력과 함께 보내면 그 입력만 전달하고 창 전체를 다시 그리지 않으므로 프레임 추적이 실제 입력이 일으킨 다시 그리기 범위를 반영합니다 |
| `starPrompt` | 하루 한 번 제한을 받지 않고 Star 알림 카드를 표시합니다 |
| `portableNotice` | 한 번만 표시 제한을 받지 않고 포터블 버전의 오른쪽 아래 알림을 표시합니다 |
| `desktopMonitor`, `taskbarMonitor` | 구성 요소 페이지가 쓰는 `set_desktop_monitor`, `set_taskbar_monitor`로 모니터 설정을 바꿉니다. 예: `{ "enabled": true }`, `{ "metrics": ["cpu", "network"] }`, `{ "opacity": 70 }`. 모의 스냅숏에서도 실행되며 테스트 인스턴스 자신의 설정과 창만 바꿉니다 |
| `desktopMonitorMenu` | `topmost`, `locked` 또는 `hide`: 데스크톱 모니터의 오른쪽 버튼 메뉴에서 해당 항목을 고른 것과 같습니다 |
| `trayFlyout` | `card` 또는 `panel`: 주 모니터 작업 표시줄 오른쪽의 가정된 알림 영역 위치에서 마우스 올림 카드나 빠른 패널을 열고 포그라운드를 얻지 않습니다. `warm`은 알림 영역 아이콘에 포인터가 들어왔을 때와 같게 팝업 창을 미리 만들고 배치합니다. 그 밖의 값은 둘 다 닫습니다. 테스트 인스턴스는 `tray-flyout` 이벤트를 출력하며 `made`는 창을 만든 시간, `visible`과 `shown`은 요청에서 페이드 인 시작까지와 페이드 인 종료까지의 밀리초, `frames`는 페이드 인 동안 그린 프레임 수입니다 |

합성 입력은 `window.defer`로 전달되고 제어가 함께 한 프레임을 요청하므로 유휴 창이 입력을 다음 샘플링까지 미루지 않습니다. 프로브의 `crop`, `sheet` 하위 명령은 따로 실행할 수도 있습니다. 새 녹화를 시작하면 이전 녹화는 백그라운드에서 프레임을 기록하므로 뒤따르는 명령을 막지 않습니다.

로컬 수정은 [GPUI](../../vendor/gpui-pre/GOODGOOD-PATCHES.md)와 [Windows 플랫폼 계층](../../vendor/gpui-pre-windows/GOODGOOD-PATCHES.md)에 각각 기록되어 있습니다. 업스트림을 갱신할 때는 창 끌기와 크기 조정, 캐시 재생 후의 제목 표시줄 단추, 텍스트 줄바꿈과 Windows 렌더링을 다시 확인합니다.

`cargo test -p goodgood --test touch_input`은 접촉 식별자 재사용, 캡처 손실, 여러 손가락 접촉, 누르기, 두 번 누르기, 밀기 취소, 메시지 재진입과 길게 누르기 메뉴를 확인합니다. [`touch-input.json`](../../tools/window-probe/steps/touch-input.json)은 격리 창에서 프로세스 트리, 순서를 바꾼 뒤의 길게 누르기 대상, 메뉴, 차트, 150% 인터페이스 배율에서의 페이지 스크롤과 스크롤 막대 끌기·취소를 다시 확인합니다.

`cargo test -p goodgood --test image_atlas_edges`는 항상 숨겨진 창에서 GPU 그리기 결과를 읽어 확대, 축소, 반투명과 한 텍셀 이미지의 네 변을 확인합니다. 테스트 이미지 조각 주위에 대비가 큰 색을 두어 선형 샘플링이 조각 경계 안에 머무는지 검증하고 개요 밴드 마스크 가장자리에 이웃 아이콘이 섞이지 않게 합니다.

README의 미리보기 그림 네 장은 `node scripts/readme-previews.mjs`로 생성하며 1600×1000 픽셀의 무손실 PNG입니다. 격리 인스턴스는 125% 인터페이스 배율로 텍스트와 아이콘을 직접 그리고 캡처 테두리에 맞추어 클라이언트 영역 크기를 보정하며 내보내기 과정은 네이티브 픽셀을 유지합니다.

`pnpm test:startup`은 독립 Windows 데스크톱에서 개발 스크립트를 실행하고 기본 시작과 `--hidden`의 창 표시 상태를 확인합니다.

개발 빌드의 격리 테스트는 `GOODGOOD_TEST_BACKDROP_BUILD=22000`을 설정해 Windows 11 21H2의 배경 기능 판정을 흉내 내고 `tools/window-probe/steps/backdrop-fallback.json`으로 밝은 테마와 어두운 테마의 단색 대체를 확인할 수 있습니다. 이 변수는 `--test`와 독립 테스트 식별자를 함께 가진 개발 인스턴스에만 적용되고 기존 합성 렌더링 경로를 유지합니다. `inspectLayout`은 `systemBackdrop`과 `backgroundAlpha`를 출력합니다.

`cargo test -p goodgood --test display_reentry`는 창 갱신 중 디스플레이 콜백의 재진입, 연속 알림 병합, 네이티브 중첩 메시지 루프와 창 닫기 후의 지연 처리를 확인합니다. `cargo run -p goodgood --example display_reentry`는 자신의 숨겨진 창 초기화 콜백 안에서 `WM_DISPLAYCHANGE`를 보내 실제 Windows 메시지 경로를 확인합니다. 이 예제는 창을 숨긴 채로 두고 디스플레이 설정을 바꾸지 않습니다.
