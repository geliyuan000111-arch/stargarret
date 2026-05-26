#[tauri::command]
fn set_pin_window_level(window: tauri::WebviewWindow, pinned: bool) {
    #[cfg(target_os = "macos")]
    {
        use objc::{msg_send, sel, sel_impl};
        use objc::runtime::Object;
        unsafe {
            if let Ok(ns_win) = window.ns_window() {
                let ns_window = ns_win as *mut Object;
                if pinned {
                    // NSFloatingWindowLevel = 3，凌驾于所有普通窗口
                    let _: () = msg_send![ns_window, setLevel: 3i64];
                    // CanJoinAllSpaces(1) | FullScreenAuxiliary(256)：跨 Space 可见 + 全屏模式下仍显示
                    let _: () = msg_send![ns_window, setCollectionBehavior: 257u64];
                } else {
                    // NSNormalWindowLevel = 0，恢复普通窗口
                    let _: () = msg_send![ns_window, setLevel: 0i64];
                    // NSWindowCollectionBehaviorManaged = 4，标准 Spaces 管理行为
                    let _: () = msg_send![ns_window, setCollectionBehavior: 4u64];
                }
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.set_always_on_top(pinned);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![set_pin_window_level])
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
