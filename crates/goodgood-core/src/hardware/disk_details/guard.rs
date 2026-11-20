//! Crash guard for disk detail reads.
//!
//! A storage miniport can hang a request forever and take the machine down, so
//! a marker file is written (and flushed) before every read and removed only
//! after a definitive read has been quiet for `SETTLE`. A marker that survives
//! a restart pauses automatic reads; a manual read is the way out. The marker's
//! presence alone blocks: an empty or corrupt file counts. The caller supplies
//! the marker path, so this module knows no application identifier.
//!
//! Overlapping reads follow a taint rule. A "cycle" runs from a read that
//! starts while nothing is in flight until the last overlapping read ends. A
//! read that ends non-definitively (timeout, unavailable, dropped, panicked)
//! taints its cycle, and a tainted cycle never schedules the removal, whatever
//! order the reads finish in. Only a new cycle that ends fully definitive
//! clears the marker, so a manual read is the way out of a kept marker.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// File name callers should use for the marker.
pub const MARKER_FILE: &str = "disk-details-guard.json";
/// How long a definitive read must stay quiet before the marker is removed.
pub const SETTLE: Duration = Duration::from_secs(120);

/// Set once at startup from the marker; read by the sampling thread without IO.
static SAMPLER_HELD: AtomicBool = AtomicBool::new(false);

/// Make the temperature sampler skip (or resume) its device queries.
pub fn hold_sampler(held: bool) {
    SAMPLER_HELD.store(held, Ordering::Relaxed);
}

/// Whether the sampler must not send device queries. Default `false`.
pub fn sampler_held() -> bool {
    SAMPLER_HELD.load(Ordering::Relaxed)
}

/// Outcome of [`Guard::begin`].
#[derive(Debug)]
pub enum Begin {
    /// The marker is written; run the read, then call [`Ticket::finish`].
    Started(Ticket),
    /// An automatic read was refused because a marker exists (or could not be
    /// checked). Nothing was written.
    Paused,
    /// The marker could not be written; the read must not run, manual or not.
    Unwritable(String),
}

#[derive(Debug)]
struct Inner {
    in_flight: usize,
    generation: u64,
    /// A read of the current cycle ended without a definitive result.
    tainted: bool,
}

#[derive(Debug)]
struct Shared {
    path: PathBuf,
    settle: Duration,
    inner: Mutex<Inner>,
}

impl Shared {
    fn lock(&self) -> MutexGuard<'_, Inner> {
        // A poisoned lock still guards a consistent counter pair; keep going so
        // a panicked reader cannot disable the guard.
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }
}

/// Marker bookkeeping shared by every disk detail read of one process.
#[derive(Debug, Clone)]
pub struct Guard {
    shared: Arc<Shared>,
}

impl Guard {
    /// Guard for `marker_path` with the production wait; does not touch the
    /// sampler hold.
    pub fn new(marker_path: PathBuf) -> Self {
        Self::with_settle(marker_path, SETTLE)
    }

    /// Like [`Guard::new`] with an injected wait (tests).
    pub fn with_settle(marker_path: PathBuf, settle: Duration) -> Self {
        Self {
            shared: Arc::new(Shared {
                path: marker_path,
                settle,
                inner: Mutex::new(Inner {
                    in_flight: 0,
                    generation: 0,
                    tainted: false,
                }),
            }),
        }
    }

    /// Startup entry: build the guard and hold the sampler when a marker is
    /// already present (or cannot be checked).
    pub fn open(marker_path: PathBuf) -> Self {
        hold_sampler(marker_blocks(&marker_path));
        Self::new(marker_path)
    }

    /// Whether a marker blocks automatic reads right now.
    pub fn blocked(&self) -> bool {
        marker_blocks(&self.shared.path)
    }

    /// Ask to start a read of disk `index`.
    pub fn begin(&self, manual: bool, index: u32) -> Begin {
        let mut inner = self.shared.lock();
        if !manual && marker_blocks(&self.shared.path) {
            return Begin::Paused;
        }
        if let Err(error) = write_marker(&self.shared.path, manual, index) {
            return Begin::Unwritable(error.to_string());
        }
        if inner.in_flight == 0 {
            // Nothing is running: a new cycle starts clean.
            inner.tainted = false;
        }
        inner.in_flight += 1;
        inner.generation += 1;
        Begin::Started(Ticket {
            shared: Arc::clone(&self.shared),
            done: false,
        })
    }
}

