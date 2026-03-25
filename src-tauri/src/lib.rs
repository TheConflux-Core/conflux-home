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
            // Smart Kitchen
            commands::kitchen_create_meal,
            commands::kitchen_get_meals,
            commands::kitchen_get_meal,
            commands::kitchen_toggle_favorite,
            commands::kitchen_add_ingredient,
            commands::kitchen_ai_add_meal,
            commands::kitchen_set_plan_entry,
            commands::kitchen_get_weekly_plan,
            commands::kitchen_clear_week_plan,
            commands::kitchen_generate_grocery,
            commands::kitchen_get_grocery,
            commands::kitchen_toggle_grocery_item,
            commands::kitchen_add_inventory,
            commands::kitchen_get_inventory,
            // Kitchen Hearth
            commands::kitchen_home_menu,
            commands::kitchen_upload_meal_photo,
            commands::kitchen_identify_meal_from_photo,
            commands::kitchen_plan_week_natural,
            commands::kitchen_suggest_meal_natural,
            commands::kitchen_pantry_heatmap,
            commands::kitchen_use_expiring,
            commands::kitchen_get_cooking_steps,
            commands::kitchen_weekly_digest,
            commands::kitchen_get_nudges,
            commands::kitchen_smart_grocery,
            commands::kitchen_get_meal_photos,
            // Budget Tracker
            commands::budget_add_entry,
            commands::budget_get_entries,
            commands::budget_get_summary,
            commands::budget_delete_entry,
            commands::budget_parse_natural,
            commands::budget_detect_patterns,
            commands::budget_can_afford,
            commands::budget_create_goal,
            commands::budget_get_goals,
            commands::budget_update_goal,
            commands::budget_delete_goal,
            commands::budget_goal_status,
            commands::budget_generate_report,
            // Content Feed
            commands::feed_get_items,
            commands::feed_mark_read,
            commands::feed_toggle_bookmark,
            commands::feed_add_item,
            commands::feed_generate,
            commands::kitchen_recognize_meal,
            // Fridge Scanner
            commands::fridge_scan,
            commands::fridge_what_can_i_make,
            commands::fridge_expiring_soon,
            commands::fridge_shopping_for_meals,
            // Life Autopilot
            commands::life_analyze_document,
            commands::life_get_dashboard,
            commands::life_get_documents,
            commands::life_get_reminders,
            commands::life_get_knowledge,
            commands::life_add_reminder,
            commands::life_ask,
            // Life Autopilot: Orbit
            commands::life_add_task,
            commands::life_get_tasks,
            commands::life_complete_task,
            commands::life_delete_task,
            commands::life_add_habit,
            commands::life_get_habits,
            commands::life_log_habit,
            commands::life_get_orbit_dashboard,
            commands::life_add_daily_focus,
            commands::life_morning_brief,
            commands::life_smart_reschedule,
            commands::life_parse_input,
            commands::life_decision_helper,
            commands::life_get_heatmap,
            commands::life_dismiss_nudge,
            // Home Health
            commands::home_upsert_profile,
            commands::home_get_dashboard,
            commands::home_add_bill,
            commands::home_get_bills,
            commands::home_delete_bill,
            commands::home_add_maintenance,
            commands::home_get_maintenance,
            commands::home_add_appliance,
            commands::home_get_appliances,
            commands::home_get_insights,
            // Foundation AI Commands
            commands::home_diagnose_problem,
            commands::home_predict_failures,
            commands::home_get_seasonal_tasks,
            commands::home_complete_seasonal_task,
            commands::home_detect_anomalies,
            commands::home_get_warranty_alerts,
            commands::home_chat,
            commands::home_get_maintenance_report,
            commands::home_log_problem_natural,
            commands::home_get_year_summary,
            // Dream Builder
            commands::dream_add,
            commands::dream_get_all,
            commands::dream_get_dashboard,
            commands::dream_add_milestone,
            commands::dream_complete_milestone,
            commands::dream_add_task,
            commands::dream_get_tasks,
            commands::dream_complete_task,
            commands::dream_add_progress,
            commands::dream_delete,
            commands::dream_ai_plan,
            commands::dream_get_velocity,
            commands::dream_get_timeline,
            commands::dream_update_progress_manual,
            commands::dream_get_all_active_with_velocity,
            commands::dream_ai_narrate,
            // Agent Diary
            commands::diary_generate_entry,
            commands::diary_get_entries,
            commands::diary_get_all_entries,
            commands::diary_get_today,
            commands::diary_get_dashboard,
            // Current — Intelligence Briefing
            commands::current_daily_briefing,
            commands::current_detect_ripples,
            commands::current_signal_threads,
            commands::current_create_signal_thread,
            commands::current_ask,
            commands::current_get_questions,
            commands::current_cognitive_patterns,
            commands::current_synthesize,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
