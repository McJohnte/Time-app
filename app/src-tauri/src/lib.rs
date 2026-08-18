use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_sql::{Migration, MigrationKind};

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS time_logs (
  date TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, task_id)
);
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_task ON checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON time_logs(date);
";

/// Keep the widget on every Space, including over full-screen apps.
///
/// Tauri's `set_visible_on_all_workspaces` only sets `CanJoinAllSpaces`, which
/// follows the user between ordinary desktops but still hides the window when a
/// full-screen app is frontmost. `FullScreenAuxiliary` is the missing half.
#[cfg(target_os = "macos")]
fn keep_on_all_spaces(window: &tauri::WebviewWindow) {
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

    let Ok(ptr) = window.ns_window() else { return };
    if ptr.is_null() {
        return;
    }
    // Safety: Tauri hands back the live NSWindow for this webview window, and
    // this only runs on the main thread during setup.
    unsafe {
        let ns = &*(ptr as *const NSWindow);
        ns.setCollectionBehavior(
            ns.collectionBehavior()
                | NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::FullScreenAuxiliary,
        );
    }
}

#[tauri::command]
async fn open_review(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("review") {
        let _ = w.show();
        let _ = w.set_focus();
        // Reused rather than rebuilt, so tell it to re-read the database.
        let _ = w.emit("tie://refresh", ());
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "review", WebviewUrl::App("index.html?window=review".into()))
        .title("TIE Timer — Weekly Review")
        .inner_size(980.0, 760.0)
        .min_inner_size(700.0, 560.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create base tables",
        sql: SCHEMA,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tie-timer.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![open_review])
        .setup(|app| {
            // No Dock icon on macOS — this is a tray/widget app.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Follow the user across Spaces and full-screen apps, so the widget is
            // on whichever desktop they are working in rather than only the one it
            // was launched on.
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_visible_on_all_workspaces(true);
                #[cfg(target_os = "macos")]
                keep_on_all_spaces(&w);
            }

            let show = MenuItem::with_id(app, "show", "Show Widget", true, None::<&str>)?;
            let review = MenuItem::with_id(app, "review", "Weekly Review", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit TIE Timer", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &review, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                // Template mode draws from the alpha channel alone, which turns the
                // full-bleed app icon into a solid blob. Render it in colour instead.
                .icon_as_template(false)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit_to("main", "tie://wake", ());
                        }
                    }
                    "review" => {
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_review(handle).await;
                        });
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running TIE Timer");
}
