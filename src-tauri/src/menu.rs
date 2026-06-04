// Native application menu. Custom items emit a `menu` event (with the item id)
// that the frontend routes to the same actions as its command palette; system
// items (copy/paste/quit/…) use Tauri's predefined menu items.

use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Runtime};

const REPO_URL: &str = "https://github.com/mehdisayn/IWE";

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let about = MenuItemBuilder::with_id("about", "About IWE").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let app_menu = SubmenuBuilder::new(app, "IWE")
        .item(&about)
        .separator()
        .item(&settings)
        .separator()
        .services()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let new_item = MenuItemBuilder::with_id("new", "New Note")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let save_item = MenuItemBuilder::with_id("save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let open_item = MenuItemBuilder::with_id("open", "Open Folder…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_item)
        .item(&save_item)
        .separator()
        .item(&open_item)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let sidebar = MenuItemBuilder::with_id("toggle.sidebar", "Toggle Sidebar")
        .accelerator("CmdOrCtrl+B")
        .build(app)?;
    let terminal = MenuItemBuilder::with_id("toggle.terminal", "Toggle Terminal")
        .accelerator("CmdOrCtrl+`")
        .build(app)?;
    let scm = MenuItemBuilder::with_id("toggle.git", "Toggle Source Control")
        .accelerator("CmdOrCtrl+Shift+G")
        .build(app)?;
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&sidebar)
        .item(&terminal)
        .item(&scm)
        .separator()
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    let updates = MenuItemBuilder::with_id("help.update", "Check for Updates…").build(app)?;
    let repo = MenuItemBuilder::with_id("help.repo", "IWE on GitHub").build(app)?;
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&updates)
        .separator()
        .item(&repo)
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()
}

pub fn handle<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();
    match id {
        "help.repo" => {
            let _ = open_url(REPO_URL);
        }
        // Everything else is handled by the frontend, which mirrors the palette.
        other => {
            let _ = app.emit("menu", other.to_string());
        }
    }
}

/// Open an http(s) URL in the user's default browser. Used by the menu and the
/// About dialog. Refuses non-web schemes so it can't be turned into a launcher.
#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    open_url(&url)
}

fn open_url(url: &str) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only http(s) URLs are allowed".into());
    }
    #[cfg(target_os = "macos")]
    let mut cmd = std::process::Command::new("open");
    #[cfg(target_os = "linux")]
    let mut cmd = std::process::Command::new("xdg-open");
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = std::process::Command::new("cmd");
        c.args(["/C", "start", ""]);
        c
    };
    cmd.arg(url);
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}
