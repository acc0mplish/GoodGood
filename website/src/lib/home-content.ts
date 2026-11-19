import { copyFor, localize } from "@/lib/site-i18n";
import runs from "../data/windows-interaction.json";
import type { Latency } from "../components/home/LatencyBoard";
import { development, localized, nativeStable, stable, type Language } from "./site";

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b),
    m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const measured = (tool: string, ops: string[]) =>
  Math.round(
    median(
      runs
        .filter((run) => run.tool === tool && ops.includes(run.operation))
        .flatMap((run) => run.ms),
    ),
  );
const operations: [string, string, string, string[]][] = [
  ["cpu-out", "프로세스 → CPU 성능", "Processes → CPU", ["cpu-out"]],
  ["cpu-back", "CPU 성능 → 프로세스", "CPU → Processes", ["cpu-back"]],
  ["svc-back", "서비스 → 프로세스", "Services → Processes", ["svc-back"]],
  ["svc-out", "프로세스 → 서비스", "Processes → Services", ["svc-out"]],
  ["sort", "PID로 정렬", "Sort by PID", ["sort-up", "sort-down"]],
  ["row", "다른 행 선택", "Select another row", ["row"]],
];
export const latency = (lang: Language): Latency[] =>
  operations.map(([id, ko, en, ops]) => ({
    id,
    label: localize(lang, lang !== "ko" ? en : ko),
    goodgood: measured("goodgood", ops),
    native: measured("native", ops),
  }));
export const fastest = latency("ko").reduce((a, b) =>
  b.native / b.goodgood > a.native / a.goodgood ? b : a,
);

// Use the matching published documentation once the native interface has shipped.
const homeDocs = nativeStable ? stable : development;
export const docs = (file: string, hash = "") =>
  (homeDocs.routes[file] ?? development.routes[file] ?? homeDocs.base) + (hash ? "#" + hash : "");

// Only rows where the two tools differ; each names the place in the window
// that shows it (ShowPage.tsx): a page, a view of the process list, or a
// device of the performance page.
type Difference = [string, string, string, string | null];
export const differences = (lang: Language): Difference[] =>
  localize(lang, lang !== "ko"
    ? [
        ["Which process holds a port", "The Connections page lists TCP and UDP endpoints; search for an exact port and close a connection", "Not available; use Resource Monitor or the command line", "connections"],
        ["Which process locks a file", "Drop the file or folder on the window, then end the holder", "Not available; use Resource Monitor", null],
        ["Parent and child processes", "A process tree view", "Grouped by app only", "tree"],
        ["Disk reads and writes", "Separate read, write and I/O rates per process", "One combined Disk column", "list"],
        ["Disk health and wear", "The disk's details page shows health, remaining life, temperature and SMART attributes", "Model, capacity and transfer rates only", "disk-details"],
        ["A busy moment yesterday", "Seven days of curves with the busiest processes at any point", "App history shows cumulative totals", "history"],
        ["Priority and efficiency mode", "Save as a rule that applies whenever the program starts", "Applies to the running process only", null],
        ["Change a service's startup type", "Set it to automatic, manual or disabled on the Services page", "Not available; use the Services console", "services"],
        ["CPU temperature and power", "Package temperature, power and per-core readings with optional kernel sensors", "Not shown", "cpu-details"],
        ["Performance and efficiency cores", "Filter the per-core view by P and E cores with separate clocks", "Logical processors without core types", "cpu-cores"],
        ["GPU power and clocks", "The Performance page shows GPU power draw, core and memory clocks and each engine's load", "Utilization, memory and temperature only", "gpu"],
        ["Battery health", "The Performance page shows health, cycle count, design capacity and charge or discharge power", "Not shown", "battery"],
      ]
    : [
        ["포트를 점유한 프로세스", "연결 페이지에 TCP와 UDP 끝점이 나오며 포트로 정확히 검색하고 연결을 끊을 수 있습니다", "없음. 리소스 모니터나 명령줄이 필요합니다", "connections"],
        ["파일을 잠근 프로세스", "파일이나 폴더를 창으로 끌어다 놓으면 찾을 수 있고 바로 끝낼 수 있습니다", "없음. 리소스 모니터가 필요합니다", null],
        ["프로세스의 부모와 자식 관계", "프로세스 트리 보기", "앱별 그룹만 제공", "tree"],
        ["디스크 읽기와 쓰기 분리", "프로세스마다 읽기, 쓰기, I/O 속도를 따로 표시합니다", "프로세스 페이지에는 합계 디스크 열만 있습니다", "list"],
        ["디스크 상태와 수명", "디스크 세부 정보 페이지에 상태, 남은 수명, 온도, SMART 특성이 나옵니다", "모델, 용량, 전송 속도만 표시합니다", "disk-details"],
        ["어제의 높은 사용량 되짚어 보기", "최근 7일 곡선에서 어느 시점의 가장 사용량이 많은 프로세스든 확인할 수 있습니다", "앱 기록에는 누적 사용량만 있습니다", "history"],
        ["우선 순위와 효율성 모드", "규칙으로 저장하면 프로그램이 시작할 때마다 자동 적용됩니다", "실행 중인 프로세스에만 적용됩니다", null],
        ["서비스의 시작 유형 변경", "서비스 페이지에서 자동, 수동, 사용 안 함으로 바로 바꿀 수 있습니다", "없음. ‘서비스’ 도구를 열어야 합니다", "services"],
        ["CPU 온도와 전력", "패키지 온도, 전력, 코어별 값을 볼 수 있습니다(선택적 커널 센서)", "표시하지 않습니다", "cpu-details"],
        ["P-코어와 E-코어", "코어별 보기를 P-코어와 E-코어로 나누어 주파수를 따로 표시합니다", "논리 프로세서만 있고 코어 유형이 없습니다", "cpu-cores"],
        ["GPU 전력과 클록", "성능 페이지에 GPU 전력, 코어와 메모리 클록, 엔진별 사용률이 나옵니다", "사용률, 전용 메모리, 온도만 표시합니다", "gpu"],
        ["배터리 상태", "성능 페이지에 상태, 충전 주기, 설계 용량, 충전 또는 방전 전력이 나옵니다", "표시하지 않습니다", "battery"],
      ]);

