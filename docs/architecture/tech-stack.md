# 기술 스택

| 모듈 | 구현 |
|---|---|
| 데스크톱 인터페이스 | Rust와 GPUI Kit. Windows 플랫폼 계층은 Direct3D 11과 DirectComposition으로 그리고 합성하며, DirectWrite가 텍스트를 담당합니다. "하드웨어 가속"을 끄면 같은 그리기 작업을 WARP가 CPU에서 수행합니다. |
| 프로세스 표와 실시간 차트 | `DataTable`이 표 행을 가상화합니다. `TimePlot`은 GPUI의 `Plot` 인터페이스를 구현하고, 곡선은 tiny-skia로 래스터화하며 스크롤할 때 캐시한 텍스처를 평행 이동합니다. |
| 수집과 시스템 작업 | `goodgood-core`가 NT와 Win32 인터페이스로 시스템 상태를 읽습니다. `goodgood-app`이 샘플링과 규칙을 조정하고, 선택적인 `goodgood-service`가 승인된 작업을 수행합니다. |
| 로컬 저장소 | `settings.json`이 애플리케이션 설정을, `preferences.json`이 인터페이스 환경 설정과 창 위치를 저장하며, 기록은 로컬 데이터 디렉터리에 날짜별로 기록됩니다. |
| 애플리케이션 내 업데이트 | reqwest가 시스템 TLS로 매니페스트와 프로그램 패키지를 내려받습니다. 클라이언트는 내장 공개 키로 Minisign 서명과 대응 버전을 검증합니다. |
| 빌드와 릴리스 | Rust stable의 MSVC 도구 체인으로 Windows x64 프로그램을 빌드하고, NSIS로 설치 패키지를 만듭니다. Node.js와 bun으로 개발, 검사, 웹사이트 빌드와 릴리스 스크립트를 실행합니다. |

Rust 의존성 버전은 [Cargo.lock](../../Cargo.lock)에, 스크립트 의존성은 [bun.lock](../../bun.lock)에 있습니다. 빌드 명령은 [개발 가이드](../development/README.md)를 참조하십시오.
