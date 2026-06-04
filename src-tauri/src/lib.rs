mod config_cmds;
mod fs_cmds;
mod git_cmds;
mod term_cmds;
mod watch_cmds;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(watch_cmds::WatchState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs_cmds::pick_folder,
            fs_cmds::list_dir,
            fs_cmds::list_subtree,
            fs_cmds::read_file,
            fs_cmds::write_file,
            fs_cmds::create_file,
            fs_cmds::create_folder,
            fs_cmds::rename,
            fs_cmds::delete,
            git_cmds::git_status,
            git_cmds::git_stage,
            git_cmds::git_stage_all,
            git_cmds::git_unstage,
            git_cmds::git_commit,
            git_cmds::git_push,
            git_cmds::git_log,
            git_cmds::git_diff,
            git_cmds::git_discard,
            git_cmds::git_fetch,
            git_cmds::git_pull,
            git_cmds::git_branches,
            git_cmds::git_checkout,
            term_cmds::run_command,
            term_cmds::change_dir,
            config_cmds::read_config,
            config_cmds::write_config,
            watch_cmds::watch_workspace,
            watch_cmds::unwatch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
