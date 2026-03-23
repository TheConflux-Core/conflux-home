# Conflux Home — Frontend Build Spec
## The Windows/AOL Play: Convenience as Moat

**Date:** 2026-03-22 9:15 PM MST  
**Philosophy:** Every click eliminated is a user retained. The app should feel alive, not functional. Interactive > static. Animated > flat.

---

## PART 1: ONBOARDING WIZARD REDESIGN

### Current State
5 steps exist: Welcome → Connection (auto-confirmed) → Goals → Team → Alive. Functionally solid but feels like a form. Needs to feel like a **journey**, not a questionnaire.

### New Flow (5 Steps + Provider Setup)

#### Step 0: Welcome (The First Impression)
**Goal:** Emotional hook. "Your AI family is about to come alive."

- Full-screen cinematic entrance — logo fades in, particles drift upward like sparks
- Name input with typewriter placeholder: "What should your team call you?"
- **Interactive:** As they type their name, faint agent silhouettes appear in the background like shadows waking up
- "Get Started" button has a subtle glow pulse

#### Step 1: Provider Setup (The "Just Works" Moment)
**Goal:** Zero-friction connection. This is the AOL moment.

- **Two paths, one screen:**
  - **Free Tier (Default, Recommended):** One click — "Start Free (50 calls/day)". Pre-configured Cerebras/Groq/Mistral/Cloudflare keys. Green checkmark animation on connect. This is the primary path.
  - **BYOK (Advanced):** Collapsible "I have my own API keys" section. Provider template cards (OpenAI, Anthropic, Gemini, Ollama). Paste key → validated → connected.
- **Interactive:** After connecting, a brief "agent ping" animation — each selected agent icon blinks in sequence like they're waking up and saying hello
- Skip button for power users who'll configure later

#### Step 2: Goals (The Personality Quiz Feel)
**Goal:** Make users feel like they're customizing, not configuring.

- Cards animate in with staggered timing (card 1: 0ms, card 2: 80ms, card 3: 160ms...)
- **Interactive:** Hovering a card makes the emoji float up with a gentle bounce
- Selected cards get a colored border glow that matches the goal's "personality color"
- Subtle background gradient shifts based on selections (business = blue tones, creative = purple, etc.)
- Select 2-3, with a satisfying "click" animation on selection

#### Step 3: Team (The "Meet Your Agents" Experience)
**Goal:** Feel like assembling a team, not toggling switches.

- Agent cards appear one at a time with a "step forward" animation — like they're walking up to introduce themselves
- Each card shows: avatar (animated breathing), name, role, one-line personality quip
- Toggle is a physical-style switch with haptic-like visual feedback (knob overshoots slightly, settles)
- **Interactive:** Agent avatars "react" when toggled on — a quick sparkle or status change animation
- Minimum 1 agent enforced, with a gentle shake if they try to deselect the last one

#### Step 4: Alive (The Payoff)
**Goal:** Emotional climax. "They're yours now."

- **Phase 1 (Loading, 2s):** 
  - Dark screen, agents appear as faint outlines
  - Each agent "boots up" with a scan-line animation (top to bottom)
  - Status changes: offline → idle → working (briefly) → idle
  - Central orb pulses — "Syncing neural pathways..."
- **Phase 2 (Ready):**
  - Screen brightens, agents are fully visible with status indicators
  - Confetti burst or particle celebration
  - "Your team is ready!" with agent count
  - "Enter Conflux Home" button slides up with a spring animation

### Technical Notes
- All animations via CSS keyframes + requestAnimationFrame (no framer-motion dependency)
- Step transitions: horizontal slide with parallax depth (content moves faster than background)
- Progress bar: dots → active dot is wider, filled dots are accent color
- Mobile: stack vertically, single column cards

---

## PART 2: SETTINGS — NEW FEATURE PANELS

These are the engine features that have backend code but no frontend UI. Each panel goes into Settings.tsx.

### Panel 1: Cron Manager 🕐
**What it does:** View/edit/delete cron jobs from the engine's 5-field cron scheduler.

**UI Design:**
- Section title: "🕐 Scheduled Tasks"
- **Job List:** Cards showing:
  - Cron expression (human-readable: "Every day at 5:00 AM")
  - Agent assigned (with avatar)
  - Status badge (active/paused/error)
  - Last run / Next run timestamps
  - Toggle to enable/disable
