# 수집 계층 goodgood-core

`crates/goodgood-core`는 Windows 시스템 조회와 프로세스 작업을 캡슐화합니다. 샘플링 결과는 직렬화 가능한 스냅숏으로 애플리케이션 서비스, 인터페이스와 진단 예제에 제공됩니다.

메타데이터 파싱은 샘플링과 분리되어 있습니다. 파서가 바쁘거나 셸 확장이 응답하지 않을 때 대기 중인 프로그램 경로는 최대 512개, 텍스트 페이로드는 최대 4 MiB, 애플리케이션 패키지는 최대 64개입니다. 제출에는 비차단 큐를 사용하며, 용량이 회복되면 이후 샘플링에서 다시 시도합니다. 가져오지 못한 이름과 아이콘은 프로세스 이름과 일반 아이콘을 사용합니다.

프로세스 네이티브 조회는 독립 스레드에서 실행되며, 라운드마다 최대 50 ms를 기다리고 동시에 하나의 조회와 번갈아 사용하는 두 개의 버퍼를 둡니다. 나중에 완료된 성공 응답은 다음 샘플링에서 받으며, 클럭과 시스템 주기 카운트는 원본 응답과 함께 저장하고 속도는 실제 두 번의 수집 사이 시간 간격으로 계산합니다. 대기하는 동안에는 마지막 유효 값을 유지하며, 마우스를 올리면 갱신 상태를 확인할 수 있습니다. 10초를 넘기면 `stale`로 표시하고 흐리게 보여 줍니다. 시스템, 장치 및 독립적으로 수집하는 GPU, 네트워크 지표는 계속 갱신됩니다. 재사용한 값은 `sampleReused`로 표시하고, 프로세스 및 애플리케이션 곡선은 빠진 구간을 남기며, 기록 평균은 중복 사용한 카운트를 제외합니다.

`SystemBasicProcessInformation`을 지원하는 시스템은 별도 스레드에서 PID, 부모 PID, 인스턴스 시퀀스 번호와 이름을 갱신하며 라운드마다 최대 5 ms를 기다립니다. 인터페이스를 사용할 수 없으면 전체 스냅숏을 그대로 사용합니다. 명단은 인스턴스 시퀀스 번호로 PID 재사용을 식별하며, 전체 스냅숏의 카운트는 검증된 핸들의 인스턴스 시퀀스 번호로 병합하고, 제한된 프로세스는 경량 명단이 조회 전후에 같은 인스턴스가 살아 있음을 확인하도록 요구합니다. 늦게 도착한 스냅숏은 이미 종료된 행을 되살리지 않고, 이전 인스턴스의 카운트를 새 인스턴스로 옮기지도 않습니다.

프로세스 조회 핸들은 실행 인스턴스별로 캐시합니다. 전체 스냅숏에서 스레드 수가 0이 되면 즉시 핸들을 해제하고, 처음 발견한 스레드 0개 기록에도 캐시 핸들을 만들지 않아 수집기가 보유한 참조 때문에 종료된 프로세스가 오래 남는 일을 막습니다. 종료 직전 마지막 구간의 CPU와 I/O 카운트는 그 스냅숏에서 계속 계산합니다. 일시 중단된 프로세스는 스레드와 조회 핸들을 유지합니다.

새로 발견한 프로세스는 `countersPending`으로 표시해 신원 정보를 보여 주고 전체 카운트를 기다리며, 인터페이스, 선택과 프로세스 곡선은 안정적인 `instanceKey`를 사용합니다. 생성 시간이 아직 확인되지 않으면 음수를 사용하고 프로세스 작업과 규칙 제출을 멈춥니다. 카운트가 도착하면 같은 행을 채웁니다. 기록은 프로세스별 결측 횟수로 분모를 계산하며, 카운트를 기다리는 행은 거짓 0 값을 만들지 않고 다른 프로세스의 평균을 부풀리지도 않습니다. 파일 형식은 호환성을 유지합니다. 시스템 전체 스레드와 핸들 수는 기존 `GetPerformanceInfo` 읽기에서 바로 가져옵니다.

새로 고침을 일시 중지한 상태에서 프로세스 작업이 요청한 새로 고침은 수집기가 작업을 받아들인 뒤 시작하는 네이티브 프로세스 조회까지 보류합니다. 재사용한 이전 값, 작업 전에 시작했으나 나중에 반환된 조회, 신원 명단만 갱신한 결과도 이 요청을 유지하며, 이후 샘플링은 원래 간격을 따르고 새 상태를 얻은 뒤 일시 중지된 표시를 되살립니다.

## 모듈

