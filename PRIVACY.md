# 개인정보 처리방침 / Privacy policy

[한국어](#한국어) · [English](#english)

## 한국어

GoodGood은 프로세스, 하드웨어, 네트워크 연결과 리소스 사용량 데이터를 이 PC에서 처리하며, 설정과 최근 7일의 기록, 진단 로그는 이 PC에 보관합니다. GoodGood에는 사용 행태 추적, 광고 추적, 자동 오류 보고가 없으며 프로세스 목록, 명령줄, 계정 이름, 파일 내용이나 기록을 자동으로 업로드하지 않습니다.

### 네트워크 기능과 제어 방법

| 기능 | 네트워크 연결 시점, 대상과 전송 내용 | 제어 방법 |
|---|---|---|
| 업데이트 확인과 다운로드 | 자동 확인은 기본으로 켜져 있으며, 시작 약 1분 뒤 확인하고 이후 매일 확인하며 실패하면 약 6시간 뒤 다시 시도합니다. GitHub Releases와 그 파일 배포 도메인에서 업데이트 매니페스트와 설치 파일을 받으며, 설치 버전은 새 버전을 찾으면 자동으로 내려받습니다. 요청을 받는 서비스는 IP 주소, 요청 시각, 리소스 주소와 `GoodGood/<버전>` User-Agent를 알 수 있고, 리소스 주소에는 업데이트 채널이나 다운로드 버전이 포함됩니다. 프록시를 지정하면 설정한 프록시나 내장 프록시 `gh-proxy.com`, `gh-proxy.org`, `ghfast.top`을 통해 같은 주소에 접속합니다. | 설정 → 업데이트에서 자동으로 업데이트 확인을 끄면 이후 확인은 직접 실행할 때만 이루어지며, 이미 시작된 다운로드는 완료될 수 있습니다. 다운로드 소스 → GitHub만 연결을 선택하면 프록시 대체를 끄거나 프록시를 직접 지정할 수 있습니다. 포터블 버전도 버전을 확인하며 다운로드는 다운로드 페이지에서 브라우저로 진행합니다. |
| PawnIO 설치 또는 업그레이드 | 커널 센서를 직접 켜고 드라이버 설치나 업그레이드를 승인하면 필요에 따라 PawnIO 공식 GitHub Releases와 그 파일 배포 도메인에서 설치 파일을 내려받습니다. 요청을 받는 서비스는 IP 주소, 요청 시각, 파일 주소와 GoodGood 버전을 알 수 있습니다. | 커널 센서는 선택 기능이며 꺼 두면 이 다운로드가 발생하지 않습니다. 저장한 설정을 복원해도 드라이버를 자동으로 내려받거나 설치하지 않습니다. |
| 외부 링크와 피드백 | 프로젝트 홈페이지, 릴리스 페이지, PawnIO 웹사이트 링크를 클릭하면 브라우저나 해당 앱이 그 서비스에 접속합니다. 이슈, 로그나 스크린샷을 제출하면 받는 쪽이 직접 제출한 내용과 해당 계정 정보를 확인합니다. | 사용자가 직접 링크를 열고 첨부 파일을 골라 제출합니다. 로그에는 시스템과 하드웨어 정보, 그리고 문제와 관련된 실제 경로(사용자 폴더 이름 포함)가 들어갈 수 있으며, 제출 전에 확인해 민감한 내용을 지울 수 있습니다. 공개 이슈와 첨부 파일은 다른 사람이 볼 수 있습니다. |

공식 웹사이트, 문서와 다운로드 파일은 Cloudflare가 정적 호스팅으로 제공합니다. 접속할 때 Cloudflare는 IP 주소, 요청 시각, 리소스 경로와 브라우저 또는 클라이언트 식별자를 처리할 수 있습니다. 문서 검색은 브라우저 안에서 실행됩니다. 도메인 메일로 보낸 편지는 Cloudflare가 유지 관리자에게 전달합니다. 자세한 내용은 [Cloudflare 개인정보 처리방침](https://www.cloudflare.com/privacypolicy/)을 참고하십시오.

타사 서비스는 각자의 개인정보 규칙에 따라 요청 데이터를 처리합니다:

- GitHub의 업데이트 다운로드, PawnIO 설치 파일 다운로드와 이슈 피드백: [GitHub 개인정보 보호정책](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- `gh-proxy.com`과 현재 이 사이트로 연결되는 `gh-proxy.org`: [GH-Proxy 개인정보 처리방침](https://gh-proxy.com/privacy). `ghfast.top`의 서비스 설명은 [운영자 웹사이트](https://ghfast.top/)를 참고하십시오. 직접 지정한 프록시의 개인정보 규칙은 그 운영자가 공개합니다. 프록시 서비스는 각 운영자가 관리하며, GitHub만 연결을 선택하면 업데이트 요청이 프록시로 전송되지 않습니다.

조작 방법은 [업데이트 설정](docs/guide/settings.md#업데이트)과 [커널 센서](docs/guide/settings.md#커널-센서)를 참고하십시오. 개인정보 관련 문의는 [GitHub Issues](https://github.com/acc0mplish/GoodGood/issues)로 유지 관리자에게 연락하고, 취약점이나 민감한 자료는 [비공개 보안 보고](https://github.com/acc0mplish/GoodGood/security/advisories/new)를 이용하십시오. 메일로는 contact@example.com, 보안 관련은 security@example.com으로 보낼 수 있습니다.

## English

GoodGood processes information about processes, hardware, network connections, and resource usage locally. Settings, the last 7 days of history, and diagnostic logs stay on the device. GoodGood includes no usage telemetry, advertising trackers, or automatic crash reporting, and does not automatically upload process lists, command lines, account names, file contents, or history.

### Network features and controls

| Feature | When it connects, recipients, and data sent | Controls |
|---|---|---|
| Update checks and downloads | Automatic checks are enabled by default: about 1 minute after launch, then daily, with a retry after about 6 hours on failure. GoodGood requests manifests and installers from GitHub Releases and its asset delivery domains; installed copies download new versions automatically. Requests go either straight to those addresses or, when a proxy is set, through the configured proxy or the built-in proxies `gh-proxy.com`, `gh-proxy.org`, and `ghfast.top`. Services receiving requests can see the IP address, request time, resource URL, and `GoodGood/<version>` User-Agent; URLs identify the update channel or download version. | Turn off Settings → Updates → Check for updates automatically to make subsequent checks manual; downloads already in progress may finish. Select Download source → GitHub only to disable proxy fallback, or choose a proxy. Portable copies also check for updates and open the browser for downloads. |
| PawnIO installation or upgrade | When kernel sensors are manually enabled and driver installation or upgrade is authorized, GoodGood downloads required installers from PawnIO's official GitHub Releases and asset delivery domains. Services receiving requests can see the IP address, request time, file URL, and GoodGood version. | Kernel sensors are optional; leaving them off avoids this download. Restoring saved settings does not automatically download or install drivers. |
| External links and feedback | Clicking the project, release, or PawnIO links opens the browser or associated application. Submitting issues, logs, or screenshots shares the submitted content and associated account information with the recipient. | The user opens links, selects attachments, and submits content. Logs may contain system and hardware information and paths involved in failures, including user directory names; sensitive content can be reviewed and removed before submission. Public issues and their attachments are visible to others. |

Cloudflare serves the official website, documentation and downloads. It can process the IP address, request time, resource path and browser or client identifier. Documentation search runs in the browser. Cloudflare forwards mail addressed to the project to its maintainer. See the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/).

Third-party services handle request data under their own privacy rules:

- GitHub update downloads, PawnIO installer downloads, and issue reports: [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- `gh-proxy.com` and `gh-proxy.org`, which currently redirects there: [GH-Proxy Privacy Policy](https://gh-proxy.com/privacy). See the [operator's website](https://ghfast.top/) for `ghfast.top` service information; custom proxy operators publish their own privacy rules. Each operator manages its proxy service. Selecting GitHub only avoids sending update requests to proxies.

See [update settings](docs/guide/settings.md#업데이트) and [kernel sensors](docs/guide/settings.md#커널-센서) for instructions. Contact the maintainer through [GitHub Issues](https://github.com/acc0mplish/GoodGood/issues) about privacy, or use a [private security report](https://github.com/acc0mplish/GoodGood/security/advisories/new) for vulnerabilities or sensitive material. Mail can be sent to contact@example.com, and security matters to security@example.com.