- **Add Job Flow:** Modal with:
  - Agent selector dropdown
  - Schedule picker (visual: "Every [X] [minutes/hours/days] at [time]" OR raw cron input for power users)
  - Task description textarea
  - "Create" button
- **Interactive:** 
  - Job cards have a subtle "breathing" border when active
  - Next run countdown timer (live updating)
  - Job history expandable (collapsible run log below each card)
  - Drag-to-reorder priority

**Tauri Commands to wire:** `cron_list`, `cron_create`, `cron_update`, `cron_delete`, `cron_history`

### Panel 2: Webhook Manager 🔗
**What it does:** Register webhook endpoints for external integrations.

**UI Design:**
- Section title: "🔗 Webhooks"
- **Endpoint List:** Cards showing:
  - URL (truncated, click to copy)
  - Auth type badge (hmac/bearer/none)
  - Status (active/disabled)
  - Last triggered timestamp
  - Registered events count
- **Add Webhook Flow:** Modal with:
  - URL input with validation
  - Auth type selector (HMAC secret auto-generated, Bearer token input, None)
  - Event type checkboxes (task_completed, agent_error, cron_fired, etc.)
  - "Register" button
- **Interactive:**
  - Test button → fires a test event → shows response in a toast
  - Copy URL/auth secret with one click
  - Webhook health indicator (green/yellow/red based on last response)

**Tauri Commands to wire:** `webhook_register`, `webhook_list`, `webhook_update`, `webhook_delete`, `webhook_test`

### Panel 3: Skills Browser 🧩
**What it does:** Browse, install, toggle, and uninstall agent skills.

**UI Design:**
- Section title: "🧩 Skills"
- **Installed Skills:** Grid of cards showing:
  - Skill name + icon
  - Description (2 lines, expandable)
  - Assigned agents (avatar chips)
  - Toggle switch (enable/disable)
  - Uninstall button (with confirmation)
- **Available Skills:** "Browse Skills" button opens a modal/grid showing:
  - Skill name, description, author
  - Install count / rating (if marketplace data exists)
  - "Install" button → assigns to agents → confirms
- **Interactive:**
  - Skill cards flip on hover to show back side with full description + dependencies
  - Agent assignment is drag-and-drop (drag agent avatar onto skill card)
  - Skills that are "subordinate to anti-hallucination rules" show a 🛡️ badge

**Tauri Commands to wire:** `skill_list`, `skill_install`, `skill_toggle`, `skill_uninstall`

### Panel 4: Task View 📋
**What it does:** Create, assign, track, and verify tasks with priority levels.

**UI Design:**
- Section title: "📋 Tasks"
- **Kanban Board** with 4 columns: Pending → In Progress → Review → Done
- **Task Cards:** Draggable between columns:
  - Title, priority badge (🔴 Critical, 🟡 High, 🟢 Normal, 🔵 Low)
  - Assigned agent (avatar)
  - Created timestamp
  - Verification status (if applicable)
- **Add Task Flow:** Floating "+" button → Quick-add modal:
  - Title input
  - Priority selector (4 options)
  - Agent assignment dropdown
  - Description (optional)
  - "Create" button
- **Interactive:**
  - Drag-and-drop between columns (HTML5 drag API or pointer events)
  - Cards animate smoothly on column change
  - Priority badge pulses gently for Critical tasks
  - Column headers show task count with live updates
  - Completed tasks get a checkmark animation + subtle fade

**Tauri Commands to wire:** `task_create`, `task_list`, `task_update`, `task_verify`, `task_delete`

### Panel 5: Notification Settings 🔔
**What it does:** Configure desktop/mobile notification preferences.

**UI Design:**
- Section title: "🔔 Notifications"
- **Global Toggle:** Master on/off switch
- **Event Toggles:** Per-event type:
  - Task completed ✅
  - Agent error ⚠️
  - Cron fired ⏰
  - Webhook received 🔗
  - Agent needs attention 🚨
  - Each with: toggle switch + sound selector dropdown
- **Quiet Hours:** Time range picker (start time → end time)
  - Visual: 24-hour clock arc showing quiet period
- **Interactive:**
  - "Test Notification" button → fires a system notification via Tauri
  - Sound preview on hover (if sound selector is available)
  - Quiet hours arc is draggable (grab handles to adjust)

**Tauri Commands to wire:** `notify_config_get`, `notify_config_update`, `notify_test`

