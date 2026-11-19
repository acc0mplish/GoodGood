# Windows 코드 서명

SignPath 테스트 흐름은 조직이 제공한 자체 서명 인증서를 쓰고 격리된 Windows 실행기에서 서명, 패키징과 설치를 검증합니다.

공개된 [코드 서명 정책](../../README.md#코드-서명-정책)과 [영문판](../../README.en.md#code-signing-policy)이 서명 상태, 담당 구성원과 [개인정보 처리 방침](../../PRIVACY.md)을 설명합니다. 첫 페이지, 다운로드 영역과 GitHub Release 본문은 모두 이 정책의 진입점을 제공해야 하며 서명 상태가 바뀌면 한국어판과 영문판 설명을 함께 갱신합니다.

## SignPath 구성

조직 ID는 `82b3b085-ac3e-4e09-a287-9d29857fb8a6`이고 프로젝트 slug는 `GoodGood`, 테스트 정책은 `test-signing`입니다. 이 정책의 제출자 권한을 가진 CI 사용자를 쓰고 그 토큰을 GitHub 저장소의 Actions Secret `SIGNPATH_API_TOKEN`에 보관합니다.

프로젝트에 다음 산출물 구성을 추가하고 해당 XML을 사용합니다.

| 산출물 구성 slug | 파일 | 내용 |
|---|---|---|
| `windows-helpers` | [helpers.xml](../../signpath/helpers.xml) | 작업 관리자 시작 프로그램, 복구 프로그램 |
| `windows-application` | [application.xml](../../signpath/application.xml) | 주 프로그램, 제거 프로그램 |
| `windows-installer` | [installer.xml](../../signpath/installer.xml) | NSIS 설치 관리자 |

세 구성의 루트 요소는 모두 `zip-file`이며 `actions/upload-artifact`가 자동으로 만든 ZIP에 대응합니다. 재단 구독은 서명 설명을 자동으로 만들므로 `authenticode-sign`에 `description`이나 `description-url`을 설정하지 않습니다. 지정한 GoodGood 프로그램만 서명하고 PawnIO나 NSIS의 타사 구성 요소는 다시 서명하지 않습니다. 신뢰할 수 있는 빌드 검증을 켤 때는 GitHub.com을 프로젝트에 연결하고 저장소 URL을 `https://github.com/acc0mplish/GoodGood`으로 설정하며 조직의 기존 출처 제한과 승인 규칙은 그대로 적용됩니다.

## 테스트 흐름

이 저장소는 `.github/`를 포함하지 않으므로 워크플로를 실행할 수 없습니다. 서명이 다시 필요해지면 `.github/workflows/`에 SignPath 워크플로를 두고 **SignPath test signing**을 수동으로 실행하며 브랜치를 고릅니다. 호스팅된 Windows 실행기가 소스에서 빌드하고 서명을 제출합니다.

서명 순서는 다음과 같습니다.

1. 작업 관리자 보조 프로그램 두 개를 빌드하고 서명합니다.
2. 서명한 보조 프로그램을 주 프로그램에 넣고 주 프로그램을 빌드하며 네이티브 패키징 스크립트로 NSIS 메타데이터를 만듭니다.
3. 컴파일해 제거 프로그램을 만들고 주 프로그램과 함께 서명합니다.
4. 같은 NSIS 스크립트로 서명한 주 프로그램과 제거 프로그램을 최종 설치 패키지에 넣고 설치 패키지를 서명합니다.

최종 패키징은 이미 생성한 NSIS 스크립트를 그대로 쓰므로 번들러를 다시 호출해 주 프로그램의 패키지 종류 표시를 고쳐 기존 서명을 깨뜨리지 않습니다. 제거 프로그램을 다시 채워 넣기 전에는 1단계에서 만든 원본 파일과 바이트 단위로 같아야 하고 서명이 돌아올 때마다 PE 내용도 확인하여 서명 영역, 체크섬과 정렬 채움만 달라질 수 있게 합니다.

각 서명 단계는 같은 테스트 인증서를 쓰고 임시 GitHub 실행기의 컴퓨터 신뢰 저장소에서만 그 인증서를 신뢰합니다. 흐름은 자동 설치로 설치된 주 프로그램과 제거 프로그램이 서명한 입력과 같은지 확인한 뒤 제거합니다. 테스트 서명과 정식 릴리스는 같은 [제거 확인 스크립트](../../scripts/uninstall-smoke.mjs)를 씁니다. 스크립트는 제거 프로그램을 설치 디렉터리 밖의 임시 디렉터리로 복사하고 `_?=`로 설치 디렉터리를 지정하며 실제 제거 프로세스가 끝날 때까지 기다려 제거 훅을 온전히 유지합니다. 실제 종료 코드, 제거 항목, 설치된 주 프로그램과 제거 프로그램을 확인하고 실패하면 종료 코드나 남은 경로를 보고합니다.

테스트 결과는 워크플로 산출물로 제공되며 이름에 `signpath-test`와 커밋 번호가 들어가고 포터블 프로그램, 설치 패키지, SHA-256, 공개 테스트 인증서와 검증 결과를 담습니다.

## 정식 서명과 업데이트 서명

정식 인증서는 SignPath Foundation이 발급하며 재단이 검토한 뒤 프로젝트에 사용을 제공합니다. 정식 인증서 사용이 승인된 뒤에만 검증을 마친 흐름을 릴리스 단계에 연결하고 `release-signing` 정책을 씁니다. 테스트 정책을 정식 서명이 실패했을 때의 대체 수단으로 쓰지 않습니다.

재단 약관에 따라 코드 제출과 검토, 서명 승인은 공개 정책에 나열된 구성원이 담당하고 외부 기여는 검토를 거치며 정식 서명 요청은 건마다 사람이 승인합니다. 해당 구성원은 GitHub과 SignPath 모두에서 다중 요소 인증을 써야 합니다. 모든 서명 대상에는 제품 이름과 제품 버전을 설정하고 제한해야 하며 같은 빌드의 버전이 일치해야 합니다. 구체적인 제한은 SignPath 산출물 구성에서 관리합니다.

개인정보 처리 방침은 기본으로 켜져 있는 업데이트 확인, 자동 프록시 대체와 수동 PawnIO 다운로드를 실제 동작대로 설명합니다. 재단은 사용자 데이터를 수집해 사용자가 지정하지 않은 시스템으로 보내는 기능에 대해 설치 중에 개인정보 처리 방침을 표시하고 끌 수 있는 선택지를 제공할 것도 요구하므로 정식 연동 시 설치 흐름의 안내와 선택지를 함께 처리해야 합니다.

Windows Authenticode는 실행 파일의 서명자를 식별합니다. Minisign은 GoodGood 클라이언트가 업데이트 패키지와 업데이트 설명을 검증할 때 씁니다. 정식 흐름은 Authenticode 서명을 먼저 마친 뒤 최종 설치 패키지에 Minisign 서명과 다운로드 해시를 만듭니다. 클라이언트가 신뢰하는 업데이트 공개 키와 `requireSignedVersion` 검증을 유지합니다.

## 공식 자료

- [SignPath Foundation 약관](https://signpath.org/terms)
- [GitHub Actions 연동](https://docs.signpath.io/trusted-build-systems/github)
- [산출물 구성](https://docs.signpath.io/artifact-configuration/)
- [프로젝트와 서명 정책](https://docs.signpath.io/projects)
- [CI 사용자와 토큰](https://docs.signpath.io/users/#ci-users)
