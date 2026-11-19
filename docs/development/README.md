# 개발 가이드

Windows 개발 환경은 Visual Studio C++ Build Tools와 stable MSVC Rust를 사용합니다. Rust 최소 버전은 [Cargo.toml](../../Cargo.toml), Node.js와 pnpm 버전은 각각 [.node-version](../../.node-version)과 [package.json](../../package.json)에 있습니다. 저장소 디렉터리에 MSVC 도구 체인 override를 설정합니다.

| 명령 | 용도 |
|---|---|
| `start.bat` / `start.bat dev` | 네이티브 GPUI 개발판을 시작하고 Rust와 리소스 변경을 감시합니다 |
| `start-website.bat` | 웹사이트 개발 서버를 시작하고 페이지, 구성 요소, 스타일과 개발판 문서를 실시간으로 미리 봅니다 |
| `start.bat check` | 문구, 서식, 생성 코드, 스크립트 테스트, Clippy와 Rust 테스트를 검사합니다 |
| `start.bat build` | 네이티브 프로그램 `target/release/goodgood.exe`를 빌드하며 작업 관리자 보조 프로그램을 포함합니다 |
| `start.bat build installer` | 네이티브 프로그램을 빌드하고 NSIS 설치 패키지를 만듭니다 |
| `node scripts/readme-previews.mjs` | 현재 릴리스 빌드에서 한국어와 영어 README의 밝은 테마와 어두운 테마 프로세스 페이지 스크린샷을 만듭니다 |
| `node scripts/readme-features.mjs` | 각 언어 README의 기능 영역에 들어갈 밝은 테마와 어두운 테마 동작 시연 애니메이션(`docs/images/features/`)을 만들며, 인터페이스 문구는 `locales/`에서 가져옵니다 |
| `node scripts/supporters.mjs` | `website/src/data/supporters.json`에 따라 각 언어 README의 프로젝트 후원과 특별 감사 카드를 만들고 README의 카드 영역을 갱신합니다 |
| `start.bat clean` | 애플리케이션 산출물을 정리하고 의존성 캐시는 유지합니다 |
| `start.bat clean all` | Cargo 빌드 캐시를 모두 비웁니다 |

개발 스크립트는 컴파일에 성공하면 EXE를 별도 디렉터리로 복사한 뒤 이전 개발 인스턴스에 종료를 요청합니다. 컴파일에 실패하면 실행 중인 버전을 계속 사용할 수 있습니다. 작업 공간마다 설정과 단일 인스턴스 잠금을 따로 사용합니다.

터미널은 프로세스 ID, 컴파일 결과와 종료 상태를 표시하고 소스 파일을 계속 감시합니다. 기본값은 주 창을 표시하며 `--hidden`을 전달하면 숨겨서 시작합니다. Ctrl+C로 개발 세션을 끝냅니다.

설치 관리자는 NSIS 3.13을 사용합니다. 기본 디렉터리에 설치하거나 `GOODGOOD_NSIS`로 `makensis.exe`를 지정합니다. 빌드 산출물과 검증 결과는 `target/`에 있으며 자세한 내용은 [빌드와 캐시](build.md)를 참고합니다.

README 미리보기는 투명 효과를 사용하는 Windows 11에서 생성합니다. 프로브는 테스트 창을 아래쪽에 유지하고 `WM_NCACTIVATE`로 Windows가 활성 상태의 Mica를 그리게 하며, 같은 테마의 비활성 스크린샷과 대조합니다. 내보낼 때는 16비트 부동 소수점 창 샘플링으로 Mica 배경색의 그라데이션을 채우고 정렬된 디더링으로 sRGB PNG를 기록합니다. 배경색은 네이티브 SDR 판독값을 기준으로 하고 나머지 영역은 창의 원본 픽셀을 그대로 사용합니다. 키보드 포커스는 현재 애플리케이션에 남습니다.