### Panel 6: Email Settings 📧
**What it does:** Configure SMTP email for agent-sent emails.

**UI Design:**
- Section title: "📧 Email"
- **Connection Form:**
  - SMTP Host input
  - Port input (default 587)
  - Username input
  - Password input (masked)
  - From Address input
  - TLS toggle
  - "Test Connection" button → sends test email → shows result
- **Status:** Connected/Disconnected badge
- **Sent Log:** Recent emails table:
  - To, Subject, Timestamp, Status (sent/failed)
- **Interactive:**
  - Connection test shows a loading spinner → success/failure animation
  - Password field has show/hide toggle
  - "Send Test Email" fires actual email, shows result in toast

**Tauri Commands to wire:** `email_config_get`, `email_config_update`, `email_test`, `email_send`

---

## PART 3: NAVIGATION & LAYOUT UPDATES

### Taskbar Expansion
Current: Dashboard, Chat, Market, Settings

Add:
- **📋 Tasks** — direct access to the task board
- **🕐 Cron** — jump to scheduled tasks (or make this accessible from Settings only)

Actually, keep Taskbar clean (4 items max for mobile). New features are accessible via:
- Settings page (all 6 new panels)
- Dashboard quick-action cards (Tasks, Cron — the two most interactive ones)

### Dashboard Enhancements
Replace hardcoded stats with **live data**:
- "Missions Completed" → read from `missions/` directory
- "Products Built" → read from `portfolio.json`
- "Active Tasks" → from `task_list`
- "Next Cron Run" → from `cron_list` (nearest next_run)

Add **Quick Action Cards** to Dashboard:
- "📋 View Tasks" → navigates to Settings Tasks panel
- "🕐 Scheduled Jobs" → navigates to Settings Cron panel
- "🧩 Browse Skills" → opens Skills modal
- "🔔 Notifications" → navigates to Settings Notifications panel

### Settings Page Reorganization
Current order: Gateway → Providers → Google → Appearance → Agents → Agent Editor → Data → About

New order with sections:
1. **⚡ Connection** (Gateway + Providers + Google)
2. **🎨 Experience** (Appearance + Agents + Agent Editor)
3. **🔧 Engine** (Cron + Webhooks + Skills + Tasks + Notifications + Email) ← NEW
4. **🔒 Data** (Data & Privacy + About)

---

## PART 4: TAILWIND/CSS CONVENTIONS

### Animation Library (Custom, No Dependencies)
All animations as CSS keyframes in a shared `animations.css`:

```css
/* Entrance animations */
@keyframes slide-up-spring { ... }
@keyframes fade-in-stagger { ... }
@keyframes scale-in-bounce { ... }

/* Status animations */
@keyframes breathe { ... }          /* gentle border glow */
@keyframes pulse-dot { ... }        /* status indicator */
@keyframes scan-line { ... }        /* agent boot-up */

/* Interaction animations */
@keyframes shake { ... }            /* validation error */
@keyframes checkmark-draw { ... }   /* SVG checkmark */
@keyframes confetti { ... }         /* celebration */

/* Utility classes */
.animate-slide-up { animation: slide-up-spring 0.5s ease-out; }
.animate-fade-in { animation: fade-in-stagger 0.3s ease-out; }
.animate-breathe { animation: breathe 3s ease-in-out infinite; }
.animate-shake { animation: shake 0.4s ease-in-out; }
```

### Component Patterns
- **Cards:** `bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] p-4 hover:border-[var(--accent-primary)] transition-all duration-150`
- **Toggles:** Custom CSS toggle switches (already have `.toggle-switch` class)
- **Modals:** Centered overlay with backdrop blur, spring entrance animation
- **Badges:** Inline `span` with colored background matching status

---

## PART 5: BUILD ORDER

### Sprint 1: Onboarding + Provider Setup (Priority)
**Files to modify:**
- `src/components/Onboarding.tsx` — redesign all steps, add provider setup step
- `src/App.tsx` — update flow gates if needed
- New: `src/components/onboarding/ProviderStep.tsx`
- New: `src/styles/animations.css`

### Sprint 2: Task View + Cron Manager
**Files to modify:**
- `src/components/Settings.tsx` — add new sections
- New: `src/components/settings/CronManager.tsx`
- New: `src/components/settings/TaskView.tsx`
- New: `src/hooks/useCron.ts`
- New: `src/hooks/useTasks.ts`

