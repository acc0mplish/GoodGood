# 비Windows 호스트에서 크로스 컴파일

Windows가 아닌 호스트(macOS, Linux)에서 `x86_64-pc-windows-msvc` 대상으로 네이티브 프로그램을 컴파일할 수 있다. 2026-11-19에 WSL2 Linux 호스트에서 `cargo xwin build -p goodgood --target x86_64-pc-windows-msvc` 디버그 빌드로 검증했고 `goodgood.exe`(PE32+ x86-64)가 생성되었다. 수집 계층의 Windows API 사용은 컴파일을 막지 않는다. 링커와 Windows SDK·MSVC CRT만 호스트가 제공하면 된다.

## 도구

| 도구 | 용도 | 비고 |
|---|---|---|
| `rustup target add x86_64-pc-windows-msvc` | 대상 표준 라이브러리 | [Cargo.toml](../../Cargo.toml)의 `rust-version`을 만족하는 툴체인에 설치한다 |
| `cargo-xwin` | Windows SDK와 MSVC CRT를 자동으로 내려받아 링크 경로를 구성 | `cargo install cargo-xwin --locked`. 캐시는 `~/.cache/cargo-xwin` |
| `llvm-rc` | 애플리케이션 리소스 컴파일 | `embed-resource`가 호출한다. `build-support/app-resource.rs`의 .rc가 `windows.h`를 포함하므로 cargo-xwin이 설정하는 SDK 포함 경로가 필요하다 |
| `clang-cl` | cc로 C 코드를 컴파일하는 의존성 | Linux 배포판 패키지에 바이너리가 없으면 `clang --driver-mode=cl` 래퍼로 대체할 수 있다 |
| `lld-link` | MSVC 링커 | LLVM에 포함되어 있다 |

macOS에서는 `brew install llvm` 한 번으로 `llvm-rc`·`clang-cl`·`lld-link`를 모두 얻는다(`/opt/homebrew/opt/llvm/bin`, keg-only이므로 PATH에 직접 추가). rustup과 cargo-xwin은 운영 체제와 무관하다.

## 명령

```sh
rustup toolchain install 1.100.0 --target x86_64-pc-windows-msvc  # rust-version 참조
CARGO_TARGET_DIR=target/cross cargo +1.100.0 xwin build -p goodgood --target x86_64-pc-windows-msvc
```

`CARGO_TARGET_DIR`을 분리하는 이유는 [빌드와 캐시](build.md)의 규칙과 같다. 크로스 툴체인은 링커 구성이 다르므로 같은 디렉터리를 쓰면 Windows 빌드 캐시를 무효화한다. `cargo xwin clippy --target x86_64-pc-windows-msvc -- -D warnings`도 같은 방식으로 동작한다.

대소문자를 구분하는 파일 시스템(Linux ext4)에서는 링크 지시의 라이브러리 이름 대소문자가 SDK 파일명과 어긋날 수 있다. `goodgood-core`의 `#[link(name = "PowrProf")]`([hardware/cpu.rs](../../crates/goodgood-core/src/hardware/cpu.rs))이 그 사례로, xwin 캐시의 `sdk/lib/um/x86_64/powrprof.lib`에 대해 `PowrProf.lib` 심볼릭 링크를 만들어 해결한다. macOS의 기본 APFS는 대소문자를 구분하지 않으므로 이 문제가 생기지 않는다.

## WSL에서 Windows 빌드 호출

WSL 안에서 작업할 때는 크로스 컴파일 없이 Windows 도구 체인을 바로 호출할 수 있다. 상태가 정상이라면 이 경로가 실행 가능한 EXE를 만드는 가장 빠른 방법이다.

```sh
cmd.exe /c "cd /d E:\DEV\GoodGood && cargo build -p goodgood --bin goodgood"
```

인자 없이 디버그 빌드한 EXE는 개발 식별자(`devbuild.*`, `crates/goodgood-app/src/config.rs`의 `development_identifier`)로 실행되므로 설치본과 분리된다. 디버그 빌드는 콘솔 서브시스템이라 더블클릭하면 콘솔창이 앱과 함께 뜬다. 실행 중인 EXE는 링크를 잠그므로 재빌드 전에 종료한다.

Windows 쪽 rustup이 워크스페이스 `rust-version`보다 오래 되면 빌드가 거부된다. `cmd.exe /c "rustup update stable"`로 올린다(2026-11-20 실측: 1.99.1 → 1.100.0 필요).

## 제약

- **디버그 EXE는 빌드한 머신에서만 셰이더를 찾는다.** 디버그 빌드는 DirectX 셰이더를 런타임에 `CARGO_MANIFEST_DIR`의 절대 경로(`vendor/gpui-pre-windows/src/directx_renderer.rs`의 `D3DCompileFromFile`)에서 컴파일하므로, 크로스로 만든 EXE를 다른 Windows 머신에서 실행하면 셰이더 로드에 실패한다. 컴파일 확인과 코드 검사가 목적이라면 문제없고, 실행이 필요하면 Windows에서 빌드한다.
- **릴리스 빌드는 비Windows 호스트에서 컴파일되지 않는다.** 셰이더 사전 컴파일(`vendor/gpui-pre-windows/build.rs`)이 호스트 기준 `#[cfg(target_os = "windows")]`로 제한되어 `fxc.exe`를 찾고, 비Windows 호스트에서는 `shaders_bytes.rs`가 만들어지지 않아 컴파일 오류가 난다. `GPUI_FXC_PATH`로 fxc 위치를 바꿀 수 있지만 fxc.exe 자체가 Windows 실행 파일이라 Wine 조합 외에는 경로가 없다(미검증). 인도용 릴리스·설치 패키지·서명은 Windows에서 빌드한다.
- **Windows 대상 테스트는 실행할 수 없다.** `cargo test --target x86_64-pc-windows-msvc`는 바이너리를 만들지만 비Windows 호스트에서 실행하지 못한다. 스크립트 테스트(`bun run test`)와 웹사이트는 호스트와 무관하게 동작한다.
- **의존성 캐시가 크다.** 크로스 대상의 첫 빌드는 SDK 다운로드와 전체 의존성 컴파일로 수십 분이 걸리고 `target/cross`는 약 3 GB다.
