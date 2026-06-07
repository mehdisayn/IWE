mod fs_cmds;
mod git_cmds;
mod term_cmds;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
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
      fs_cmds::read_file,
      fs_cmds::write_file,
      fs_cmds::create_file,
      fs_cmds::create_folder,
      fs_cmds::rename,
      fs_cmds::delete,
      fs_cmds::count_words,
      git_cmds::git_status,
      git_cmds::git_stage,
      git_cmds::git_stage_all,
      git_cmds::git_unstage,
      git_cmds::git_commit,
      git_cmds::git_push,
      git_cmds::git_log,
      term_cmds::open_external_terminal,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
