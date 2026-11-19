# GoodGood 문서

[사용 가이드](guide/README.md)에서 인터페이스 조작을 확인하고, [개발 가이드](development/README.md)에서 빌드 환경을 구성합니다. [아키텍처](architecture/README.md)는 각 모듈의 역할을 소개하고, [디자인](design/README.md)은 인터페이스와 상호 작용의 절충을 설명합니다.

프로젝트 소개와 다운로드 안내: [한국어](../README.md) · [English](../README.en.md) · [Español](../README.es.md) · [Deutsch](../README.de.md) · [日本語](../README.ja.md) · [Français](../README.fr.md) · [Русский](../README.ru.md). 세부 문서는 한국어로 작성됩니다.

## 사용 가이드

- [인터페이스와 조작](guide/README.md): 첫 실행, 페이지, 개요 영역, 파일을 사용하는 항목, 키보드 조작, 권한
- [상주 모드, 알림 영역과 바로 가기](guide/resident-mode.md)
- [설정](guide/settings.md)
- [하드웨어 데이터의 출처와 한계](guide/hardware-data.md)

## 개발 가이드

- [환경과 명령](development/README.md): 환경 요구 사항, `start.bat`, 개발 버전 격리, 수집 데이터 검증
- [빌드와 캐시](development/build.md): 캐시 최적화, 링커와 도구 체인
- [성능 측정](development/performance.md)
- [GPUI 네이티브 인터페이스](development/gpui.md): 개발 진입점, 네이티브 구성 요소, 공유 정의와 플랫폼 경계
- [커밋과 릴리스](development/release.md): 지속적 통합, 커밋 메시지 규칙, 버전 번호, 릴리스 절차, 업데이트 서명과 채널, 릴리스 후 심각한 문제가 발견되었을 때의 처리
- [웹사이트와 릴리스 미러](development/website.md): 정적 사이트 빌드, 버전 파일, 업데이트 매니페스트와 도메인 메일
- [Windows 코드 서명](development/signing.md): SignPath 테스트 구성, 서명 순서와 산출물 검증
- [다국어](development/i18n.md): 문구 디렉터리, 인터페이스와 Rust에서의 사용법, 검사, 언어 추가, 용어집
- [의존성과 보안 유지 관리](development/security.md): 도구 체인 버전, 취약점 검사, 네이티브 인터페이스 경계와 업스트림 수정 경계

## 아키텍처

- [개요](architecture/README.md): 계층, 데이터 흐름, 설계 방향
- [기술 스택](architecture/tech-stack.md): 계층별 언어, 프레임워크, 의존성과 플랫폼 인터페이스, 검사·빌드·릴리스 도구
- [수집 계층 goodgood-core](architecture/core.md)
- [네이티브 호스트](architecture/host.md)
- [권한 있는 서비스](architecture/privileged-service.md): 설치, 권한 부여 경계, IPC와 검증
- [관리자 권한 시작](architecture/administrator-startup.md): 한 번의 권한 부여, 단일 진입점과 권한 전환
- [시스템 작업 관리자 대체](architecture/task-manager.md): 사용 설정, 되돌리기, 업데이트와 제거 보호
- [네이티브 인터페이스](architecture/frontend.md)

## 디자인

- [디자인 원칙](design/README.md)
- [곡선 애니메이션](design/charts.md): 시간 축, 네 가지 모드와 비용, 구현 요점
- [창 모양](design/window.md): Mica 배경, DPI와 창 수명 주기
- [전역 바로 가기](design/hotkey.md): RegisterHotKey의 실측 동작, 녹화와 조합 규칙

## 기타

- [로드맵](roadmap.md)
- [알려진 문제](known-issues.md)
