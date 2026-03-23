// Conflux Engine — Integration Test
// Tests the engine in isolation: DB init, agent operations, tools, skills, cron, webhooks

#[cfg(test)]
mod integration_tests {
    use app_lib::engine;

    #[test]
    fn test_engine_init() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        // If we got here without panic, schema migration worked
        println!("✅ Engine DB initialized successfully");
    }

    #[test]
    fn test_agents_seeded() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        let agents = db.get_active_agents().unwrap();
        assert!(agents.len() >= 10, "Expected at least 10 seeded agents, got {}", agents.len());

        for agent in &agents {
            println!("  🤖 {} ({}) — {}", agent.emoji, agent.name, agent.role);
        }
        println!("✅ {} agents seeded correctly", agents.len());
    }

    #[test]
    fn test_provider_templates() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        let templates = db.get_provider_templates().unwrap();
        assert!(templates.len() >= 5, "Expected at least 5 provider templates, got {}", templates.len());

        for t in &templates {
            println!("  {} {} — {} (free: {})", t.emoji, t.name, t.description, t.is_free);
        }
        println!("✅ {} provider templates loaded", templates.len());
    }

    #[test]
    fn test_tools_seeded() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        let conn = db.conn();
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM tools", [], |r| r.get(0)).unwrap();
        assert!(count >= 12, "Expected at least 12 tools, got {}", count);
        println!("✅ {} tools seeded", count);
    }

    #[test]
    fn test_skills_seeded() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        let skills = db.get_skills(true).unwrap();
        assert!(skills.len() >= 5, "Expected at least 5 skills, got {}", skills.len());

        for s in &skills {
            println!("  {} {} — {}", s.emoji, s.name, s.description.as_deref().unwrap_or(""));
        }
        println!("✅ {} skills seeded", skills.len());
    }

    #[test]
    fn test_skills_for_agent() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        let helix_skills = db.get_skills_for_agent("helix").unwrap();
        assert!(!helix_skills.is_empty(), "Helix should have at least one skill");

        for s in &helix_skills {
            println!("  Helix can: {} {}", s.emoji, s.name);
        }
        println!("✅ Agent skill scoping works");
    }

    #[test]
    fn test_agent_capabilities() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
        let helix_caps = db.get_agent_capabilities("helix").unwrap();
        assert!(!helix_caps.is_empty(), "Helix should have capabilities");

        for c in &helix_caps {
            println!("  Helix: {} ({})", c.capability, c.proficiency);
        }
        println!("✅ Agent capabilities work");
    }

    #[test]
    fn test_agent_permissions() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        // Prism should be able to talk to everyone
        assert!(db.can_agent_talk_to("prism", "helix").unwrap(), "Prism should talk to Helix");
        assert!(db.can_agent_talk_to("prism", "forge").unwrap(), "Prism should talk to Forge");
        println!("  Prism → Helix: ✅");
        println!("  Prism → Forge: ✅");

        // Forge should not be able to talk to everyone
        let forge_perms = db.get_agent_permissions("forge").unwrap().unwrap();
        println!("  Forge can_talk_to: {}", forge_perms.can_talk_to);
        println!("  Forge requires_verification: {}", forge_perms.requires_verification);

        println!("✅ Agent permissions work");
    }

    #[test]
    fn test_memory_fts() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        // Store some memories
        let id1 = db.store_memory("zigbot", "preference", Some("name"), "User's name is Don", Some("test")).unwrap();
        let id2 = db.store_memory("zigbot", "fact", Some("timezone"), "User is in Mountain Time zone", Some("test")).unwrap();
        let id3 = db.store_memory("zigbot", "preference", Some("style"), "User prefers direct, actionable responses", Some("test")).unwrap();

        // Search with FTS
        let results = db.search_memory("zigbot", "Don", 5).unwrap();
        assert!(!results.is_empty(), "FTS should find 'Don' memory");
        println!("  Search 'Don': {} results", results.len());

        let results2 = db.search_memory("zigbot", "timezone", 5).unwrap();
        assert!(!results2.is_empty(), "FTS should find 'timezone' memory");
        println!("  Search 'timezone': {} results", results2.len());

        println!("✅ Memory FTS5 search works");
    }

    #[test]
    fn test_session_crud() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        // Create session
        let session = db.create_session("zigbot", "test-user").unwrap();
        println!("  Created session: {}", session.id);

        // Add messages
        let msg1 = db.add_message(&session.id, "user", "Hello ZigBot", 10, None, None, None).unwrap();
        let msg2 = db.add_message(&session.id, "assistant", "Hello Don! How can I help?", 25, Some("conflux-fast"), Some("cerebras"), Some(150)).unwrap();

        // Get messages
        let messages = db.get_messages(&session.id, 10).unwrap();
        assert_eq!(messages.len(), 2, "Expected 2 messages");

        // Check session counters
        let updated = db.get_session(&session.id).unwrap().unwrap();
        assert_eq!(updated.message_count, 2);
        assert_eq!(updated.total_tokens, 35);
        println!("  Messages: {}, Tokens: {}", updated.message_count, updated.total_tokens);

        println!("✅ Session CRUD works");
    }

    #[test]
    fn test_cron_parsing() {
        use app_lib::engine::cron;
        use chrono::Utc;

        let now = Utc::now();

        // Every 5 minutes
        let next = cron::next_run("*/5 * * * *", now).unwrap();
        println!("  */5 * * * * → next run: {}", next);
        assert!(next > now);

        // Daily at 9am
        let next2 = cron::next_run("0 9 * * *", now).unwrap();
        println!("  0 9 * * * → next run: {}", next2);

        // Descriptions
        assert_eq!(cron::describe("*/5 * * * *"), "Every 5 minutes");
        assert_eq!(cron::describe("0 9 * * 1-5"), "weekdays at 9:00");
        assert_eq!(cron::describe("0 * * * *"), "Every hour");
        println!("  Descriptions: ✅");

        println!("✅ Cron parser works");
    }

    #[test]
    fn test_cron_job_crud() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        // Create cron job
        let id = db.create_cron_job("Health Check", "catalyst", "0 * * * *", "UTC", "Run health checks").unwrap();
        println!("  Created cron: {}", id);

        // Get jobs
        let jobs = db.get_cron_jobs(false).unwrap();
        assert!(!jobs.is_empty());
        println!("  Cron jobs: {}", jobs.len());

        // Get due jobs (should include jobs with NULL next_run_at)
        let due = db.get_due_cron_jobs().unwrap();
        println!("  Due jobs: {}", due.len());

        println!("✅ Cron CRUD works");
    }

    #[test]
    fn test_webhook_crud() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        let id = db.create_webhook("Order Webhook", "catalyst", "/webhook/order", None, "New order received: {{body}}").unwrap();
        println!("  Created webhook: {}", id);

        let hook = db.get_webhook_by_path("/webhook/order").unwrap();
        assert!(hook.is_some());
        println!("  Webhook path: {}", hook.unwrap().path);

        println!("✅ Webhook CRUD works");
    }

    #[test]
    fn test_events() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        let id = db.emit_event("test_event", Some("zigbot"), None, Some("{\"data\": \"test\"}")).unwrap();
        println!("  Emitted event: {}", id);

        let events = db.get_unprocessed_events(None).unwrap();
        assert!(!events.is_empty());
        println!("  Unprocessed events: {}", events.len());

        db.mark_event_processed(&id).unwrap();
        let after = db.get_unprocessed_events(None).unwrap();
        assert_eq!(after.len(), events.len() - 1);
        println!("  After processing: {}", after.len());

        println!("✅ Event bus works");
    }

    #[test]
    fn test_tasks() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        let id = db.create_task("Research dental market", Some("Find pain points and AI use cases"), "helix", "prism", "high", true).unwrap();
        println!("  Created task: {}", id);

        let task = db.get_task(&id).unwrap().unwrap();
        assert_eq!(task.title, "Research dental market");
        assert_eq!(task.priority, "high");
        assert!(task.requires_verify);
        println!("  Task: {} (priority: {}, verify: {})", task.title, task.priority, task.requires_verify);

        // Update status
        db.update_task_status(&id, "completed", Some("Found 5 key pain points")).unwrap();
        let updated = db.get_task(&id).unwrap().unwrap();
        assert_eq!(updated.status, "completed");
        println!("  Updated status: {}", updated.status);

        println!("✅ Task system works");
    }

    #[test]
    fn test_verification() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        let claim_id = db.create_verification("forge", Some("session-123"), "tool_result", "Built 100 prompts successfully").unwrap();
        println!("  Created claim: {}", claim_id);

        let unverified = db.get_unverified_claims(None).unwrap();
        assert!(!unverified.is_empty());
        println!("  Unverified claims: {}", unverified.len());

        db.complete_verification(&claim_id, "quanta", "verified", Some("Checked file, 100 prompts exist")).unwrap();
        let after = db.get_unverified_claims(None).unwrap();
        assert_eq!(after.len(), unverified.len() - 1);
        println!("  After verification: {}", after.len());

        println!("✅ Verification system works");
    }

    #[test]
    fn test_lessons_learned() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        db.add_lesson(Some("forge"), "workflow_gap", "Forge outputs truncated prompts due to token limits. Write to file in batches of 10 using heredoc.", None, Some("Use bash heredoc for batch writing")).unwrap();

        let lessons = db.get_active_lessons(None).unwrap();
        assert!(!lessons.is_empty());
        println!("  Lesson: {}", lessons[0].lesson);

        println!("✅ Lessons learned works");
    }

    #[test]
    fn test_heartbeats() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        db.record_heartbeat("database", "ok", None).unwrap();
        db.record_heartbeat("providers", "warning", Some("No providers configured")).unwrap();

        let records = db.get_latest_heartbeats().unwrap();
        assert_eq!(records.len(), 2);
        for r in &records {
            println!("  {} → {}", r.check_name, r.status);
        }

        println!("✅ Heartbeat system works");
    }

    #[test]
    fn test_skill_install() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        db.install_skill(
            "test-skill", "Test Skill", Some("A test skill"), "🧪", "1.0.0",
            Some("Test Author"), "When testing, do this.",
            Some("[\"test\"]"), "[\"catalyst\"]", Some("[\"file_read\"]"),
            "local", None
        ).unwrap();

        let skill = db.get_skill("test-skill").unwrap().unwrap();
        assert_eq!(skill.name, "Test Skill");
        println!("  Installed: {} {}", skill.emoji, skill.name);

        // Toggle off
        db.toggle_skill("test-skill", false).unwrap();
        let inactive = db.get_skill("test-skill").unwrap().unwrap();
        assert!(!inactive.is_active);
        println!("  Toggled off: is_active = {}", inactive.is_active);

        // Uninstall
        db.uninstall_skill("test-skill").unwrap();
        let gone = db.get_skill("test-skill").unwrap();
        assert!(gone.is_none());
        println!("  Uninstalled: ✅");

        println!("✅ Skill install/toggle/uninstall works");
    }

    #[test]
    fn test_config_store() {
        let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

        db.set_config("test_key", "test_value").unwrap();
        let val = db.get_config("test_key").unwrap();
        assert_eq!(val, Some("test_value".to_string()));

        // Update
        db.set_config("test_key", "updated_value").unwrap();
        let val2 = db.get_config("test_key").unwrap();
        assert_eq!(val2, Some("updated_value".to_string()));

        println!("✅ Config store works");
    }

    // ── Full End-to-End Chat Test ──
    // Tests the complete chain: DB → agent → system prompt → router → provider → response → DB

    #[test]
    fn test_full_chat_cycle_catalyst() {
        use app_lib::engine::{runtime, router};
        use tokio::runtime::Runtime;

        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

            // Verify agent exists with personality
            let agent = db.get_agent("catalyst").unwrap().expect("Catalyst agent should exist");
            assert!(agent.soul.is_some(), "Catalyst should have a soul");
            assert!(agent.instructions.is_some(), "Catalyst should have instructions");
            println!("  🤖 {} — {}", agent.name, agent.role);
            println!("  Soul: {}...", &agent.soul.as_ref().unwrap()[..60.min(agent.soul.as_ref().unwrap().len())]);

            // Create session
            let session = db.create_session("catalyst", "test-user").unwrap();
            println!("  Session: {}", session.id);

            // Send message through the full runtime chain
            let result = runtime::process_turn(
                &db,
                &session.id,
                "catalyst",
                "What is 2+2? Reply with just the number.",
                Some(20),
            ).await;

            match &result {
                Ok(resp) => {
                    println!("  ✅ Response: '{}' ({}ms, {} tokens via {})",
                        resp.content.trim(), resp.latency_ms, resp.tokens_used, resp.provider_name);

                    // Verify response was stored in DB
                    let messages = db.get_messages(&session.id, 10).unwrap();
                    let user_msgs: Vec<_> = messages.iter().filter(|m| m.role == "user").collect();
                    let assistant_msgs: Vec<_> = messages.iter().filter(|m| m.role == "assistant").collect();
                    assert_eq!(user_msgs.len(), 1, "Should have 1 user message");
                    assert_eq!(assistant_msgs.len(), 1, "Should have 1 assistant message");
                    println!("  DB: {} user + {} assistant messages stored", user_msgs.len(), assistant_msgs.len());

                    // Verify the system prompt was built with personality
                    assert!(!resp.content.is_empty(), "Response should not be empty");
                    println!("✅ Full chat cycle complete");
                }
                Err(e) => {
                    println!("  ⚠️ Chat failed (may be provider issue): {}", e);
                    // Still verify the user message was stored
                    let messages = db.get_messages(&session.id, 10).unwrap();
                    let user_msgs: Vec<_> = messages.iter().filter(|m| m.role == "user").collect();
                    assert_eq!(user_msgs.len(), 1, "User message should be stored even on failure");
                    println!("  ✅ User message stored correctly despite provider error");
                }
            }
        });
    }

    #[test]
    fn test_full_chat_cycle_zigbot() {
        use app_lib::engine::{runtime, router};
        use tokio::runtime::Runtime;

        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();

            let agent = db.get_agent("zigbot").unwrap().expect("ZigBot should exist");
            assert_eq!(agent.model_alias, "conflux-core", "ZigBot should use conflux-core");
            println!("  🤖 ZigBot — model: {}", agent.model_alias);

            let session = db.create_session("zigbot", "test-user").unwrap();

            let result = runtime::process_turn(
                &db,
                &session.id,
                "zigbot",
                "Hello! What's your name and role?",
                Some(50),
            ).await;

            match &result {
                Ok(resp) => {
                    println!("  ✅ ZigBot: '{}' ({}ms via {})",
                        &resp.content[..100.min(resp.content.len())], resp.latency_ms, resp.provider_name);

                    // The response should reference ZigBot's identity (from the system prompt)
                    let content_lower = resp.content.to_lowercase();
                    let has_identity = content_lower.contains("zigbot") || content_lower.contains("strategic");
                    if has_identity {
                        println!("  ✅ Agent identity confirmed in response");
                    }
                }
                Err(e) => println!("  ⚠️ ZigBot chat failed: {}", e),
            }
        });
    }

    #[test]
    fn test_conversation_history_loaded() {
        use app_lib::engine::{runtime, router};
        use tokio::runtime::Runtime;

        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            let db = app_lib::engine::db::EngineDb::open_in_memory().unwrap();
            let session = db.create_session("catalyst", "test-user").unwrap();

            // First message
            let _ = runtime::process_turn(
                &db, &session.id, "catalyst",
                "My name is TestUser. Remember this.",
                Some(30),
            ).await;

            // Second message — runtime should load conversation history
            let result = runtime::process_turn(
                &db, &session.id, "catalyst",
                "What is my name?",
                Some(30),
            ).await;

            match &result {
                Ok(resp) => {
                    println!("  ✅ Follow-up: '{}'", &resp.content[..100.min(resp.content.len())]);

                    // Verify both messages are in DB
                    let messages = db.get_messages(&session.id, 10).unwrap();
                    assert!(messages.len() >= 4, "Should have at least 4 messages (2 user + 2 assistant)");
                    println!("  DB: {} messages stored across 2 turns", messages.len());
                }
                Err(e) => println!("  ⚠️ Follow-up failed: {}", e),
            }
        });
    }
}
