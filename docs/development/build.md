# 빌드와 캐시

Windows 빌드는 `stable-x86_64-pc-windows-msvc`를 사용하며 저장소 디렉터리의 rustup override로 선택합니다. 릴리스 구성은 LTO를 켜고 VC 런타임을 정적으로 링크하며 시스템의 Universal CRT를 사용합니다. `build-support/windows-runtime.rs`가 애플리케이션, 서비스와 테스트의 런타임을 구성합니다.

GPUI는 표준 권한, PerMonitorV2 DPI 인식과 Common Controls를 선언하는 Windows manifest를 애플리케이션에 제공합니다. 애플리케이션 빌드 스크립트는 아이콘과 버전 리소스를 넣습니다. 크기별 아이콘은 `node scripts/icons.mjs`로 생성하며 16, 20, 24, 32 px는 `resources/icons/logo-<크기>.svg`의 정수 픽셀 원본을, 나머지 크기는 `resources/logo.svg`를 사용합니다. 인터페이스의 표시는 장치 픽셀 크기에 따라 같은 출처를 고르며 40 px 미만은 해당 크기를 넘지 않는 가장 큰 픽셀 원본을 가운데 맞추어 쓰고 40 px부터는 벡터 표시를 사용합니다.

`scripts/build.mjs`는 먼저 작업 관리자 시작 프로그램과 복구 프로그램을 빌드한 뒤 `goodgood.exe`에 넣습니다. 서명 파이프라인은 `--skip-helpers`로 이미 서명한 보조 프로그램을 재사용합니다. `scripts/bundle.mjs`가 NSIS를 호출하며 설치 패키지는 `target/release/bundle/nsis`에 출력됩니다.

개발 스크립트는 `target/native-dev/runs`에서 사본을 시작하므로 컴파일러가 빌드 산출물을 계속 갱신할 수 있습니다. 프로젝트 검사는 별도 디렉터리 `target/rust-analyzer`를 사용합니다. 링커, `RUSTFLAGS` 또는 도구 체인을 바꾸면 의존성을 다시 컴파일합니다.

개발 구성은 의존성, `goodgood`과 `goodgood-core`에 `opt-level = 2`를 사용해 표 스크롤과 샘플링 성능을 함께 확보합니다. 프로젝트 코드는 역추적을 위해 줄 번호를 유지합니다. `cargo test`는 개발 구성을 물려받습니다.

개발 빌드의 DirectX 셰이더는 최적화를 켜고 디버그 정보를 유지합니다. 성능 대조에는 릴리스 빌드를 사용하며 창 크기, 화질과 표시 조건을 같게 맞춥니다.

의존성을 바꾼 뒤 node scripts/notices.mjs를 실행합니다. 버전 번호는 pnpm release로만 바꿉니다.
