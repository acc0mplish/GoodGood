//! Checks the pinned package and Windows signature without running it.
use std::path::Path;
fn main() {
    let path = std::env::args_os().nth(1).expect("installer file argument");
    let downloading = path == "--download-check";
    let result = if downloading {
        goodgood_service::driver::verify_installer_download()
    } else {
        goodgood_service::driver::verify_installer(Path::new(&path))
    };
    match result {
        Ok(version) => {
            println!(
                "PawnIO {version}: {} verified; not executed",
                if downloading {
                    "official HTTPS download and digest"
                } else {
                    "package hash and Windows signature"
                }
            )
        }
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
