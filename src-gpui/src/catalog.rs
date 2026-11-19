//! The desktop registers its existing catalogs with the shared translation API.
pub fn register() {
    use goodgood_core::i18n::{Locale, register_catalog};
    macro_rules! catalogs { ($locale:literal,$($name:literal),*) => { &[$(($name,include_str!(concat!("../../locales/",$locale,"/",$name,".json")))),*] }; }
    macro_rules! register {
        ($locale:ident, $tag:literal) => {
            register_catalog(
                Locale::$locale,
                catalogs!(
                    $tag,
                    "actions",
                    "common",
                    "components",
                    "connections",
                    "details",
                    "fileLock",
                    "format",
                    "history",
                    "onboarding",
                    "performance",
                    "processes",
                    "services",
                    "settings",
                    "shell",
                    "startup",
                    "tasks",
                    "updates"
                ),
            );
        };
    }
    register!(KoKr, "ko-KR");
    register!(EnUs, "en-US");
    register!(EsEs, "es-ES");
    register!(DeDe, "de-DE");
    register!(JaJp, "ja-JP");
    register!(FrFr, "fr-FR");
    register!(RuRu, "ru-RU");
}

/// Sets the language of all text. The component library keeps a catalog of
/// its own for what it draws itself (accessibility labels, the touch edit
/// menu): it follows the same tag, and falls back to English for the
/// languages it lacks.
pub fn set_locale(locale: goodgood_core::i18n::Locale) {
    goodgood_core::i18n::set_locale(locale);
    gpui_kit::component::set_locale(locale.tag());
}
