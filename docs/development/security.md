# 의존성과 보안 유지 관리

`Cargo.toml`, `.node-version`과 `package.json`이 도구 체인 버전을 선언하고 `Cargo.lock`과 `pnpm-lock.yaml`이 의존성을 고정합니다. `pnpm check:security`는 의존성 취약점을 검사합니다. 의존성을 업그레이드한 뒤 `node scripts/notices.mjs`로 타사 고지를 갱신하고 `start.bat check`를 실행합니다.

프로세스를 다루는 작업은 PID와 생성 시간으로 대상 신원을 확인합니다. 권한 있는 서비스는 호출 계정과 명령 종류로 권한을 부여하고 커널 센서는 고정 PawnIO 모듈로 읽습니다. 권한 경계는 [권한 있는 서비스](../architecture/privileged-service.md)를 참고합니다.

종료 작업은 이미 신원을 확인한 같은 핸들에서 중요한 프로세스 플래그를 검사합니다. 성공한 부정 결과, 중요한 프로세스와 검사 실패를 각각 다르게 처리하고 검사에 실패하면 강제 종료를 요청했더라도 실행을 거부합니다. [`IsProcessCritical`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-isprocesscritical)을 쓰고 전체 쿼리 권한을 따로 요구하지 않습니다.

클라이언트는 `resources/app.json`의 공개 키로 업데이트 패키지와 업데이트 설명의 서명과 버전을 검증합니다. 설치된 클라이언트가 신뢰하는 공개 키와 서명에 대한 버전 번호 검증을 유지하고 서명 단계는 GitHub Secrets에서 개인 키를 읽습니다. 구체적인 절차는 [커밋과 릴리스](release.md)를 참고합니다.

진단 로그는 실패 단계, 시스템 오류 코드와 실패에 직접 관여한 경로를 기록하고 반복되는 오류는 분류별로 빈도를 제한합니다. 설치, 제거와 서비스 변경은 격리된 환경에서 검증합니다.

## 유지 관리가 중단된 의존성의 후속 이전

2026-11-06에 다음 Windows 빌드의 간접 의존성을 확인했습니다. v0.4.0에서는 교체를 미루고 일반 감사에서 나오는 유지 관리 안내를 남겨 두었습니다. 이후 이전할 때는 구성 요소 인터페이스, 텍스트와 아이콘 그리기, 입력 상호 작용과 리소스 비용을 다시 확인해야 합니다.

| 의존성 | 현재 도입 경로 | 유지 관리 공지 | 이후 방향 |
| --- | --- | --- | --- |
| `instant 0.1.13` | `gpui-base`, `gpui-component` | [RUSTSEC-2024-0384](https://rustsec.org/advisories/RUSTSEC-2024-0384.html) | 업스트림을 따라가며 `web-time`으로 바꾸는 방안을 검토하고 애니메이션, 커서와 실행 취소 기록의 시간 동작을 확인합니다 |
| `paste 1.0.15` | `gpui-component` | [RUSTSEC-2024-0436](https://rustsec.org/advisories/RUSTSEC-2024-0436.html) | 유지 관리되는 `pastey`를 검토하고 매크로 확장을 다시 확인합니다 |
| `rustybuzz 0.20.1` | `resvg → usvg` | [RUSTSEC-2026-0206](https://rustsec.org/advisories/RUSTSEC-2026-0206.html) | HarfRust를 쓰는 SVG 의존성 버전을 따라가며 텍스트 셰이핑과 대체 글꼴을 확인합니다 |
| `ttf-parser 0.25.1` | `gpui-pre`, `fontdb`, `rustybuzz` | [RUSTSEC-2026-0192](https://rustsec.org/advisories/RUSTSEC-2026-0192.html) | SVG 글꼴 사슬과 직접 글꼴 쿼리를 함께 이전하고 Skrifa／Fontations를 검토하며 글꼴 적용 범위 검사를 유지합니다 |

2026-11-16에 GPUI Kit 0.10.0으로 올린 뒤에도 GPUI Kit은 `instant`와 `paste`를 계속 가져오므로 이전은 기존 로컬 GPUI 수정과 함께 검토해야 합니다. 잠금 파일의 `rustls-pemfile`, `zbus_names`, `zvariant`, `zvariant_derive`에도 유지 관리 중단 안내가 있지만 현재 Windows 대상 의존성 트리는 이 패키지들을 쓰지 않습니다. 플랫폼을 넓힐 때 다시 확인합니다. 매 릴리스마다 최신 감사 데이터베이스와 실제 대상 의존성 트리를 기준으로 삼고 관련 검사 명령은 `pnpm check:security`와 `cargo tree --target x86_64-pc-windows-msvc -i <패키지 이름>`입니다.
