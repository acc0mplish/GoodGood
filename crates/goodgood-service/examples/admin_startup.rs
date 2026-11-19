//! Isolated VM smoke fixture for the administrator startup transport.
//! Never run management modes on a developer's desktop.
//! Build with `--release`; development hosts cannot register persistent grants.
const ID: &str = "dev.goodgood.admin-transport-test";
fn main() {
    goodgood_service::admin::configure_support(!cfg!(debug_assertions));
    if let Some(code) = goodgood_service::admin::run_mode(ID) {
        std::process::exit(code);
    }
    let args: Vec<_> = std::env::args().collect();
    if args.iter().any(|a| a == "status") {
        std::fs::write(
            std::env::temp_dir().join("goodgood-admin-transport-status.json"),
            serde_json::to_vec(&goodgood_service::admin::status(ID)).unwrap(),
        )
        .unwrap();
        return;
    }
    if !goodgood_core::privilege::is_elevated()
        && goodgood_service::admin::enabled(ID)
        && !args.iter().any(|a| a == goodgood_service::admin::FALLBACK)
    {
        if let Err(error) =
            goodgood_service::admin::prepare(ID, &args, true).and_then(|p| p.commit())
        {
            std::fs::write(
                std::env::temp_dir().join("goodgood-admin-transport-error.txt"),
                error,
            )
            .unwrap();
            std::process::exit(1);
        }
        return;
    }
    let path = std::env::temp_dir().join("goodgood-admin-transport-result.json");
    std::fs::write(
        path,
        serde_json::to_vec(&serde_json::json!({
            "pid": std::process::id(), "elevated": goodgood_core::privilege::is_elevated(),
            "hidden": args.iter().any(|a| a == "--hidden"),
            "updated": args.iter().any(|a| a == "--updated"),
        }))
        .unwrap(),
    )
    .unwrap();
    goodgood_service::admin::acknowledge(&args);
}
