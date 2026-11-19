@echo off
setlocal EnableExtensions
chcp 65001 >nul
pushd "%~dp0" || exit /b 1
if /i "%~1"=="help" goto :help
if /i "%~1"=="--help" goto :help
if "%~1"=="/?" goto :help
if "%~1"=="-h" goto :help
where bun >nul 2>&1 || goto :missing
where git >nul 2>&1 || goto :missing
call bun install --frozen-lockfile
if errorlevel 1 goto :done
if "%~1"=="" goto :dev
if /i "%~1"=="dev" goto :run
if /i "%~1"=="build" goto :run
if /i "%~1"=="preview" goto :built
if /i "%~1"=="check" goto :built
set "first=%~1"
if "%first:~0,1%"=="-" goto :dev
echo 알 수 없는 명령 "%~1"입니다. start-website.bat help로 사용법을 확인하십시오.
popd
exit /b 2

:dev
call bun run --cwd website dev %*
goto :done

:built
if exist "target\official-web\dist\site\index.html" if exist "target\official-web\dist\input\site.json" goto :run
call bun run --cwd website build
if errorlevel 1 goto :done

:run
call bun run --cwd website %*
:done
set "result=%errorlevel%"
popd
exit /b %result%

:missing
echo Git과 bun을 설치한 뒤 start-website.bat을 실행하십시오.
popd
exit /b 1

:help
echo GoodGood 웹사이트 로컬 개발
echo   start-website.bat                    개발 서버를 시작하며, 저장하면 자동으로 반영합니다
echo   start-website.bat --open             시작한 뒤 브라우저를 엽니다
echo   start-website.bat dev --port 4400    포트를 지정합니다. 기본값은 4321입니다
echo   start-website.bat dev --host         같은 네트워크의 다른 장치에서 접속할 수 있게 합니다
echo   start-website.bat build              정적 웹사이트와 검색 색인을 빌드합니다
echo   start-website.bat preview            최근 정적 빌드를 미리 봅니다
echo   start-website.bat check              타입을 검사하고 빌드 산출물을 확인합니다
echo Ctrl+C를 눌러 서버를 멈춥니다.
popd
exit /b 0