| 모듈 | 역할 |
|---|---|
| `diagnostics.rs` | 원본 오류 코드, 고정 오류 분류 및 실패에 직접 관여한 경로를 기록합니다. 경로는 길이를 제한하고 이스케이프하며, 반복되는 실패는 원인별로 빈도를 제한합니다. 서비스와 권한 상승 보조 프로그램은 크기가 제한된 버퍼로 호스트에 진단을 전달합니다 |
| `collector.rs` | 시스템 및 프로세스 샘플링을 하나의 스냅숏으로 합치고, 각 프로세스에 GPU 사용량과 작업 표시줄 창 보유 여부를 붙입니다 |
| `app_windows.rs` | `EnumWindows`로 작업 표시줄 창을 가진 프로세스를 찾습니다(표시 중, 소유자 없음, 도구 창·바탕 화면·작업 표시줄 제외). 인터페이스는 이 결과로 "앱"에 포함할지 판단합니다. 패키지 앱의 프레임 창은 그 안의 핵심 창이 속한 프로세스에 귀속합니다. DWM이 숨긴 창은 제외하고 다른 가상 데스크톱의 창은 포함합니다. 회당 약 0.3–0.7 ms |
| `process.rs` | 한 번의 `NtQuerySystemInformation(SystemProcessInformation)`으로 모든 프로세스와 스레드를 가져오고, 주기 카운트 차분으로 CPU를, 바이트 차분으로 I/O 속도를 계산합니다. 프로세스 표를 재사용하고 인스턴스마다 조회 핸들을 하나씩 캐시해 효율성 모드, I/O 및 메모리 우선 순위와 종료 후 최종 주기 값에 사용하며, 생성 시간을 검증해 PID 재사용을 막습니다. 선택적 열에 필요한 명령줄, 아키텍처와 권한 상승 상태는 독립 스레드가 PID와 생성 시간으로 인스턴스를 다시 열어 읽으므로 샘플링 스레드를 점유하지 않고, 다 읽지 못하면 최대 두 번 더 읽으며 인스턴스별로 캐시합니다. WebView2 프로세스는 파싱할 때 읽은 명령줄을 재사용하고, 새 프로세스가 나타나면 그 핸들로 앱 패키지 식별자를 읽습니다(개당 약 5 µs) |
| `sessions.rs` | `WTSEnumerateSessionsExW`로 사용자가 로그인한 세션을 나열합니다: 세션 번호, 계정 이름과 도메인, GoodGood이 있는 세션인지, 연결이 끊겼는지. 로컬 세션 관리자는 표준 권한으로 모든 세션을 반환하며, 시작할 때 한 번 읽고 이후 독립 스레드가 약 2초마다 읽어 샘플링은 최신 결과만 가져다 쓰고 기다리지 않습니다(이 호출에는 시간 제한이 없음). 결과는 스냅숏과 함께 제공되고, 인터페이스는 프로세스의 세션 번호로 사용자를 귀속합니다. `sign_out`은 한 사용자의 여러 세션을 로그오프합니다: 먼저 세션 목록을 다시 읽어 여전히 그 계정에 속한 세션만 처리하고(세션 번호는 재사용됨), GoodGood이 있는 세션은 `ExitWindowsEx`로 끝내 마지막에 두며 다른 세션은 `WTSLogoffSession`을 사용하고 후자는 관리자 권한이 필요합니다 |
| `paths.rs` | 표준 권한으로 조회할 수 있는 이미지 경로를 `SystemProcessIdInformation`으로 먼저 얻어 DOS 경로로 매핑합니다. 장치 매핑이 없으면 제한된 조회 권한으로 Win32 경로를 얻고, 경로 접미사로 검증한 드라이브 매핑을 캐시합니다. 프로세스가 열기를 거부하면 `GLOBALROOT` 확장 경로를 파일 인터페이스용으로 사용하며, 장치 매핑 조회 실패는 원본 오류 코드로 기록합니다 |
| `meta.rs` | 백그라운드 스레드에서 파일 설명, 회사 이름과 아이콘(PNG)을 경로별로 캐시하며 파싱합니다. 일반 경로는 셸 아이콘을 사용하고 `GLOBALROOT` 같은 확장 경로는 `SHDefExtractIconW`로 실행 파일 리소스를 읽습니다. 시스템 구성 요소 디렉터리와 버전 리소스를 함께 사용해 Windows 구성 요소를 식별하며, 샘플링 스레드에서 파일을 다시 읽지 않습니다. 앱 패키지 이름은 다른 백그라운드 스레드가 파싱하고(셸은 앱당 약 10–50 ms이며 아이콘 처리를 늦추지 않음), 패키지 버전과 앱별로 캐시합니다. 1분마다 유휴 항목을 확인해 10분을 넘긴 경로와 패키지 버전을 전용 아이콘과 함께 회수하며, 내용이 같은 아이콘은 PNG 하나를 공유합니다. 표시 중인 스냅숏은 PNG 참조를 보유하므로 일시 중지하거나 숨긴 뒤에도 원래 아이콘을 표시할 수 있고, 회수한 아이콘 ID는 다시 쓰지 않습니다 |
| `package.rs` | MSIX 패키지의 AUMID, 패키지 전체 이름과 지역화된 표시 이름을 읽습니다. 매니페스트의 `Executable`로 앱 주 프로세스를 식별하고 다른 프로세스는 각자의 파일 설명을 유지합니다. 이름 확인은 최대 3초까지 기다립니다 |
| `webview.rs` | 다른 앱이 시작한 WebView2 프로세스를 식별합니다. 부모 프로세스, 생성 시간, 세션과 런타임 경로로 묶고 인스턴스별로 파싱 결과를 캐시합니다. 시작 인수 읽기에 실패하면 최대 세 번 시도하며, 스냅숏에는 호스트 이름, 아이콘과 프로세스 역할만 담깁니다 |
| `system.rs` | 전체 CPU와 논리 프로세서별 CPU(모두 커널 시간 포함), 메모리, 커밋, 캐시. 표준 권한으로 `SystemMemoryListInformation`을 조회해 수정된 페이지, 우선 순위별 대기 페이지, 빈 페이지와 0으로 지워진 페이지를 얻습니다. 메모리 구성은 서로 겹치지 않는 페이지 목록으로 표시하고 캐시됨은 대기와 수정됨의 합입니다. 조회할 수 없으면 총량을 표시하고 구성 세부는 비워 둡니다 |
| `cpu.rs` | 프로세서 그룹별로 독립 유휴 카운트와 주기 카운트를 읽어 프로세서 클럭과 네이티브 카운트의 단위, 연속성과 분모를 검증합니다. 이상이 있으면 기준선을 다시 세우거나 시간 카운트로 물러납니다 |
| `details.rs` | 필요할 때 단일 프로세스를 조회합니다: 명령줄, 사용자, 무결성 수준, 아키텍처, 우선 순위, 버전 |
| `services.rs` | 서비스 제어 관리자(SCM)를 통해 한 번의 `EnumServicesStatusExW`로 모든 서비스 상태를 얻습니다. 시작 유형, 경로와 설명은 서비스마다 RPC 세 번이 필요하므로 캐시하고 가끔 새로 고칩니다. 이름과 설명은 MUI에서 인터페이스 언어로 읽습니다. 서비스 시작·중지와 시작 유형 변경 |
| `startup.rs`, `startup/packaged.rs` | 레지스트리 Run 키, 시작 폴더(.lnk 확인)와 현재 계정의 앱 패키지 시작 작업. 전통적인 항목은 `StartupApproved`를 사용하고, 앱 패키지는 AppModel 등록 상태, 첫 활성화와 사용자 승인 표시를 함께 사용해 사용 여부를 판단하며 비활성화 시각을 기록합니다. 프로그램 이름과 앱 패키지 지역화 이름을 표시하고 원래 항목 식별자는 유지합니다. 패키지 매니페스트와 이름은 패키지 버전, 위치와 매니페스트 수정 시각별로 캐시하고, 상태는 매번 다시 읽습니다 |
| `connections.rs` | TCP / UDP(IPv4 / IPv6) 엔드포인트와 소유 프로세스(`netstat -ano`가 보여 주는 내용). IPv4 TCP 연결 끊기 |
| `filelock.rs` | 현재 계정 권한으로 Restart Manager를 통해 파일을 열거나 DLL을 로드한 프로세스를 찾습니다. 일괄 조회가 거부되면 이분 탐색으로 다시 시도하고 확인할 수 없는 파일은 분리합니다 |
| `handles.rs` | 필요할 때 시스템 File 핸들을 열거하고, 복제한 뒤 `NtQueryObject`로 종류와 이름을 조회하며, 파일 ID로 파일을(하드 링크 포함) 경로 경계로 디렉터리와 하위 항목을 일치시킵니다. 보조 프로세스에서만 실행되며 진행 상황과 일치 항목을 스트리밍으로 보고합니다 |
| `actions.rs` | 프로세스 / 프로세스 트리 끝내기, 우선 순위 설정, I/O 우선 순위(`ProcessIoPriority`, 매우 낮음·낮음·보통만)와 메모리 우선 순위(`ProcessMemoryPriority`), 효율성 모드 켜기·끄기(EcoQoS와 낮은 우선 순위, 시스템 작업 관리자와 동일), 프로세스 일시 중단과 다시 시작(`NtSuspendProcess`/`NtResumeProcess`, 각각 한 번 호출하고 최대 250 ms 동안 스레드 상태를 확인). 모두 PID와 시작 시간을 먼저 검증해 PID 재사용을 막습니다. 끝내기와 일시 중단에서는 핵심 시스템 프로세스를 막고, 일시 중단에서는 `dwm.exe`와 GoodGood 권한 있는 서비스도 거부합니다. Windows가 동결한 프로세스(`PROCESS_EXTENDED_BASIC_INFORMATION`의 IsFrozen, 예를 들어 백그라운드 앱 패키지)는 양방향 모두 거부합니다 |
| `gpu_process.rs` | 프로세스별 GPU: 샘플링마다 PDH 조회 하나로 각 엔진 사용량을 읽습니다. 성능 페이지에 나열된 어댑터만 집계하고, 카운터가 함께 덮는 Microsoft Basic Render Driver(CPU로 렌더링) 등은 포함하지 않으며, 그런 어댑터가 없으면 조회를 만들지 않습니다. 카운터에 열거가 반환하지 않은 LUID가 나타나면(드라이버 업데이트 후 어댑터가 새 LUID로 다시 시작하거나 이후에 연결한 그래픽 카드) `collector.rs`가 어댑터를 다시 열거하며 최대 10초에 한 번이고, 성능 페이지와 프로세스 페이지는 다음 샘플링부터 함께 갱신됩니다. 시작할 때 그래픽 카드가 없으면 조회를 만들지 않고, 이후 연결한 그래픽 카드는 GoodGood을 다시 시작한 뒤에 나타납니다. VRAM은 `GPU Process Memory`의 `Local Usage` / `Non Local Usage` 상주 카운트를 PID, 전체 LUID와 물리 어댑터로 중복 제거해 사용하며 결측과 0 값을 구분합니다. 통합 메모리(내장) 어댑터의 local 그룹에는 공유 시스템 메모리가 포함되므로 `hardware/gpu.rs`가 `KMTQAITYPE_GETSEGMENTGROUPSIZE`의 non-local 용량이 0인지로 식별하고, 이런 어댑터는 `Dedicated Usage`(커밋된 양)를 넘지 않는 부분만 전용으로, 나머지는 공유로 계산합니다. 가장 바쁜 엔진 외에도 0이 아닌 노드 기여와 전체 신원을 유지해 앱 및 분류 집계에 사용합니다 |
| `disk_process.rs` | 일반 프로세스 정보의 디스크 카운트 꼬리를 먼저 재사용하고, 오래된 시스템에서는 전체 프로세스 정보의 확장 레코드로 물러나 PID, 생성 시간과 출처 샘플링 시각으로 속도를 환산합니다. 확장 스레드 배열과 디스크 레코드 경계를 항목마다 확인하고 문자열과 계정 데이터는 읽지 않습니다. Windows 10의 전체 레코드 꼬리는 UTF-16에 맞춰 정렬되어 있고, 8바이트 정렬이 아닌 뒤따르는 레코드와 호환되도록 값을 바이트 단위로 해독합니다. 일반 꼬리는 시스템 버전, 반환 길이와 이미지 이름 경계 검사를 함께 통과해야 하며, 전체 정보 조회는 관리자 호스트의 백그라운드 리더나 권한 있는 서비스가 수행합니다 |
| `net_process.rs` | 프로세스별 네트워크: 독립 GUID의 전용 시스템 ETW 세션을 먼저 사용하고 `NETWORK_TCPIP`만 켭니다. 시스템 세션을 쓸 수 없으면 `Microsoft-Windows-Kernel-Network`로 물러납니다. 공급자별로 이벤트 ID와 작업 코드를 구분하고 TCP / UDP, IPv4 / IPv6 송수신 바이트를 해석하며 재전송과 복제 이벤트는 제외합니다. 로컬 및 서비스 클라이언트는 샘플링 주기로 속도를 환산하고, 최소 집계 창은 0.5초이며 50 ms의 스케줄링과 IPC 흔들림을 허용하고 프로세스 인스턴스를 검증합니다. 빠른 샘플링에서는 독립 스레드가 250 ms마다 이벤트를 실시간 소비자에게 전달합니다. 1.5초 동안 빠른 읽기가 없으면 추가 새로 고침을 멈추고 ETW 자체의 1초 주기 타이머를 사용합니다. 세션을 닫기 전에 새로 고침 스레드를 먼저 멈춥니다. 서비스는 `take_bytes`로 여러 읽기 주체의 누적 카운트를 유지합니다. 세션을 시작하려면 해당 권한이 필요하고, GUI와 서비스는 각자의 세션 이름을 유지하며 남은 세션을 각자 정리합니다. 로그에는 선택한 출처를 기록하고, 시작 후 5초와 이후 30초마다 ETW 손실 카운트를 확인합니다 |
| `rules.rs` | 규칙 엔진: 프로그램 이름으로 일치시키고 새 프로세스가 나타날 때 한 번 적용합니다. `apply_with`는 호스트 백그라운드 스레드가 로컬 또는 서비스 실행기를 선택하게 하며, 규칙이나 권한 출처가 바뀌면 다시 확인합니다. 적용됨, 권한 부족과 그 밖의 실행 실패 횟수를 각각 집계합니다 |
| `history.rs` | 기록: 샘플링을 5초 한 프레임으로 요약하고(CPU 평균과 최댓값, 메모리, 디스크와 네트워크 처리량, 가장 바쁜 GPU, 배터리 잔량과 충·방전 전력, 그리고 CPU, 메모리, I/O, GPU, 네트워크별로 가장 높은 몇 개의 프로세스), 샘플링이 없는 5초는 프레임을 쓰지 않으며(백그라운드 새로 고침 간격이 5초보다 길면 프레임도 드물어짐), 하루(UTC)에 하나씩 바이너리 파일에 이어 쓰고 7일간 보존합니다. 프레임마다 통째로 쓰고 플러시하며, 다시 열 때는 충돌로 남은 반쪽 프레임을 잘라 냅니다. 프로세스 이름은 파일 안에 한 번만 씁니다. 읽는 쪽은 시간 범위로 버킷을 집계하거나(빈 버킷은 출력하지 않고 곡선에 끊긴 구간을 남김) 특정 시각에 가장 가까운 프레임을 가져옵니다. 그 밖에 사용량 통계, 삭제와 만료 정리가 있습니다. 샘플링당 약 30 µs, 프레임당 약 460바이트 |
| `pdh.rs` | PDH 조회의 얇은 래퍼로 `sensors.rs`와 `gpu_process.rs`가 공유합니다 |
| `privilege.rs` | GoodGood 자체의 권한 상승 상태, SeDebugPrivilege 활성화, 자체 우선 순위 높이기 |
| `theme.rs` | 시스템 개인 설정 색(강조 색) |
| `i18n.rs` | 네이티브 계층의 문구: 컴파일 시 `locales/*/native.json`을 포함하고 `tr!`이 현재 언어로 찾습니다. 프로세스 수준 언어는 기본적으로 부모 프로세스가 `GOODGOOD_LOCALE`로 전달한 값을 쓰고, 없으면 Windows 표시 언어를 쓰며 호스트가 설정으로 다시 덮어씁니다 |
| `nt.rs` | `windows` crate가 (완전히) 제공하지 않는 네이티브 구조로, 레이아웃은 phnt 헤더의 x64 버전을 따릅니다 |