/// Proof that a marker was written for one running read. Dropping it without
/// [`Ticket::finish`] (a panic included) keeps the marker.
#[derive(Debug)]
pub struct Ticket {
    shared: Arc<Shared>,
    done: bool,
}

impl Ticket {
    /// Report the read as over. The marker is removed only when every read of
    /// the cycle was definitive, nothing else is in flight and the wait passes
    /// with no newer read.
    pub fn finish(mut self, definitive: bool) {
        self.complete(definitive);
    }

    fn complete(&mut self, definitive: bool) {
        if self.done {
            return;
        }
        self.done = true;
        let generation = {
            let mut inner = self.shared.lock();
            inner.in_flight = inner.in_flight.saturating_sub(1);
            if !definitive {
                inner.tainted = true;
            }
            if inner.tainted || inner.in_flight != 0 {
                return;
            }
            inner.generation
        };
        let shared = Arc::clone(&self.shared);
        let spawned = std::thread::Builder::new()
            .name("disk-guard-clear".into())
            .spawn(move || {
                std::thread::sleep(shared.settle);
                let inner = shared.lock();
                if inner.generation == generation && inner.in_flight == 0 && !inner.tainted {
                    // A failed removal keeps the marker and the hold, which is
                    // the safe side; a removed marker lets the sampler resume.
                    if std::fs::remove_file(&shared.path).is_ok() {
                        hold_sampler(false);
                    }
                }
            });
        if let Err(error) = spawned {
            log::warn!("disk guard: clear thread not started, marker kept: {error}");
        }
    }
}

impl Drop for Ticket {
    fn drop(&mut self) {
        self.complete(false);
    }
}

/// Fail-closed existence check: any error counts as present.
fn marker_blocks(path: &Path) -> bool {
    path.try_exists().unwrap_or(true)
}