### Sprint 3: Skills + Webhooks
**Files to modify:**
- `src/components/Settings.tsx` — add sections
- New: `src/components/settings/SkillsBrowser.tsx`
- New: `src/components/settings/WebhookManager.tsx`
- New: `src/hooks/useSkills.ts`
- New: `src/hooks/useWebhooks.ts`

### Sprint 4: Notifications + Email + Dashboard Polish
**Files to modify:**
- `src/components/Settings.tsx` — final sections
- `src/components/Desktop.tsx` — live stats + quick actions
- New: `src/components/settings/NotificationSettings.tsx`
- New: `src/components/settings/EmailSettings.tsx`
- New: `src/hooks/useNotifications.ts`
- New: `src/hooks/useEmail.ts`

---

## PART 6: TAURI COMMANDS REFERENCE

### Existing (57 commands) — see `src-tauri/src/commands.rs`

### VERIFIED COMMANDS (All registered in lib.rs)

| Command | Purpose | Status |
|---------|---------|--------|
| `engine_create_cron` | Create a new cron job | ✅ Registered |
| `engine_get_crons` | List all cron jobs | ✅ Registered |
| `engine_toggle_cron` | Enable/disable a cron job | ✅ Registered |
| `engine_delete_cron` | Delete a cron job | ✅ Registered |
| `engine_tick_cron` | Trigger cron check | ✅ Registered |
| `engine_create_webhook` | Register new webhook | ✅ Registered |
| `engine_get_webhooks` | List webhooks | ✅ Registered |
| `engine_delete_webhook` | Remove webhook | ✅ Registered |
| `engine_handle_webhook` | Fire webhook event | ✅ Registered |
| `engine_get_skills` | List available skills | ✅ Registered |
| `engine_get_skill` | Get single skill | ✅ Registered |
| `engine_get_skills_for_agent` | Skills assigned to agent | ✅ Registered |
| `engine_install_skill` | Install a skill | ✅ Registered |
| `engine_toggle_skill` | Enable/disable a skill | ✅ Registered |
| `engine_uninstall_skill` | Remove a skill | ✅ Registered |
| `engine_create_task` | Create a new task | ✅ Registered |
| `engine_update_task` | Update task status | ✅ Registered |
| `engine_get_task` | Get single task | ✅ Registered |
| `engine_get_tasks_for_agent` | Tasks for an agent | ✅ Registered |
| `engine_create_verification` | Create verification claim | ✅ Registered |
| `engine_complete_verification` | Complete verification | ✅ Registered |
| `engine_send_notification` | Send notification | ✅ Registered |
| `engine_set_email_config` | Configure SMTP | ✅ Registered |
| `engine_get_email_config` | Get SMTP config | ✅ Registered |
| `engine_run_health_checks` | Run health checks | ✅ Registered |
| `engine_get_heartbeats` | Get heartbeat status | ✅ Registered |
| `engine_get_events` | Get event bus events | ✅ Registered |
| `engine_add_lesson` | Add lesson learned | ✅ Registered |
| `engine_get_lessons` | Get lessons | ✅ Registered |
| `engine_get_agents` | List all agents | ✅ Registered |
| `engine_get_quota` | Get API quota | ✅ Registered |
| `engine_health` | Overall health | ✅ Registered |

### Invoke Pattern (from useEngineChat.ts)
```typescript
import { invoke } from '@tauri-apps/api/core';

// List crons
const crons = await invoke<any[]>('engine_get_crons', { enabledOnly: null });

// Create task
const taskId = await invoke<string>('engine_create_task', { req: { ... } });

// Toggle cron
await invoke('engine_toggle_cron', { id: 'xxx', enabled: true });
```

---

## DESIGN PRINCIPLES (Non-Negotiable)

1. **Every panel feels alive** — breathing borders, staggered animations, live counters
2. **No dead ends** — every empty state has a CTA ("No tasks yet → Create your first task")
3. **One-click actions** — toggle, copy, test. No multi-step where one will do
4. **Consistent card pattern** — every list uses the same card component
5. **Dark mode native** — build for dark first, light is the variant
6. **Mobile-first** — single column, touch-friendly targets (44px min)
7. **Feedback is instant** — click → visual response in <100ms, even if backend takes longer

---

*Spec by ZigBot. Let's build the future.*