## 프로세스 부가 카운트

프로세스 열의 부가 카운트는 같은 `SystemProcessInformation`에서 나옵니다. 사용자 모드/커널 모드 CPU 시간은 100 ns를 밀리초로 환산하고, 작업 집합 최댓값, 가상 주소 공간과 누적 I/O는 바이트로, 페이지 폴트는 횟수로 유지합니다. 가상 주소 공간은 예약과 커밋된 범위를 포함하며, 이 값과 작업 집합 최댓값은 단일 프로세스 기준으로 표시합니다. `ProcessCounters`는 프로세스 JSON에 펼쳐 넣으므로 샘플링이 프로세스별 시스템 호출을 늘리지 않습니다. 인터페이스는 여전히 PID와 생성 시간으로 프로세스 인스턴스를 연결합니다. 구조 필드와 단위는 [Windows 프로세스 스냅숏](https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntquerysysteminformation)과 [메모리 카운트](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters)를 참조하십시오.

프로세스 VRAM은 상주 카운트를 사용하며 DXGI 예산 사용량과 같은 기준을 따릅니다. 외장 그래픽 카드의 local 그룹은 VRAM, non-local 그룹은 공유 시스템 메모리이고, 통합 메모리(내장) 그래픽 카드는 공유 시스템 메모리도 local 그룹에 넣습니다. `Dedicated Usage` / `Shared Usage`는 다른 커밋 카운트 묶음으로, 일부 Windows/드라이버 조합에서 비정상적으로 누적되므로 상주 카운트의 대체 출처로 쓰지 않고 통합 메모리 그래픽 카드에서 전용 부분의 상한으로만 사용합니다. 출처 관계는 [System Informer의 GPU 카운트 구현](https://github.com/winsiderss/systeminformer/blob/master/plugins/ExtendedTools/counters.c)과 [Microsoft의 카운트 이상 설명](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/gpu-process-memory-counters-report-wrong-value)을 참조하십시오. 앱 그룹은 구성원의 유효 값을 합산하고 구성원 중 하나라도 없으면 알 수 없음으로 남깁니다. 시스템 전체 VRAM은 계속 어댑터 통계에서 가져와 중복 귀속된 공유 리소스가 물리 총량에 들어가지 않게 합니다.

## CPU 사용률

전체와 논리 프로세서별 사용률은 `SystemProcessorIdleInformation`의 독립 유휴 시간과 `SystemProcessorPerformanceInformation`의 전체 시간 차분을 사용합니다. 독립 유휴 시간은 일부 시스템의 오래된 `IdleTime`이 짧은 실행을 유휴로 계산하는 문제를 피할 수 있습니다. 프로세서는 `(group, processor)` 쌍으로 맞추고, 전체 사용률은 원본 시간을 먼저 합산한 뒤 환산해 코어별 양자화 오차를 잘라 낸 값을 더하지 않습니다. 출처가 없으면 같은 출처의 짝지은 값만 사용하고, 카운트가 초기화되거나 그룹이 바뀌면 기준선을 다시 세웁니다. 커널 사용률은 Windows 시간 카운터가 실제로 보고한 커널 실행량을 유지하며, 이전 유휴 시간과 새 유휴 시간의 차이를 커널 작업으로 돌리지 않습니다. 논리 프로세서별 커널 사용률(`coreKernel`, `cores`와 같은 순서)은 같은 조회의 같은 구간에서 가져오므로 추가 시스템 호출이 필요 없고, 독립 유휴 카운트와 이전 카운트가 짧은 구간에서 클럭 눈금 하나만큼 다를 수 있으므로 커널 사용률은 그 프로세서의 사용률을 상한으로 둡니다.

독립 유휴 조회는 성공했는데 카운트가 늘지 않고 이전 유휴 카운트는 늘어나면, 그 프로세서는 현재 구간에서 이전 유휴 차분으로 물러납니다. 둘 다 늘지 않으면 계속 최대 부하로 계산합니다. 독립 카운트가 다시 늘기 시작하면 자동으로 사용을 재개하고, 물러난 구간은 프로세스 CPU의 정확한 유휴 비율 검증에 참여하지 않습니다.

프로세스 사용률은 `SystemProcessInformation.CycleTime` 차분을 사용하며, 분모는 검증된 프로세서 클럭 증분에 시스템 전체 논리 프로세서 수를 곱한 값입니다. Windows가 커널 전환이 없는 QPC 시간 기준을 선택하고 주기 단위가 독립 유휴 카운트나 전체 네이티브 주기 총량과 일치할 때만 사용하며, 클럭 속도, 카운트 단조성, 샘플링 간격과 프로세서 수를 함께 확인합니다. 이 분모는 샘플링 간격 전체를 덮으므로 그 사이에 생성되고 종료된 프로세스도 포함합니다. 시간 기준을 확인할 수 없거나 특정 프로세스 카운트가 무효면 CPU 시간 차분으로 물러납니다. 누적 CPU 시간은 Windows의 사용자 모드와 커널 모드 시간을 그대로 사용합니다. 위 조회는 모두 표준 권한을 사용합니다.

## hardware/

성능 페이지의 장치 데이터입니다. 데이터 출처와 한계에 대한 사용자용 설명은 [하드웨어 데이터의 출처와 한계](../guide/hardware-data.md)를 참조하십시오.

| 모듈 | 역할 |
|---|---|
| `cpu.rs` | 모델, 토폴로지(각 논리 프로세서가 어느 코어에 속하고 성능 코어, 효율 코어, 저전력 효율 코어 중 무엇인지), 캐시, 가상화 |
| `sensors.rs` | 표준 권한에서 PDH로 CPU 주파수, ACPI 온도와 사용 가능한 전력 카운트를 일괄 조회합니다. 주파수는 `Actual Frequency`의 MHz 값을 우선 사용하고 전체 항목이 없으면 논리 프로세서별 값을 평균하며, 같은 종류의 코어가 하나뿐일 때만 기준 주파수와 성능 백분율 대체 값을 사용합니다. 전력은 도메인별로 여러 패키지의 유효 값을 합산하고 유효한 0 값은 유지하며 결측, 음수와 비유한 값은 걸러 냅니다 |
| `battery.rs` | 배터리 클래스 드라이버 IOCTL: 잔량, 충·방전 전력, 전압, 설계 / 완전 충전 용량, 사이클 횟수. 표준 사용자도 배터리 장치를 읽기 전용으로 열 수 있습니다 |
| `memory.rs` | SMBIOS(유형 17)의 메모리 모듈을 파싱합니다: 속도, 슬롯, 폼 팩터, DDR 세대 |
| `disk.rs` | `FILE_ANY_ACCESS` 저장소 IOCTL로 모델, 용량, 매체, 볼륨과 온도를 조회하고, `IOCTL_DISK_PERFORMANCE`로 활동 시간, 전송 속도와 응답 시간을 계산합니다. 온도는 NVMe, SATA와 ATA 버스의 디스크에만 조회합니다 |
| `disk/access.rs` | 캐시한 핸들로 PnP 제거 알림을 등록합니다. 꺼내기 요청에서는 핸들을 닫고 접근을 멈추며, 꺼내기가 취소되면 다시 열고 샘플링 세대를 바꿉니다. 알림을 쓸 수 없으면 조회 중에 임시 핸들을 사용합니다 |
| `disk/volumes.rs` | 물리 카운트 인터페이스를 지원하지 않으면 볼륨 계층 카운트를 읽습니다. 같은 볼륨 핸들에서 디스크 귀속을 검증하고 공급자와 장치 번호로 중복 제거하며 기준선을 따로 유지합니다. 볼륨 하나면 활동 시간을, 여러 개면 속도 합계와 가중 응답 시간을 제공합니다 |
| `disk_details.rs`, `disk_details/` | 디스크 세부 정보의 단일 읽기 전용 조회: 기본 신원, 섹터, TRIM, NVMe 컨트롤러 신원과 상태 로그, PCIe 링크, Windows 고장 예측. 기존 권한 있는 서비스가 ATA/SAT 신원과 SMART 특성, SCSI 상태 로그를 보충합니다. 프런트엔드의 명시적 요청으로만 실행되고 결과는 주기 샘플링과 분리되어 있습니다 |
| `net.rs` | 네트워크 어댑터: 인터페이스 표(`GetIfTable2`)로 처리량을, `GetAdaptersAddresses`로 주소를 가져옵니다 |
| `gpu.rs` | D3DKMT로 노드 타이밍, VRAM과 성능 데이터를 조회합니다. 노드별로 타이밍 기준선을 유지하고 조회 실패나 카운트 초기화 후 다시 세우며, 선택적 성능 조회는 5초 간격으로 다시 시도합니다. 열거할 때 나열되지 않는 어댑터(소프트웨어 렌더링, 표시 전용, 계산 전용)를 기록하고, 다시 열거할 때 남아 있는 어댑터는 핸들과 타이밍 기준선을 유지하며 열거에 실패하면 기존 목록을 그대로 둡니다. 사용률은 유효한 프로세스 엔진 값과 NVIDIA 코어 사용률을 결합하고 출처를 밝힙니다. PCI 주소는 벤더 장치를 맞추는 데 사용합니다 |
| `gpu/metadata.rs` | 열거할 때 드라이버 버전, INF 드라이버 날짜와 DirectX 기능을 한 번에 읽어 공유 `GpuInfo`에 저장합니다. PnP 속성과 DXGI 어댑터는 모두 전체 LUID로 맞추고, Direct3D 12는 빈 장치로 최고 기능 수준을 탐색하며 실패하면 Direct3D 11을 조회합니다. 없는 필드는 알 수 없음으로 두고 주기 샘플링은 결과를 재사용합니다 |
| `vendor_gpu/` | AMD ADL2 PMLog / Overdrive와 Intel IGCL의 전원 도메인 및 장치 원격 측정. 독립 스레드가 System32 라이브러리를 로드해 데이터를 읽고, 용량 1의 요청 큐와 최소 500 ms 수집 간격을 두며 만료된 캐시는 스냅숏에 넣지 않습니다. IGCL의 온도, 주파수, 전압과 칩 에너지는 전원 도메인 열거에 의존하지 않습니다. 지원 표시, 단위, 종류와 범위를 항목마다 검증하고 유효한 0 값은 유지하며, 실패하면 5초 간격으로 다시 시도합니다. `ControlLib.dll`은 로드 후 종료할 때까지 프로세스에 고정됩니다. 이 라이브러리가 등록한 ETW 공급자는 `ctlClose`와 언로드로 등록 해제되지 않으므로, 언로드한 뒤 추적 세션이 그 공급자를 켜면 시스템이 이미 언로드된 콜백을 호출해 프로세스가 충돌합니다 |
| `kernel_sensors.rs` | 권한 있는 서비스와 공유하는 고정 CPU 센서 스냅숏. 정의된 전력, 전압, 전류, 클럭과 제한, 물리 코어별 값, SMU 상태 및 메인보드 팬, 전원 레일과 온도를 열거하며, 선택적인 내장 GPU 온도, 주파수와 VID도 포함합니다. 호스트가 스위치에 따라 비동기로 보충하고, 내장 GPU 필드와 PP1 전력은 단일 소켓 Intel 시스템에서 PCI `0:2:0`의 유일한 Intel 어댑터에만 매핑되며 그래픽 카드 드라이버가 제공하는 값과 출처별로 병합합니다 |
| `nvml.rs` | NVIDIA 보드 전력, 전력 상한과 선택적인 GPU 코어 사용률: System32에서 드라이버에 포함된 `nvml.dll`만 로드하고 PCI 위치로 맞추며, 지원하지 않거나 무효한 값은 보충에 쓰지 않습니다. 코어 사용률은 일부 드라이버의 네이티브 노드 타이밍이 놓친 CUDA 같은 부하를 덮는 데 사용하고, 별도의 Windows 엔진 곡선을 대체하지 않습니다 |

CPU 가상화 상태는 Windows의 사용 가능 표시를 우선 사용합니다. Hyper-V나 VBS가 가상화 확장을 점유하고 있으면 `Hv#1` 인터페이스의 `CreatePartitions` 권한으로 호스트를 식별합니다. 일반 가상 머신 게스트는 계속 사용 가능한 가상화 확장으로 판단합니다. 권한 비트 정의는 [Hyper-V 파티션 권한](https://learn.microsoft.com/en-us/virtualization/hyper-v-on-windows/tlfs/datatypes/hv_partition_privilege_mask)을 참조하십시오.

CPU 동적 주파수의 대체 기준은 CPUID나 Windows 전원 인터페이스에서 가져옵니다. 레지스트리 `~MHz`는 TSC/참조 클럭을 나타낼 수 있어 동적 주파수 환산에서 제외했습니다. 하이브리드 아키텍처는 토폴로지 분류와 [CPUID Hybrid 표시](https://www.intel.com/content/www/us/en/developer/articles/guide/12th-gen-intel-core-processor-gamedev-guide.html)를 함께 사용해 식별하며, 분류가 Windows 토폴로지 API에 노출되지 않은 경우에도 통일된 기준을 적용하지 않습니다. Windows는 Intel의 효율 코어와 저전력 효율 코어(LP E-core)를 같은 효율 분류로 묶으므로 둘을 3차 캐시로 구분합니다. 저전력 효율 코어는 나머지 코어가 공유하는 3차 캐시 밖에 있습니다. 이는 Intel이 Meteor Lake에 제시한 [판별 방법](https://community.intel.com/t/detecting-lp-e-cores-on-meteor-lake-in-software/121766)(CPUID.1A의 코어 종류가 Atom이고 CPUID.4에 3차 캐시가 없음)과 같은 근거를 쓰되, 스레드를 각 프로세서에 묶어 CPUID를 실행할 필요 없이 `GetLogicalProcessorInformationEx`의 캐시 토폴로지를 읽는 방식입니다. Intel 프로세서에만 적용하고 다른 제조사의 밀집 코어는 효율 코어로 둡니다. 주파수 카운트는 `PDH_FMT_NOCAP100`으로 터보 비율을 유지하며 PDH 상태, 값 범위와 프로세서 그룹 대응 관계를 계속 검증하고, 다른 카운터는 기존 형식을 유지합니다.

주기 샘플링의 장치 핸들은 [CM_Register_Notification](https://learn.microsoft.com/en-us/windows/win32/api/cfgmgr32/nf-cfgmgr32-cm_register_notification)으로 제거 이벤트를 등록합니다. 꺼내기 콜백은 진행 중인 조회나 다시 열기 작업이 끝날 때까지 기다린 뒤 핸들을 닫고 성공을 반환합니다. 꺼내기 취소는 상태만 갱신하고 샘플링 스레드가 장치를 다시 열어 카운트 기준선을 초기화합니다. 알림 등록 해제는 핸들을 소유한 스레드에서 수행하고 콜백이 끝나기를 기다린 뒤 컨텍스트를 해제하며, [CM_Unregister_Notification](https://learn.microsoft.com/en-us/windows/win32/api/cfgmgr32/nf-cfgmgr32-cm_unregister_notification)의 수명 주기 요구 사항을 따릅니다.

볼륨 계층 대체 경로는 접근 권한이 0인 핸들을 사용합니다. 읽을 때마다 먼저 `IOCTL_VOLUME_GET_VOLUME_DISK_EXTENTS`로 유일한 물리 디스크를 확인한 뒤 카운트를 조회합니다. `PARTMGR`/`PhysDisk`의 물리 결과는 디스크 번호도 일치해야 하고, 볼륨 결과는 Windows의 `VOLMGR`/`FTDISK`/`DMIO`/`LogiDisk` 공급자를 받아들입니다. 범위는 [DISK_PERFORMANCE](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntdddisk/ns-ntdddisk-_disk_performance)의 공급자와 장치 신원으로 판단합니다. 임시 볼륨 핸들은 상위 디스크의 조회 보호 기간에 열고 닫으며, 제거 응답은 그 작업이 끝나기를 기다립니다. 별도의 장기 볼륨 핸들을 보유하지 않고 diskperf를 호출하거나 카운터의 레지스트리 구성을 바꾸지도 않습니다.

디스크의 모델, 매체, 용량, 볼륨 매핑과 성능 카운트는 Windows의 클래스 드라이버, 파티션 관리자와 Storport가 응답합니다. 온도 조회(`StorageDeviceTemperatureProperty`)와 NVMe 프로토콜 조회는 저장소 컨트롤러의 미니포트 드라이버가 처리하며, 요청에 시간 제한이 없어 보낸 뒤 사용자 모드에서 취소할 수 없습니다. RAID 계열 컨트롤러(Intel RST, VMD 및 제조사 RAID)는 뒤에 있는 디스크를 모두 RAID 버스로 제시하며 시스템 디스크도 대개 그 안에 있습니다. [Intel RST 17.5에서 이 온도 조회가 반환되지 않고 Windows가 응답을 멈춰 전원을 껐다 켜야 했던 보고](https://github.com/boykopovar/AnyPS5/pull/16061)가 있고, Intel은 [RST 18.6.1.1016의 해결된 문제](https://downloadmirror.intel.com/773229/Release_Notes_18_7_6_1010_3_enduser_PV.pdf)에 "NVMe IOCTL을 D3 상태에서 보내면 완료되지 않음"을 올렸습니다. 따라서 온도는 NVMe, SATA와 ATA 버스의 디스크에만 조회하고, 디스크 세부 정보는 RAID 버스에 NVMe 프로토콜 조회를 보내지 않으며, 나머지 버스의 디스크 온도는 알 수 없음으로 남깁니다.

## 디스크 세부 정보 인터페이스

호스트 명령 `disk_details`는 `{ "index": 0 }`을 받아 `goodgood_service::disk_details(index)`를 호출하고 `PhysicalDrive` 번호에 해당하는 `DiskDetails`를 반환합니다. 먼저 로컬의 접근 권한 0 핸들로 `hardware::disk_details::query(index)`를 호출하고, ATA, SATA, USB, SCSI, SAS, RAID 장치는 이미 실행 중인 권한 있는 서비스로 보충 조회합니다. 요청마다 새로운 SMART 데이터를 읽고 완료 후 핸들을 닫습니다. 디스크 온도와 활동률은 주기 샘플링이 따로 유지합니다.

장치는 접근 권한 0으로 열고 Windows 저장소 속성 조회로 읽습니다. PCIe 매개변수는 물리 디스크 번호에 맞는 PnP 장치 트리에서 가져오고 가장 가까운 PCI 컨트롤러 노드의 속성만 사용합니다. 시스템에 있는 현재 권한을 사용하며, 장치나 드라이버가 거부하면 해당 상태를 반환합니다.

| 반환 항목 | 내용과 단위 |
|---|---|
| `identity`, `capacityBytes`, `volumes` | 모델, 펌웨어, 일련 번호, 버스와 원래 버스 번호, 이동식 표시, 바이트 용량과 드라이브 문자 |
| `solidState`, `logicalSectorBytes`, `physicalSectorBytes`, `trimEnabled` | 매체 종류, 논리/물리 섹터 바이트 수, Windows 저장소 스택의 TRIM 지원 |
| `pcieLink` | 현재와 컨트롤러 최대 링크의 PCIe 세대, 레인 수. 없는 부분은 `null`이고 최댓값은 컨트롤러 끝점 기능에서 가져옵니다 |
| `nvmeIdentity` | NVMe 버전, 펌웨어와 신원, 휘발성 쓰기 캐시 기능, Dataset Management 기능, 경고/심각 온도 임계값 |
| `nvmeHealth` | 심각 경고 원본 비트, 사용 가능한 예비 공간과 임계값, 사용된 수명 백분율, 남은 수명 추정, 누적 읽기·쓰기량과 명령 수, 바쁜 시간(분), 전원 인가 횟수와 시간, 안전하지 않은 종료, 매체 오류, 오류 로그 수, 과열 시간(분), 여덟 개의 온도 센서, 그리고 NVMe 1.3 이상의 열 관리 전환 횟수와 지속 시간(초) |
| `ataIdentity`, `scsiIdentity` | ATA 제조사 모델, 일련 번호, 펌웨어, SMART 지원과 사용 설정 상태, 장치가 보고한 회전 속도와 매체 종류, ATA 표준, SATA 현재와 최대 속도, PATA 현재와 최대 UDMA 모드, 쓰기 캐시와 NCQ 지원. SCSI VPD 80h 단위 일련 번호. 인터페이스는 NVMe, ATA, SCSI 신원을 차례로 우선 사용하고 다음으로 일반 저장소 설명자로 물러납니다. 제조사 SN의 합법적인 앞자리 0은 유지합니다 |
| `smartHealth`, `viaService` | Windows/ATA/SAT/SCSI 출처, 장치 고장 예측, ATA 현재 값/최악 값/임계값/6바이트 원본 값, SCSI 온도와 오류 수, 권한 있는 서비스로 보충했는지 여부 |
| `ataHealth` | 지원되는 ATA/SATA 장치의 온도와 운전 카운트. SSD의 남은 수명, 누적 읽기·쓰기, 비정상 전원 차단, 정정 불가 오류와 사용 가능한 예비 공간. HDD의 시작·정지, 헤드 로드, 재할당/대기 재할당/오프라인 정정 불가 섹터와 인터페이스 CRC 수. 매체 분류와 값에 해당하는 원본 특성 번호도 함께 반환합니다. 기존 특성에서 파생하며 별도 장치 조회를 하지 않습니다 |
| `queriedAt`, `queries` | 요청 시작 시각의 Unix 밀리초 타임스탬프. 각 조회의 `ready`, `unsupported`, `accessDenied`, `unavailable`, `invalidData` 상태와 원본 Win32 오류 코드 |

NVMe는 표준 Identify Controller와 상태 로그를 사용해 이 인터페이스를 노출하는 모든 제조사 장치를 덮습니다. 네이티브 NVMe는 컨트롤러 수준 속성을 우선 사용하고 실패하거나 데이터가 무효면 장치 수준 속성으로 물러납니다. SCSI/USB 버스로 제시되어 기계식으로 확인되지 않은 장치와, 알 수 없는 버스의 확인된 SSD는 조회가 현재 물리 디스크에 대응하도록 장치 수준 속성만 시도합니다. RAID 버스의 장치에는 NVMe 프로토콜 조회를 보내지 않으며 근거는 [hardware/](#hardware) 절을 참조하십시오. 성공하면 ATA/SCSI 상태 보충을 건너뜁니다. 반환하는 `scope`는 `controller` 또는 `device`이며, 같은 컨트롤러의 여러 네임스페이스가 카운트를 공유할 수 있습니다.

128비트 누적 카운트는 모든 정밀도를 유지하도록 십진수 문자열로 직렬화합니다. NVMe 읽기·쓰기 데이터 단위는 단위당 512,000바이트로 환산하고 원본 카운트도 함께 반환하며, 곱셈이 넘치면 환산 값은 `null`입니다. 온도는 켈빈 원본 값을 유지하고 섭씨 값을 함께 제공하며, 보고하지 않은 센서는 자리를 남겨 둡니다. 수명 추정은 `max(0, 100 - percentageUsed)`로 계산하고 심각 경고 비트는 따로 반환하므로 프런트엔드는 둘을 각각 표시해야 합니다. 일련 번호는 명시적으로 요청한 세부 정보 결과에만 들어가고 진단 로그나 주기 스냅숏에는 쓰지 않습니다.

일반 권한에서는 `IOCTL_STORAGE_PREDICT_FAILURE`를 먼저 조회하고, ATA/SATA 버스의 유효한 SMART 섹터만 ATA 레이아웃으로 파싱합니다. 서비스는 고정된 ATA IDENTIFY, SMART READ DATA/READ THRESHOLDS/RETURN STATUS를 ATA pass-through나 SAT 16/12바이트 명령으로 읽습니다. ATA 신원 조회가 성공하지 못하면 SCSI VPD 80h, LOG SENSE 2Fh/0Dh/03h/02h를 시도합니다. 각 pass-through 명령의 제한 시간은 2초이고 20초 예산을 다 쓰면 이후 명령을 보내지 않습니다. 서비스 안에서는 디스크 세부 정보 조회가 한 번에 하나만 실행됩니다. 조회는 SMART를 켜지 않고, 자가 검사를 시작하지 않으며, 쓰기 명령을 보내지 않습니다.

ATA 섹터는 길이, 체크섬과 중복 특성 번호를 검증하고 임계값은 특성 번호로 연결합니다. 사전 고장 특성의 유효한 임계값만 실패 판정에 참여합니다. 원본 특성은 바이트 단위로 유지하며, `ata_health`는 모델과 펌웨어별로 남은 수명, 온도, 누적 호스트 읽기·쓰기, 전원 인가 시간, 전원 인가 횟수, 비정상 전원 차단과 정정 불가 오류를 파싱하고, Intel의 지원되는 모델은 예비 공간 비율과 임계값도 제공합니다. Samsung 750/830/840/850/860/870과 일부 OEM, Crucial MX100/200/300/500, BX300/500, M500/M550, Micron 1100/1300/M600, Intel의 지원되는 SATA 계열, Kingston A400/UV400/UV500/KC600, WD Blue/Red/Green SATA와 SanDisk Ultra 3D는 각자의 매핑을 사용합니다. 식별하지 못한 모델은 원본 특성을 유지하고 수명과 누적 읽기·쓰기는 알 수 없음으로 남깁니다.

확장 매핑은 Samsung PM/SM863, PM/SM883, PM893 같은 기업용 계열, Micron 5100/5200/5210/5300/5400, Intel/Solidigm S45x0/S46x0과 Intel X25/320/540/545 계열, Crucial BX100/BX200, ADATA SP550, SU630/635/650/655/800/900, HP S700, Plextor M3/M5/M6/M7VC/M8VC/S2G, 도시바 TR150/TR200/TL100과 일부 OEM, Kioxia EXCERIA SATA, Kingston KC310/KC400/HyperX Savage/DC500, SanDisk Ultra II, 그리고 Seagate BarraCuda/120, IronWolf 125/Pro를 포함합니다. SMI 계열은 특성 레이아웃도 함께 확인해 이름이 같은 제품의 컨트롤러 변형을 구분합니다. SK hynix Gold S31, SC311/SC401의 수명은 따로 파싱하고, 호스트 카운트 단위가 아직 통일되지 않은 계열은 원본 카운트를 유지합니다.

Samsung의 호스트 읽기·쓰기와 Micron의 호스트 쓰기는 512바이트 단위로, Intel과 Kingston KC600은 32 MiB 단위로, Kingston A400/UV400/UV500과 WD/SanDisk 지원 모델은 GiB 단위로 계산합니다. 수명은 지정된 특성의 정규화 값이나 원본 바이트를 각각 사용하며, Kingston A400의 `03070009` 펌웨어는 정규화 수명을, 나머지 지원 펌웨어는 원본 수명을 사용합니다. 수명 0은 0%로 유지하고 결측과 무효 필드는 `null`로 둡니다. 클라이언트는 구버전 서비스에서 받은 원본 특성에도 같은 파싱을 적용합니다. ATA IDENTIFY는 ATA 표준, SATA 현재와 최대 속도, 쓰기 캐시와 NCQ 지원도 파싱하며, 구버전 서비스가 제공하지 않은 새 신원 필드는 알 수 없음으로 남깁니다.

SMI, Plextor, 도시바/Kioxia의 지원 호스트 카운트는 32 MiB 단위이고, 새로 추가한 Kingston과 Seagate 계열은 GiB 단위입니다. Samsung 기업용 계열은 E9 수명 지표를 우선 사용하고, 도시바/Kioxia는 AD 정규화 값에서 100을 빼 남은 수명을 구하며, Seagate BarraCuda/120 등은 E7 원본 수명 필드를 사용합니다.

HDD 매핑은 Seagate BarraCuda/IronWolf/Exos 같은 ST 계열, WD, HGST/Hitachi와 WD Ultrastar, 도시바 DT/HD/MG/MD/MQ/MK 계열, 그리고 확인된 Samsung SpinPoint, Maxtor, Fujitsu와 Hitachi DK의 오래된 ATA 계열을 포함합니다. HDD는 운전 및 섹터 수를 표시하고 재할당, 대기 재할당 또는 오프라인 정정 불가 섹터가 있으면 "주의"를 표시합니다. 일부 Maxtor와 Hitachi DK의 전원 인가 카운트는 분 단위, 구형 Samsung은 30초 단위, 구형 Fujitsu는 초 단위를 시간으로 환산하고, SV0412H/SV1204H의 온도는 섭씨 1/10도 단위로 환산합니다. Seagate의 512바이트 논리 섹터 장치는 F1/F2를 512바이트 단위로 읽기·쓰기량으로 환산하고, 나머지 섹터 형식은 원본 값을 유지합니다.

매핑 근거: [smartmontools 모델 데이터베이스](https://github.com/smartmontools/smartmontools/blob/main/drivedb/drivedb.h), [CrystalDiskInfo 제조사 파싱](https://github.com/hiyohiyo/CrystalDiskInfo/blob/master/AtaSmart.cpp), [Intel 730 사양](https://www.intel.com/content/dam/www/public/us/en/documents/product-specifications/ssd-730-series-spec.pdf), [Kingston UV400 SMART](https://media.kingston.com/support/downloads/UV400-SMART-attribute.pdf), [Kingston KC600 SMART](https://media.kingston.com/support/downloads/KC600-SMART-attribute.pdf), [ATA IDENTIFY 필드](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ata/ns-ata-_identify_device_data).

SCSI 페이지는 페이지 번호, 매개변수 길이와 중복 번호를 검증하고 ASC/ASCQ를 유지합니다. 고장 예측을 얻지 못했고 파싱한 이상 지표도 없으면 상태는 "알 수 없음"으로 표시합니다. 제조사 전용 USB/RAID 명령과 나머지 모델 매핑은 [로드맵](../roadmap.md)을 참조하십시오.

인터페이스 근거: [Windows NVMe 조회](https://learn.microsoft.com/en-us/windows/win32/fileio/working-with-nvme-devices), [NVMe 상태 로그 필드](https://learn.microsoft.com/en-us/windows/win32/api/nvme/ns-nvme-nvme_health_info_log), [NVMe 컨트롤러 신원](https://learn.microsoft.com/en-us/windows/win32/api/nvme/ns-nvme-nvme_identify_controller_data).

## 예제

`examples/`의 예제는 수집 결과를 직접 출력합니다(`dump`, `hardware`, `disk_details`, `m3`, `lockers`, `gpu_processes`, `gpu_diagnostics`, `history`). `gpu_compute`는 크기가 제한된 CUDA 테스트 부하를 제공합니다. 사용법은 [환경과 명령](../development/README.md)을 참조하십시오.
