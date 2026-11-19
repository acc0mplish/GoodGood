#![windows_subsystem = "windows"]
fn main() {
    if let Some(code) = goodgood_service::admin::launcher_mode() {
        std::process::exit(code);
    }
    std::process::exit(goodgood_service::taskmgr::launcher_main());
}
