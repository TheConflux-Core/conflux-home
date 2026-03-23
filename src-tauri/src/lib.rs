// Conflux Home — Tauri Entry Point
// Initializes the Conflux Engine and exposes commands to the frontend.

pub mod engine;
mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            let db_path = app_data_dir.join("conflux.db");
            engine::init_engine(&db_path)
                .expect("Failed to initialize Conflux Engine");

            log::info!("Conflux Engine initialized at {:?}", db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Chat
            commands::engine_chat,
            commands::engine_chat_stream,
            // Sessions
            commands::engine_create_session,
            commands::engine_get_sessions,
            commands::engine_get_messages,
            // Agents
            commands::engine_get_agents,
            commands::engine_update_agent,
            // Quota
            commands::engine_get_quota,
            // Memory
            commands::engine_store_memory,
            commands::engine_search_memory,
            commands::engine_get_memories,
            commands::engine_delete_memory,
            // Providers
            commands::engine_get_providers,
            commands::engine_update_provider,
            commands::engine_delete_provider,
            commands::engine_test_provider,
            // Provider Templates
            commands::engine_get_provider_templates,
            commands::engine_install_template,
            // Provider API Keys (direct — no middlemen)
            commands::engine_set_openai_key,
            commands::engine_get_openai_key_masked,
            commands::engine_set_anthropic_key,
            commands::engine_get_anthropic_key_masked,
            commands::engine_set_xiaomi_key,
            commands::engine_get_xiaomi_key_masked,
            commands::engine_get_router_providers,
            // Agent Registry & Capabilities
            commands::engine_get_agent_capabilities,
            commands::engine_find_agents_by_capability,
            commands::engine_get_agent_permissions,
            // Inter-Agent Communication
            commands::engine_agent_ask,
            commands::engine_get_communications,
            // Tasks
            commands::engine_create_task,
            commands::engine_update_task,
            commands::engine_get_task,
            commands::engine_get_tasks_for_agent,
            // Verification (Anti-Hallucination)
            commands::engine_create_verification,
            commands::engine_complete_verification,
            commands::engine_get_unverified_claims,
            // Lessons Learned
            commands::engine_add_lesson,
            commands::engine_get_lessons,
            // Cron Jobs
            commands::engine_create_cron,
            commands::engine_get_crons,
            commands::engine_toggle_cron,
            commands::engine_delete_cron,
            commands::engine_tick_cron,
            // Webhooks
            commands::engine_create_webhook,
            commands::engine_get_webhooks,
            commands::engine_delete_webhook,
            commands::engine_handle_webhook,
            // Events
            commands::engine_get_events,
            commands::engine_mark_event_processed,
            // Heartbeats
            commands::engine_run_health_checks,
            commands::engine_get_heartbeats,
            // Skills
            commands::engine_get_skills,
            commands::engine_get_skill,
            commands::engine_get_skills_for_agent,
            commands::engine_install_skill,
            commands::engine_toggle_skill,
            commands::engine_uninstall_skill,
            // Notifications
            commands::engine_send_notification,
            // Email Config
            commands::engine_set_email_config,
            commands::engine_get_email_config,
            // Google
            commands::engine_google_is_connected,
            commands::engine_google_get_email,
            commands::engine_google_auth_url,
            commands::engine_google_connect,
            commands::engine_google_disconnect,
            commands::engine_google_set_credentials,
            commands::engine_google_get_credentials,
            // Health
            commands::engine_health,
            // Family Members
            commands::family_list,
            commands::family_create,
            commands::family_delete,
            // Agent Templates
            commands::agent_templates_list,
            commands::agent_template_install,
            // Story Games
            commands::story_games_list,
            commands::story_game_create,
            commands::story_game_get,
            commands::story_chapters_list,
            commands::story_seeds_list,
            commands::story_choose_path,
            commands::story_solve_puzzle,
            commands::story_generate_next_chapter,
            // Learning Tracking
            commands::learning_log_activity,
            commands::learning_get_activities,
            commands::learning_get_progress,
            commands::learning_create_goal,
            commands::learning_get_goals,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
