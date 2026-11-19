# 웹사이트와 릴리스 미러

`goodgoodtask.com`은 Workers Static Assets 서비스 네 개로 이루어집니다. 사이트는 Free 요금제를 쓰고 정적 파일과 리디렉션 규칙만 게시하며, 영역에는 `Accept`에 따라 경로를 다시 쓰는 규칙이 하나 더 있습니다([검색 엔진과 언어 모델](#검색-엔진과-언어-모델) 참고). 서비스 설정은 [`website/`](../../website/)에 있고 빌드 산출물은 `target/official-web/dist/`에 있습니다.

| 도메인 | 내용 |
| --- | --- |
| `goodgoodtask.com` | 일곱 언어 첫 페이지(자주 묻는 질문과 인터랙티브 시연 포함), 다운로드, 변경 기록, 정책, 안정판과 개발판 문서, 문서 검색, 언어 모델이 읽는 `/llms.txt`와 `/.well-known/security.txt` |
| `www.goodgoodtask.com` | 같은 경로로 주 도메인에 영구 리디렉션 |
| `dl.goodgoodtask.com` | 버전별 설치 패키지, 포터블 버전과 `SHA256SUMS.txt` |
| `update.goodgoodtask.com` | `latest.json`과 `beta.json`, 캐시 시간 2분. 애플리케이션은 이 주소를 읽지 않고 GitHub Releases에서만 매니페스트를 받습니다 |

## 빌드와 배포

로컬 개발은 저장소 루트의 `start-website.bat`으로 실행하며 기본 주소는 `http://localhost:4321`입니다. 개발 서버는 작업 공간의 Markdown을 `/docs/dev/`에 매핑하고 저장한 뒤 브라우저에서 확인할 수 있습니다. `/docs/`에는 안정판 문서가 있습니다. `start-website.bat build`와 `start-website.bat preview`를 차례로 실행하면 완성된 정적 사이트를 미리 볼 수 있습니다.

전체 릴리스 태그가 있는 체크아웃 디렉터리에서 `bun install --frozen-lockfile`, `bun run site:build`, `bun run site:check`를 실행합니다. Next.js는 검증한 릴리스 데이터로 다운로드 페이지와 버전 정보를 정적 내보내기하고 빌드 스크립트가 페이지마다 인라인 스크립트 해시만 허용하는 콘텐츠 보안 정책을 넣습니다. `/docs/`는 안정판 태그에서 가져오며 `/docs/dev/`, 다운로드 페이지의 시스템 요구 사항과 링크 미리보기 그림은 배포할 때 같은 `main` 커밋을 읽습니다. 문서 사이드바 위에서 다른 판의 같은 문서로 전환할 수 있습니다. 이전의 `/questions/` 주소는 첫 페이지의 자주 묻는 질문으로 영구 리디렉션됩니다. 첫 페이지의 데이터 출처는 [샘플링 설명](../../website/src/data/README.md)을 참고합니다. 첫 페이지, 다운로드 페이지와 변경 기록 페이지의 버전 설명은 안정판 태그의 각 언어 `changelog/<언어 태그>.md`에서 가져오고(태그가 `changelog/` 디렉터리보다 이전이면 루트의 한국어판과 영어판 두 부를 읽습니다), 안정판 태그에 특정 언어가 없으면 `main` 커밋에서 그 언어의 게시된 버전 항목을 가져옵니다. 커밋 통계는 개발판 커밋에서 가져오고 GitHub 별표, 포크와 내려받기 수는 빌드할 때 GitHub API로 읽습니다(로컬 미리보기는 한 시간에 최대 한 번 읽고 읽기에 실패하면 이전 결과를 쓰며 결과가 없으면 페이지에 그 숫자를 표시하지 않습니다). 문서는 Fumadocs를 쓰고 검색 색인은 문서만 담으며 검색 상자에서 판을 거릅니다. 웹사이트는 한국어, 영어, 스페인어, 독일어, 일본어, 프랑스어와 러시아어를 지원하고 세부 문서는 한국어로 유지합니다. 언어마다 주소가 따로 있고(한국어는 접두사 없음) 브라우저 언어로 자동 이동하지 않습니다. 루트 주소는 다른 언어를 선택한 적이 있는 방문자만 그 언어 첫 페이지로 보내며 페이지 언어와 방문자의 언어가 다르면 페이지 머리글 아래에 해당 판을 알립니다. 변경 기록 본문은 각 언어의 번역을 쓰고 그 언어의 번역이 없으면 영어로 대체하며 한국어 페이지는 한국어 원문을 쓰고 본문 앞에 그 사실을 알립니다. 날짜와 페이지 컨트롤은 선택한 언어로 표시합니다. 각 언어 README는 위쪽에서 서로 링크합니다. 웹사이트와 문서는 시스템 설정, 밝은 테마와 어두운 테마의 테마 기본 설정을 함께 씁니다. 디렉터리 분담, 로컬 미리보기와 브라우저 확인 명령은 [website/README.md](../../website/README.md)를 참고합니다.

빌드는 두 EXE를 공개 SHA-256으로 확인하고 클라이언트의 공개 키로 설치 패키지와 서명된 릴리스 설명을 검증합니다. 현재 채널의 파일은 미러가 먼저 제공합니다. 단일 파일 25 MiB를 넘는 파일과 이전 버전 링크는 같은 버전의 GitHub 릴리스 파일로 돌아갑니다. Free 한도가 바뀌면 [Cloudflare 제한](https://developers.cloudflare.com/workers/platform/limits/)을 함께 확인합니다.

빌드 산출물 `release.json`은 안정판과 베타 채널의 다운로드 메타데이터를 유지합니다. 로컬 정적 검사와 배포 후 `downloads` 공개 검사 모두 두 채널이 가리키는 설치 패키지와 포터블 버전을 크기, SHA-256과 큰 파일의 업스트림 리디렉션까지 확인하며 두 채널이 같은 버전을 가리키면 한 번만 검사합니다. 베타 파일이 없거나 손상되면 다운로드 미러 단계가 실패하고 이후 업데이트 매니페스트와 웹사이트 배포도 멈춥니다.

프로덕션 설정은 `website/cloudflare/<서비스>.jsonc`입니다. `downloads`, `updates`, `site`, `www` 순서로 배포하고 각 단계마다 `node website/scripts/verify.mjs <서비스>`로 공개 결과를 검증한 뒤 다음 단계로 넘어갑니다. 웹사이트 페이지는 이번 빌드와 바이트 단위로 같아야 합니다. 먼저 `bunx wrangler@4.156.2 deploy --dry-run --config website/cloudflare/site.jsonc`를 실행할 수 있고 정식 배포는 같은 명령에서 `--dry-run`을 빼고 실행합니다. 배포는 `website/scripts/deploy.mjs`가 고정한 Wrangler 버전을 호출하며 429, 일부 5xx 게이트웨이 오류와 분명한 연결 시간 초과에는 5초와 15초 간격으로 최대 세 번 시도합니다. 인증, 권한과 설정 오류는 즉시 멈추고 성공한 뒤에도 단계마다 공개 검증을 합니다. 릴리스를 거둔 뒤에는 최신 정식 릴리스에서 빌드와 배포를 다시 실행하고 필요하면 Cloudflare에서 거둔 파일의 캐시를 지웁니다.

배포 자동화는 저장소의 `.github/`에 있던 워크플로가 맡았으나 지금은 없습니다. 같은 자동화를 다시 세울 때는 Secret `CLOUDFLARE_API_TOKEN`과 변수 `CLOUDFLARE_ACCOUNT_ID`를 씁니다. 배포 토큰은 네 개의 `goodgoodtask-*` Worker에 `Individual Workers Editor`를, `goodgoodtask.com`에 `Workers Routes Write`를 사용합니다. `GOODGOOD_WEBSITE_DEPLOY=true`이면 GitHub Release 게시가 끝난 뒤 웹사이트 배포 단계를 호출하고 `main`에 대해 수동으로 배포할 수도 있습니다. 배포는 `main`이나 버전 태그에서만 실행하며 출처가 다르거나 토큰, 계정 ID가 없으면 빌드 전에 멈춥니다.

## 검색 엔진과 언어 모델

페이지의 제목, 설명, 표준 주소, 언어 상호 링크와 구조화 데이터는 빌드할 때 만들어집니다. 첫 페이지는 웹사이트, 애플리케이션과 자주 묻는 질문을 선언하고 다운로드 페이지는 애플리케이션을, 문서 페이지는 글과 이동 경로를 선언합니다. 개발판에서 안정판에도 있는 페이지는 안정판을 표준 주소로 쓰고 개발판에만 있는 페이지는 자신을 표준 주소로 씁니다. 사이트맵은 표준 주소만 나열하고 게시 날짜나 문서의 마지막 커밋 날짜로 갱신 시각을 표시합니다. 문서 설명은 본문 첫 문단에서 150자 이내의 마지막 완전한 문장까지를 씁니다.

`/llms.txt`는 [llms.txt](https://llmstxt.org/) 형식으로 첫 페이지의 소개, 작업 관리자와의 차이, 자주 묻는 질문과 안정판 각 문서의 Markdown 주소를 정리하며 내용은 첫 페이지와 문서 데이터에서 가져와 빌드할 때 갱신됩니다. `/llms-full.txt`는 안정판 문서 전문입니다. 각 문서의 Markdown 사본(`/llms.mdx/docs/…/content.md`)은 도구가 읽도록 제공하고 응답 헤더 `X-Robots-Tag: noindex`로 검색 결과에 나타나지 않게 합니다. `robots.txt`는 모든 페이지의 수집을 허용하고 Next.js의 탐색 데이터 파일과 아래의 `index.md`만 제외하며 [Content Signals](https://contentsignals.org/)에 따라 `ai-train=yes, search=yes, ai-input=yes`를 선언합니다. 즉 내용을 검색, AI 답변과 AI 학습에 쓸 수 있으며 이는 `/llms.txt`를 제공하는 의도와 같습니다.

요청 헤더 `Accept`에 `text/markdown`이 있으면 페이지 주소가 그 페이지의 Markdown을 반환합니다. Cloudflare의 Markdown for Agents는 Pro 이상 요금제에서만 쓸 수 있고 Worker의 `run_worker_first`는 Free 한도를 다 쓰면 일치하는 요청에 429를 반환하므로 사이트 전체를 쓸 수 없게 됩니다. 그래서 빌드할 때 `website/scripts/markdown.mjs`가 페이지마다 옆에 `index.md`를 씁니다. 문서는 `/llms.mdx/` 아래 사본을 쓰고 그 밖의 페이지는 `<main>` 내용을 변환하며 컨트롤, 숨은 요소와 `data-markdown="skip"`이 붙은 인터랙티브 시연은 건너뜁니다. 첫머리의 YAML에 제목, 설명과 주소를 적습니다. `_headers`는 페이지와 사본에 `Vary: Accept`를 붙입니다. 요청은 영역의 URL 재작성 규칙 하나로 `index.md`로 전달됩니다. 이 규칙은 배포와 함께 게시되지 않으므로 웹사이트 배포가 `index.md`를 만든 뒤 Cloudflare 콘솔의 `goodgoodtask.com` 영역에서 Rules → Overview → Create rule → URL Rewrite Rule로 한 번 만들어야 합니다(배포보다 먼저 만들면 Markdown 요청이 404를 받습니다).

- 일치 방식은 Custom filter expression을 고르고 Edit expression에 `http.host eq "goodgoodtask.com" and any(http.request.headers["accept"][*] contains "text/markdown") and ends_with(http.request.uri.path, "/")`를 넣습니다. 주 도메인으로 한정해 같은 영역의 `dl`, `update`와 `www` 요청을 다시 쓰지 않게 합니다.
- Path는 Rewrite to → Dynamic을 고르고 `concat(http.request.uri.path, "index.md")`를 넣습니다. Query는 그대로 둡니다.

끝에 슬래시가 없는 주소는 정적 자산 서비스가 슬래시가 있는 주소로 먼저 리디렉션하고 그다음 위 규칙으로 다시 씁니다. 배포 후 `site` 검증은 `/en/download/`로 협상 결과를 확인하고 규칙이 없으면 경고만 내고 배포를 멈추지 않습니다. 새 페이지를 넣을 때도 사본이 함께 만들어지며 인터랙티브 시연이 있는 영역에는 `data-markdown="skip"`을 붙입니다.

## 메일과 배포 매니페스트

`contact@goodgoodtask.com`은 일반 문의를, `security@goodgoodtask.com`은 비공개 취약점 보고를 받습니다. 두 주소는 Cloudflare Email Routing으로 검증한 받은 편지함으로 전달합니다. `website/public-settings.json`의 `emailRoutingVerified`가 각 언어 바닥글, 보안 보고 페이지와 `security.txt`의 메일 진입점을 제어합니다. 목적 주소는 Cloudflare에서 관리하고 `security.txt`의 유효 기간은 빌드할 때 갱신합니다.

빌드는 또 `target/official-web/dist/packages/`에 WinGet과 Scoop 매니페스트 초안을 만들며 버전이 들어간 업스트림 URL과 해당 파일의 SHA-256을 씁니다. WinGet 매니페스트는 `winget validate --manifest <매니페스트 디렉터리>`로 확인할 수 있습니다. 소프트웨어 저장소가 검토를 거쳐 병합하고 설치를 검증한 뒤 해당 설치 명령을 공개합니다.
