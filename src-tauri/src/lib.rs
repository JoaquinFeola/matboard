mod boards;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            boards::list_boards,
            boards::load_board,
            boards::save_board,
            boards::delete_board,
            boards::save_export,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Matboard");
}