다섯 곡선은 `tools/window-probe/fixtures/readme-trace.json`의 약 1초 간격 연속 판독값 60개를 재생하며 상대 샘플 시각, CPU와 GPU 사용량, 메모리 비율, 디스크 읽기·쓰기와 네트워크 송수신 속도를 유지합니다. 메모리 비율은 시뮬레이션한 머신의 용량으로 환산하고 프로세스 표는 시뮬레이션 프로세스의 비율에 따라 부하를 배분합니다. 애플리케이션 아이콘은 해당 프로그램의 Windows 아이콘 리소스에서 가져옵니다. 인터페이스를 고친 뒤 같은 명령을 다시 실행하면 같은 데이터로 새 미리보기와 이전 미리보기를 비교할 수 있습니다.

- [GPUI와 플랫폼 경계](gpui.md)
- [빌드와 캐시](build.md)
- [성능 측정](performance.md)
- [다국어](i18n.md)
- [커밋과 릴리스](release.md)
- [웹사이트와 릴리스 미러](website.md)
- [Windows 코드 서명](signing.md)
- [의존성 보안](security.md)

## 수집 데이터 검증

`goodgood-core`에는 수집 결과를 그대로 출력하는 예제가 몇 가지 있습니다.

```bash
cargo run -p goodgood-core --example dump --release       # 프로세스(CPU 순 정렬)
cargo run -p goodgood-core --example process_columns --release # 새 프로세스 개수와 샘플링 소요 시간
cargo run -p goodgood-core --example sampling_cadence -- 120 --trace # 스냅숏 간격, 항목별 소요 시간과 만료 프로세스 수
cargo build -p goodgood-core --example process_sources --release # 표준 권한 프로세스 출처 비교 도구 빌드
node scripts/process-sources.mjs comparison --samples 60 --interval 1000 # 세 경로 교대 수집과 수치 검증
cargo run -p goodgood-core --example gpu_memory --release -- <PID> # 프로세스 전용 메모리와 네이티브 예산 사용량 대조
cargo run -p goodgood-core --example hardware --release   # CPU, 센서, 메모리, 디스크, 네트워크, GPU, 배터리
cargo run -p goodgood-core --example disk_details --release -- 0 # 디스크 0의 단일 상세 정보와 쿼리 소요 시간
cargo run -p goodgood-service --example network_cadence --release -- 500 # 기존 서비스의 0.5초 네트워크 속도 대조
cargo run -p goodgood-service --example sensor_cadence -- 60 # 기존 개발 서비스의 센서 상태, 판독값과 샘플링 지연
cargo run -p goodgood-core --example m3 --release         # 서비스, 시작 프로그램, 연결과 파일 사용 프로세스 1회 쿼리
cargo run -p goodgood-core --example lockers -- C:\Windows\System32\ntdll.dll   # 지정한 파일을 사용하는 프로세스
cargo run -p goodgood-core --example gpu_processes --release   # 프로세스별 GPU 사용률과 수집 소요 시간
cargo run -p goodgood-core --example gpu_diagnostics --release -- <PID> 10  # 해당 프로세스의 GPU 엔진, 전체 타이밍과 NVML 연속 대조
cargo run -p goodgood-core --example gpu_compute --release     # NVIDIA Turing 이상: 제한된 CUDA 테스트 부하
cargo run -p goodgood-core --example app_windows --release     # "앱"으로 분류되는 프로세스(작업 표시줄 창 보유)와 탐색 소요 시간
cargo run -p goodgood-core --example sessions --release        # 사용자가 로그인한 세션, 세션별 프로세스 수와 열거 소요 시간
cargo run -p goodgood-core --example history --release -- 60  # 60초 기록: 샘플링마다의 비용, 프레임 크기, 쿼리 소요 시간
```

`disk_details`는 표준 권한으로 지정한 물리 디스크 번호를 한 번 읽고 종료하며 JSON, 각 쿼리 상태와 소요 시간을 출력합니다. 기본값은 일련 번호를 가리며 장치 신원을 확인해야 할 때 `--include-serial`을 덧붙입니다. `--extended`는 현재 프로세스 권한으로 서비스가 사용하는 고정 ATA／SAT／SCSI 읽기 전용 쿼리를 실행하고 권한이 부족하면 해당 상태를 반환합니다. 이 예제는 애플리케이션과 상주 샘플링에서 독립적이며 장치 구성을 변경하지 않습니다.