fn write_marker(path: &Path, manual: bool, index: u32) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let started_at_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let body = serde_json::json!({
        "startedAtMs": started_at_ms,
        "pid": std::process::id(),
        "kind": if manual { "manual" } else { "auto" },
        "index": index,
    });
    let bytes = serde_json::to_vec(&body)?;
    // Fail-closed: an error while checking counts as "existed before".
    let existed = path.try_exists().unwrap_or(true);
    // Written in place: presence alone blocks, so an atomic rename gains
    // nothing. A failure removes the half-written file only when this call
    // created it, so it cannot block the next start although no read happened.
    // A marker left by an earlier session is never removed here: even if
    // `File::create` emptied it, an empty marker still blocks by presence, so
    // the safe side holds.
    let result = std::fs::File::create(path).and_then(|mut file| {
        #[cfg(test)]
        if tests::write_failure_injected() {
            file.write_all(b"{\"half")?;
            return Err(std::io::Error::other("injected write failure"));
        }
        file.write_all(&bytes)?;
        file.sync_all()
    });
    if result.is_err() && !existed {
        let _ = std::fs::remove_file(path);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::Instant;

    thread_local! {
        // Per-thread so parallel tests cannot affect each other; `begin` runs
        // on the calling thread.
        static FAIL_WRITE: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    }

    pub(super) fn write_failure_injected() -> bool {
        FAIL_WRITE.with(|f| f.get())
    }

    /// Makes marker writes on this thread fail until dropped.
    struct FailWrites;
    impl FailWrites {
        fn on() -> Self {
            FAIL_WRITE.with(|f| f.set(true));
            FailWrites
        }
    }
    impl Drop for FailWrites {
        fn drop(&mut self) {
            FAIL_WRITE.with(|f| f.set(false));
        }
    }

    struct Scratch(PathBuf);
    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn scratch(label: &str) -> Scratch {
        let root = std::env::temp_dir().join(format!(
            "goodgood-guard-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&root).unwrap();
        Scratch(root)
    }

    fn marker(dir: &Scratch) -> PathBuf {
        dir.0.join(MARKER_FILE)
    }

    fn started(begin: Begin) -> Ticket {
        match begin {
            Begin::Started(ticket) => ticket,
            other => panic!("expected Started, got {other:?}"),
        }
    }

    fn wait_until(mut done: impl FnMut() -> bool) -> bool {
        let end = Instant::now() + Duration::from_secs(5);
        while Instant::now() < end {
            if done() {
                return true;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        false
    }

    #[test]
    fn marker_survives_restart_and_blocks_auto() {
        let dir = scratch("restart");
        let first = Guard::with_settle(marker(&dir), Duration::from_millis(20));
        let ticket = started(first.begin(false, 3));
        assert!(marker(&dir).exists());
        let text = fs::read_to_string(marker(&dir)).unwrap();
        let value: serde_json::Value = serde_json::from_str(&text).unwrap();
        assert_eq!(value["kind"], "auto");
        assert_eq!(value["index"], 3);
        assert_eq!(value["pid"], std::process::id());
        assert!(value["startedAtMs"].as_u64().unwrap() > 0);
        // The process "dies": no finish, no drop-time cleanup of the file.
        std::mem::forget(ticket);
        let second = Guard::with_settle(marker(&dir), Duration::from_millis(20));
        assert!(second.blocked());
        assert!(matches!(second.begin(false, 3), Begin::Paused));
        // A manual read is still allowed and records its kind.
        let ticket = started(second.begin(true, 3));
        let text = fs::read_to_string(marker(&dir)).unwrap();
        assert!(text.contains("\"manual\""));
        ticket.finish(false);
    }

    #[test]
    fn empty_and_corrupt_marker_block_auto() {
        for (label, bytes) in [("empty", &b""[..]), ("corrupt", &b"{not json\xff"[..])] {
            let dir = scratch(label);
            fs::write(marker(&dir), bytes).unwrap();
            let guard = Guard::with_settle(marker(&dir), Duration::from_millis(20));
            assert!(matches!(guard.begin(false, 0), Begin::Paused), "{label}");
            // Paused wrote nothing.
            assert_eq!(fs::read(marker(&dir)).unwrap(), bytes, "{label}");
        }
    }

    #[test]
    fn unwritable_path_blocks_even_manual() {
        let dir = scratch("unwritable");
        let blocker = dir.0.join("file");
        fs::write(&blocker, b"x").unwrap();
        let guard = Guard::with_settle(
            blocker.join("sub").join(MARKER_FILE),
            Duration::from_millis(20),
        );
        assert!(matches!(guard.begin(true, 0), Begin::Unwritable(_)));
        assert!(matches!(
            guard.begin(false, 0),
            Begin::Unwritable(_) | Begin::Paused
        ));
        // The blocking file is untouched and no marker was left behind.
        assert_eq!(fs::read(&blocker).unwrap(), b"x");
        assert!(matches!(guard.begin(true, 0), Begin::Unwritable(_)));
    }

    #[test]
    fn stale_generation_worker_keeps_newer_marker() {
        let dir = scratch("generation");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(300));
        let first = started(guard.begin(true, 1));
        first.finish(true); // worker for generation 1 starts waiting
        let second = started(guard.begin(true, 2)); // generation 2, new marker
        std::thread::sleep(Duration::from_millis(900)); // worker 1 has woken
        assert!(marker(&dir).exists(), "stale worker deleted the new marker");
        let text = fs::read_to_string(marker(&dir)).unwrap();
        assert!(text.contains("\"index\":2"));
        // Last finish is definitive: its own worker clears the marker.
        second.finish(true);
        assert!(wait_until(|| !marker(&dir).exists()));
    }

    #[test]
    fn failed_write_keeps_a_marker_from_an_earlier_session() {
        let dir = scratch("keep-old");
        let old = br#"{"startedAtMs":1,"pid":7,"kind":"auto","index":2}"#;
        fs::write(marker(&dir), old).unwrap();
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(20));
        let _fail = FailWrites::on();
        assert!(matches!(guard.begin(true, 2), Begin::Unwritable(_)));
        assert!(marker(&dir).exists(), "failed write deleted an old marker");
        // Automatic reads stay paused.
        assert!(matches!(guard.begin(false, 2), Begin::Paused));
    }

    #[test]
    fn failed_write_leaves_no_new_marker() {
        let dir = scratch("no-new");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(20));
        let _fail = FailWrites::on();
        assert!(matches!(guard.begin(true, 1), Begin::Unwritable(_)));
        assert!(!marker(&dir).exists(), "half-written marker was left");
    }

    #[test]
    fn overlap_keeps_marker_when_last_finish_is_not_definitive() {
        let dir = scratch("overlap");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(100));
        let a = started(guard.begin(true, 1));
        let b = started(guard.begin(true, 2));
        a.finish(true); // in_flight stays 1: no worker
        b.finish(false); // last one is not definitive: keep
        std::thread::sleep(Duration::from_millis(500));
        assert!(marker(&dir).exists());
    }

    #[test]
    fn nondefinitive_overlap_keeps_marker_whatever_the_order() {
        let dir = scratch("taint");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(100));
        let a = started(guard.begin(true, 1));
        let b = started(guard.begin(true, 2));
        b.finish(false); // taints the cycle
        a.finish(true); // last to end and definitive, but the cycle is tainted
        std::thread::sleep(Duration::from_millis(600));
        assert!(marker(&dir).exists(), "tainted cycle must keep the marker");

        // Same with the reverse completion order.
        let c = started(guard.begin(true, 3));
        let d = started(guard.begin(true, 4));
        c.finish(false);
        d.finish(true);
        std::thread::sleep(Duration::from_millis(600));
        assert!(marker(&dir).exists());
    }

    #[test]
    fn reverse_order_definitive_finish_clears_marker() {
        let dir = scratch("reverse");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(100));
        let a = started(guard.begin(true, 1));
        let b = started(guard.begin(true, 2));
        b.finish(true); // newest first; a is still running
        a.finish(true);
        assert!(
            wait_until(|| !marker(&dir).exists()),
            "marker must not stay forever"
        );
    }

    #[test]
    fn nondefinitive_alone_keeps_marker_until_a_clean_new_cycle() {
        let dir = scratch("recover");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(100));
        started(guard.begin(true, 1)).finish(false);
        std::thread::sleep(Duration::from_millis(600));
        assert!(marker(&dir).exists());
        // A new read with nothing in flight starts a clean cycle.
        started(guard.begin(true, 1)).finish(true);
        assert!(wait_until(|| !marker(&dir).exists()));
    }

    #[test]
    fn non_definitive_and_dropped_ticket_keep_marker() {
        let dir = scratch("keep");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(50));
        started(guard.begin(true, 0)).finish(false);
        std::thread::sleep(Duration::from_millis(400));
        assert!(marker(&dir).exists());

        drop(started(guard.begin(true, 0)));
        std::thread::sleep(Duration::from_millis(400));
        assert!(marker(&dir).exists());

        let panicked = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _ticket = started(guard.begin(true, 0));
            panic!("read panicked");
        }));
        assert!(panicked.is_err());
        std::thread::sleep(Duration::from_millis(400));
        assert!(marker(&dir).exists());
        // The guard is still usable and the counter did not leak.
        assert_eq!(guard.shared.lock().in_flight, 0);
    }

    #[test]
    fn definitive_finish_clears_after_injected_wait() {
        let dir = scratch("clear");
        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(300));
        let ticket = started(guard.begin(false, 5));
        ticket.finish(true);
        assert!(marker(&dir).exists(), "must not clear before the wait");
        assert!(wait_until(|| !marker(&dir).exists()));
        // Cleared marker lets automatic reads start again.
        started(guard.begin(false, 5)).finish(false);
    }

    #[test]
    fn sampler_hold_follows_marker_and_resumes_after_removal() {
        // `Guard::open` is not called here: it would flip the process-wide
        // flag that other tests read. Its decision is `marker_blocks`.
        // This is the only test that sets the flag to true; it restores false.
        hold_sampler(false);
        assert!(!sampler_held());
        let dir = scratch("hold");
        assert!(!marker_blocks(&marker(&dir)));
        fs::write(marker(&dir), b"").unwrap();
        assert!(marker_blocks(&marker(&dir)));
        fs::remove_file(marker(&dir)).unwrap();

        let guard = Guard::with_settle(marker(&dir), Duration::from_millis(50));
        hold_sampler(true);
        started(guard.begin(true, 0)).finish(true);
        let cleared = wait_until(|| !marker(&dir).exists() && !sampler_held());
        hold_sampler(false);
        assert!(cleared, "removal must lift the sampler hold");
    }
}