type Question = [string, string, string, string];
export const questions = (lang: Language): Question[] =>
  localize(lang, lang !== "ko"
    ? [
        ["replace", "Can GoodGood replace the Windows Task Manager?", "Yes. Turn on the replacement in Settings → Permissions and Ctrl+Shift+Esc, the taskbar menu and taskmgr open GoodGood. It needs the optional privileged service and one administrator approval; turning it off restores Task Manager.", docs("docs/architecture/task-manager.md")],
        ["admin", "Does it need to run as administrator?", "Standard rights are enough to view processes and resource use. The optional privileged service handles operations and collection that require additional permissions, including controlling services and collecting per-process network traffic. Installing it requires administrator approval; the interface can keep standard rights.", docs("docs/guide/settings.md", "권한")],
        ["windows", "Which versions of Windows are supported?", "Windows 10 22H2 (build 19045) and later, including Windows 11, on x64, with a DirectX 11 capable graphics device and driver.", docs("docs/guide/hardware-data.md", "시스템 호환 범위")],
        ["background", "How much does it cost to keep running?", "Hidden in the tray, the window stops drawing; sampling, history and rules continue. The tray and minimized states each have their own sampling interval, five seconds by default.", docs("docs/guide/resident-mode.md")],
        ["temperature", "Why is the CPU temperature missing?", "Windows does not report processor temperature directly. With kernel sensors turned on in Settings → Permissions, GoodGood reads temperatures, power and per-core values through the privileged service and the signed PawnIO driver.", docs("docs/guide/hardware-data.md")],
        ["privacy", "Does GoodGood upload anything?", "Process lists, history and settings stay on the computer. GoodGood has no usage telemetry, ad tracking or automatic crash reporting. Network access covers update checks and downloads, optional PawnIO downloads, and external links opened on request. Update checks can be switched to manual in Settings.", localized(lang, "/privacy/")],
        ["portable", "Installer or portable?", "The installed version goes in Program Files and supports in-app updates. The portable version is a single EXE that runs directly, shares settings and history with the installed version, and requires manual updates.", localized(lang, "/download/")],
      ]
    : [
        ["replace", "GoodGood이 Windows 작업 관리자를 대신할 수 있나요?", "가능합니다. 설정 → 권한에서 대체를 켜면 Ctrl+Shift+Esc, 작업 표시줄 메뉴, taskmgr 실행이 모두 GoodGood을 엽니다. 선택적인 권한 있는 서비스를 사용하며 관리자 승인이 한 번 필요합니다. 끄면 Windows 작업 관리자로 돌아갑니다.", docs("docs/architecture/task-manager.md")],
        ["admin", "관리자 권한으로 실행해야 하나요?", "표준 권한으로도 프로세스와 리소스 사용량을 볼 수 있습니다. 서비스 제어와 프로세스별 네트워크 트래픽 수집처럼 추가 권한이 필요한 작업과 수집은 권한 있는 서비스가 수행합니다. 서비스 설치에는 관리자 승인이 필요하며, 인터페이스는 표준 권한으로 계속 실행할 수 있습니다.", docs("docs/guide/settings.md", "권한")],
        ["windows", "어떤 Windows 버전을 지원하나요?", "Windows 10 22H2(빌드 19045) 이상, Windows 11 포함, x64 전용입니다. DirectX 11을 지원하는 그래픽 장치와 드라이버가 필요합니다.", docs("docs/guide/hardware-data.md", "시스템 호환 범위")],
        ["background", "백그라운드에 두면 리소스를 얼마나 사용하나요?", "알림 영역에 숨기면 창은 그리기를 멈추고 수집, 기록, 규칙은 계속 실행됩니다. 알림 영역과 최소화 상태의 수집 간격은 따로 설정할 수 있고 기본값은 모두 5초입니다.", docs("docs/guide/resident-mode.md")],
        ["temperature", "CPU 온도가 보이지 않는 이유는 무엇인가요?", "Windows는 프로세서 온도를 직접 제공하지 않습니다. 설정 → 권한에서 커널 센서를 켜면 GoodGood이 권한 있는 서비스와 서명된 PawnIO 드라이버를 통해 온도, 전력, 코어별 값을 읽습니다.", docs("docs/guide/hardware-data.md")],
        ["privacy", "GoodGood이 데이터를 업로드하나요?", "프로세스 목록, 기록, 설정은 이 PC에만 보관합니다. GoodGood에는 사용 추적, 광고 추적, 자동 오류 보고가 없습니다. 네트워크 사용은 업데이트 확인과 다운로드, 필요할 때의 PawnIO 다운로드, 직접 연 외부 링크로 제한됩니다. 업데이트 확인은 설정에서 수동으로 바꿀 수 있습니다.", localized(lang, "/privacy/")],
        ["portable", "설치 버전과 포터블 버전 중 무엇을 골라야 하나요?", "설치 버전은 Program Files에 설치되며 앱 안에서 업데이트할 수 있습니다. 포터블 버전은 설치 없이 바로 실행하는 단일 EXE이며, 설치 버전과 설정과 기록을 공유하고 업데이트는 직접 해야 합니다.", localized(lang, "/download/")],
      ]);