`sessions`는 기본적으로 계정 이름을 글자로 바꾼 출력을 만들어 보고서에 바로 첨부할 수 있게 합니다. `--names`를 덧붙이면 "도메인\계정 이름"을 표시합니다.

`sampling_cadence`는 1초에 한 번 샘플링하며 인수는 횟수(1–300)입니다. `--trace`는 고정 수집 단계의 시작과 끝, 소요 시간을 기록하고 출력에는 시각, 순번과 개수만 담깁니다. 이 기록으로 네이티브 쿼리 지연과 인터페이스 갱신 문제를 구분할 수 있습니다. 네이티브 쿼리와 스냅숏 수집이 서로 다른 스레드에서 끝날 수 있으므로 단계 기록은 이름으로 짝을 맞춥니다.

독립 실행 진단 도구는 호스트의 정적 VC 런타임 구성을 재사용합니다. 먼저 `cargo build -p goodgood-service --bins --release`로 호스트 릴리스 빌드에 필요한 보조 프로그램을 준비한 뒤 `cargo build -p goodgood --example startup_diagnostics --release`를 실행합니다. 실행할 때 `--stage collector|gpu-windows|nvml --output <새 로그 파일>`을 반드시 지정하며 한 번에 한 갈래만 수행합니다. `collector`는 전체 수집기를 만들고 스냅숏을 한 번 가져오며, `gpu-windows`는 NVML／ADL／IGCL을 불러오지 않고 Windows GPU 쿼리를 사용하고, `nvml`은 NVIDIA SDK만 초기화해 기존 읽기를 수행합니다. 이 도구는 인터페이스를 만들지 않고 권한 있는 서비스를 요청하지 않으며 네트워크 ETW를 켜지 않습니다. 단계 기록은 즉시 디스크에 기록하고 출력 파일이 이미 있으면 덮어쓰지 않으며 인수가 없으면 수집을 수행하지 않습니다. 인터페이스 쪽의 독립 그래픽 대조는 [GPUI 개발](gpui.md)의 `--fixture`와 `--startup-trace`를 참고합니다.

`node scripts/test-process-roster.mjs <레이블> target/debug/goodgood.exe`는 격리되어 활성화되지 않는 개발 테스트 창을 시작하고 전체 개수 응답을 지연시킵니다. 이 테스트는 자신의 유휴 Node 자식 프로세스만 만들고 끝내면서 목록의 시기적절한 추가와 제거, 개수가 채워진 뒤 선택 유지, 늦게 온 응답이 종료된 프로세스를 되살리지 않는지, 시스템 곡선이 계속 갱신되는지를 확인합니다. 지연 진입점은 개발 빌드의 `--test` 인스턴스에서만 노출됩니다. 창 캡처와 결과는 `target/native-validation/<레이블>`에 있고 끝나면 테스트 설정을 정리합니다.

`process_sources`는 전체 `SystemProcessInformation` 스냅숏, 신원만 열거하는 `SystemBasicProcessInformation`, 가벼운 목록에 캐시한 핸들로 프로세스마다 개수를 세는 경로 세 가지를 대조합니다. 스크립트는 정순과 역순으로 각각 한 라운드를 실행하고 구간마다 예열 세 번을 제외하며 실제 경과 시간, 스레드와 프로세스 CPU 시간, 권한 적용 범위, 메모리와 핸들 비용을 기록합니다. 시간 초과 시에는 자신이 시작한 수집 프로그램만 끝냅니다. 결과는 `target/process-source-validation/<레이블>/report.html`과 같은 디렉터리의 JSONL에 있으며 `--report-only`를 덧붙이면 기존 기록으로 보고서를 다시 만듭니다. 도구는 표준 권한을 요구하고 자신의 전원 제한만 바꾸며 시스템 구성은 변경하지 않고 권한 있는 서비스에 접근하지 않습니다.

