mod boards;
mod window;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            window::create_main_window(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            boards::list_boards,
            boards::load_board,
            boards::save_board,
            boards::delete_board,
            boards::save_export,
            window::get_low_memory,
            window::set_low_memory,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Matboard");
}
