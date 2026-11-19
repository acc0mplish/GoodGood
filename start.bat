@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
title GoodGood 개발

rem GoodGood development launcher. Run "start.bat help" for the list of commands.

set "ACTION=%~1"
if "%ACTION%"=="" set "ACTION=dev"
if /i "%ACTION%"=="help" goto :help
if /i "%ACTION%"=="-h" goto :help
if /i "%ACTION%"=="/?" goto :help

where pnpm >nul 2>nul || (echo [오류] pnpm을 찾지 못했습니다. Node.js를 설치한 뒤 npm install -g pnpm을 실행하십시오.& goto :fail)
where cargo >nul 2>nul || (echo [오류] cargo를 찾지 못했습니다. https://rustup.rs에서 Rust를 먼저 설치하십시오.& goto :fail)

if not exist "node_modules\.pnpm" (
  echo [준비] 처음 실행이므로 개발 도구 의존성을 설치합니다…
  call pnpm install --frozen-lockfile || goto :fail
)

if /i "%ACTION%"=="dev" goto :dev
if /i "%ACTION%"=="check" goto :check
if /i "%ACTION%"=="build" goto :build
if /i "%ACTION%"=="clean" goto :clean
echo [오류] 알 수 없는 명령: %ACTION%
echo.
goto :help

:dev
set "RUST_BACKTRACE=1"
echo [시작] GoodGood 개발판입니다. 수정하면 자동으로 다시 빌드합니다. Ctrl+C를 눌러 끝냅니다.
echo.
call pnpm app %2 %3 %4 %5 %6 %7 %8 %9
goto :end

:check
call pnpm check || (echo. & echo [실패] 통과하지 못한 검사가 있습니다. 위의 출력을 확인하십시오.& goto :fail)
echo.
echo [통과] 문구, 스크립트 테스트, Rust 테스트, rustfmt, Clippy가 모두 통과했습니다.
goto :end

:build
if /i "%~2"=="installer" (
  call pnpm bundle || goto :fail
  echo.
  echo [완료] 설치 패키지는 target\release\bundle\nsis에 있습니다
) else (
  call pnpm build || goto :fail
  echo.
  echo [완료] target\release\goodgood.exe
)
goto :end

:clean
if /i "%~2"=="all" (cargo clean) else (cargo clean -p goodgood)
if errorlevel 1 goto :fail
goto :end

:help
echo 사용법: start.bat [명령]
echo.
echo   dev              기본값. GPUI 네이티브 인터페이스를 시작하며, 수정하면 자동으로 다시 빌드합니다
echo   check            문구 검사, 스크립트 및 Rust 테스트, rustfmt, Clippy
echo   build            릴리스 빌드로 target\release\goodgood.exe를 만듭니다
echo   build installer  릴리스 빌드 후 NSIS 설치 프로그램으로 패키징합니다
echo   clean            애플리케이션 빌드 산출물을 정리하고 의존성 캐시는 유지합니다
echo   clean all        Rust 빌드 캐시를 모두 비웁니다. 다음 빌드에서 의존성을 다시 컴파일합니다
echo.
echo 개발판은 별도의 식별자와 설정을 사용하므로 설치된 GoodGood과 동시에 실행할 수 있습니다.
goto :end

:fail
set "RC=1"
rem Keep the window open when launched by double-click so the error stays readable.
echo %cmdcmdline% | find /i "%~nx0" >nul && (echo. & pause)
exit /b %RC%

:end
exit /b %errorlevel%