세 경로의 적용 범위는 서로 다릅니다. 가벼운 목록에는 PID, 부모 PID와 인스턴스 순번만 있습니다. 프로세스별 경로는 누적 CPU 시간, EX2 전용 작업 집합, 작업 집합, 커밋, 일반 I/O와 핸들 수를 수집하며 디스크 전용 바이트, 주기 기반 CPU 사용률, 스레드 수와 일시 중단 상태는 다른 출처가 필요합니다. 독립된 `compare` 단계는 앞뒤 두 번의 전체 스냅숏으로 프로세스별 판독값을 감싸고 생성 시간으로 인스턴스를 맞추어 누적 CPU/I/O 카운트의 구간과 메모리 차이를 검사합니다. 프로세스 자신은 수치 검증에서 제외합니다. 지원 여부는 실제 호출 결과로 판정하고 인터페이스를 지원하지 않으면 원래 오류 코드를 남깁니다.

`sensor_cadence`는 기본적으로 1초에 한 번 비차단 클라이언트로 읽으며 인수는 샘플링 횟수(1–300)입니다. `--direct`를 덧붙이면 서비스의 원본 응답과 대조하고, `--collector`는 전체 프로세스와 장치 수집을 클라이언트 경로에 넣어 긴 소요 시간의 영향을 확인하며, `--pause`는 중간에 소비를 20초 멈추어 독립 폴링을 검증합니다. 이미 실행 중이고 권한이 부여된 서비스만 요청하며 개발 빌드는 개발 서비스를, 릴리스 빌드는 정식 서비스에 연결합니다. 출력에는 센서 상태, 패키지 온도, 코어별 유효 필드 수, 코어 번호, 측정값 종류와 요청 소요 시간이 들어가며 서비스와 드라이버를 설치, 시작 또는 업데이트하지 않습니다.

`network_cadence`를 인수 없이 실행하면 네이티브 진단 진입점을 시작하고 프로그램 디렉터리에 `network-launcher.log`와 `network-results-*` 결과 디렉터리를 씁니다. 디렉터리가 읽기 전용이면 시스템 임시 디렉터리를 사용합니다. 이 진단은 기존 서비스, 로컬 전체 스냅숏, 0.5초 갱신과 ETW 원본 바이트 수를 차례로 대조하며 트래픽은 로컬 루프백으로 제한하고 항목마다 시간 제한은 60초입니다. 로컬 ETW 수집에는 해당 권한이 필요합니다. 자동 실행에는 `--suite --no-wait`를 사용할 수 있고, 단일 항목 인수는 `<간격밀리초> <시간초>`이며, `--collector`는 라운드마다 프로세스 스냅숏을 다시 수집하고, `--local`은 독립 ETW 세션을 사용하며, `--local --raw-local`은 원본 바이트 수를 출력합니다.

`--local --dual-local`은 독립 세션 두 개를 동시에 열고 8초에 그중 하나를 닫아 다른 세션이 계속 수집하는지 확인합니다. `cargo run -p goodgood-service --example network_provider --release -- --no-wait`는 manifest 공급자의 원본 구독, 동기 활성화, 전체 필터링과 전용 시스템 네트워크 채널을 대조하고 이벤트 메타데이터, 손실 개수와 테스트 프로세스의 송수신 바이트 수를 기록합니다. 시스템 채널의 격리 방식은 [Windows 시스템 추적 세션](https://learn.microsoft.com/en-us/windows/win32/etw/configuring-and-starting-a-systemtraceprovider-session)을 참고합니다.

`network_cadence`의 `--alternating`은 테스트 트래픽을 0.5초마다 번갈아 바꾸어 갱신마다 속도를 다시 계산하는지 확인합니다. 빠른 이벤트 전달에는 [ControlTrace의 FLUSH 작업](https://learn.microsoft.com/en-us/windows/win32/api/evntrace/nf-evntrace-controltracew)을 사용하며 독립 스레드에서 실행합니다.

`gpu_diagnostics`는 타임스탬프가 붙은 JSONL을 출력하며 대상 프로세스의 엔진 신원, 카운트 구간, 전체 사용량과 사용 가능한 NVIDIA 코어 판독값을 담습니다. 대조할 때는 같은 부하를 유지하고 어댑터, 엔진과 샘플링 구간을 확인합니다. `gpu_compute`는 12초 동안 40 ms 실행과 160 ms 휴식을 반복하는 짧은 CUDA 부하를 제출하며 실제 GPU 사용률은 카운터를 기준으로 합니다.
