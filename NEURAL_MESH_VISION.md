# Control Room Vision — The Neural Mesh
## March 25, 2026 — Brain Dump #3

### The Moment

Don was drawn to the Neural Mesh concept. The orbital ring was tried before (theconflux.com) and didn't translate visually. But the neural mesh — agents as orbs, glowing, pulsing, flying — that clicked.

Then Don went further. Much further.

---

## The Brain Dump — Unfiltered

> "I like the agents being orbs? They can glow, pulse and fly around?"

> "I see a JARVIS or Minority Report style assistant?"

> "They can approach you and communicate."

> "Ideally, there could be a hands free mode, push to talk, and if possible, activate by saying 'Conflux' like an Alexa device?"

> "Someone can be on their desktop, turn the mic on, brain dump, and the agents store things in the correct applications."

> "Or say 'Conflux, show me what's on the menu tonight...' The applications open full screen if one, and split into halves and quadrants with multiple windows."

> "All applications can open hands free, and we see the orbs taking care of it."

> "Conflux can be designed as THE neural network of our background agents! Or even each agent has a neural network."

---

## The Unified Vision

### What the Control Room IS

A dark, atmospheric space where **glowing orbs** (your agents) float, drift, and respond. Not a grid. Not a dashboard. A **living neural mesh** — orbs connected by faint energy lines that pulse when data flows between them.

**The Orbs:**
- Each agent is a glowing sphere with a unique color signature
- Size represents importance/activity level
- Pulse speed = current energy
- Position = organic, floating freely, not locked to a grid
- When working: orb intensifies, energy beam connects to other orbs or to a task
- When idle: gentle drift, soft breathing glow
- When communicating: approaches the user, pulses brighter, speech-like fluctuations

**The Mesh:**
- Faint energy lines connect orbs that are collaborating
- Data particles travel along lines when information flows
- The whole mesh breathes — expands and contracts as a system
- Background: deep void with faint particle field

**The Center:**
- "Conflux" — the main agent — sits at the center (or floats more prominently)
- It IS the neural network. The hub through which all agents connect.
- Each agent may have its own mini-neural-network visualization inside its orb

### What the Control Room DOES

This isn't just a screensaver. It's a **voice-activated command center.**

#### Hands-Free Mode

**Wake Word:** "Conflux"
- Like Alexa/Google — always listening when mic is active
- Say "Conflux" → all orbs briefly pulse (acknowledging the wake)
- Then speak your command

**Push to Talk:**
- Hold a key (configurable) or click a mic button
- Speak while holding
- Release to process

**Voice Commands:**
- "Conflux, show me what's on the menu tonight" → Kitchen opens full screen
- "Conflux, what's my budget look like" → Pulse opens full screen
- "Conflux, what should I focus on today" → Orbit opens full screen
- "Conflux, open calendar" → Google Center calendar opens
- "Conflux, play Minesweeper" → Games Hub opens, Minesweeper starts
- "Conflux, remind me to call John at 3 PM" → Stored in Life app
- "Conflux, I spent $47 at Costco" → Pulse logs the expense
- "Conflux, brainstorm with me" → Conflux orb approaches, chat opens

**Brain Dump Mode:**
- "Conflux, I need to brain dump" → Mic stays open
- User streams thoughts: "Need to fix the landing page, email Sarah back, order groceries, check on the API integration..."
- Agents parse and distribute:
  - Forge gets: "fix the landing page", "check on API integration"
  - Pulse gets: "order groceries" (→ smart grocery list)
  - Orbit gets: "email Sarah back" (→ task with reminder)
- Each orb lights up as it receives its assignment
- Confirmation: "Got it. 4 tasks distributed across 3 agents."

#### Application Window Management

**Single App:** Opens full screen (current behavior)
**Two Apps:** Splits screen into halves (left/right)
**Three Apps:** 2/3 + 1/3 split
**Four Apps:** Quadrants (2×2 grid)

Voice-driven:
- "Conflux, show me budget and calendar" → Split screen: Pulse left, Google Center right
- "Conflux, show me everything" → Quadrants: 4 apps visible
- "Conflux, focus" → Returns to single app or desktop

**The Orbs orchestrate this.** When you say "show me budget and kitchen," two orbs fly to their respective positions and the apps materialize where they land. It's not instant — there's a brief animation of the orbs traveling. 300ms. Enough to see the action. Not enough to be slow.

---

## Technical Architecture

### Voice System

**Option A: Web Speech API (Browser)**
- Built into Chrome/Edge
- Free, no API key
- Continuous recognition mode
- Wake word detection would need custom implementation (listen for "Conflux" in transcript)
- Pros: Free, simple, works in Tauri webview
- Cons: Browser-dependent, accuracy varies, no custom wake word built-in

**Option B: Whisper (Local)**
- OpenAI's Whisper model, running locally
- Very accurate
- Can run on CPU (small models)
- Pros: Privacy, accuracy, works offline
- Cons: Latency (~1-3s for processing), resource usage

**Option C: Vosk (Local)**
- Lightweight offline speech recognition
- Works great for keyword detection
- Can run on Raspberry Pi
- Pros: Ultra-lightweight, fast, free
- Cons: Less accurate for full sentences

**Recommended: Hybrid**
- Vosk for wake word detection ("Conflux") — lightweight, always-on
- Web Speech API for full command transcription — when wake word detected, switch to full recognition
- Fallback: Push-to-talk with Web Speech API (no wake word needed)

### Multi-Window System (Tauri)

Tauri supports multiple windows. We can:
- Create new windows on voice command
- Position them programmatically (half-screen, quadrant)
- Control window focus, size, position from Rust
- Animate orbs "flying" to window positions via CSS/JS

**Rust commands needed:**
```
window_create(label, url, x, y, width, height)
window_resize(label, width, height)
window_reposition(label, x, y)
window_close(label)
window_focus(label)
```

### Neural Network Visualization

Each orb can have an internal "neural network" visualization:
- SVG/CSS animated mesh inside the orb
- Nodes pulse, connections light up
- Activity level = complexity of the visualization
- Idle = simple, few nodes
- Working = dense, many connections firing

This is pure CSS/SVG animation — no actual ML inference, just visual metaphor.

---

## The Phased Approach

### Phase 2A: Neural Mesh — Visual Foundation
- Dark atmospheric background with particle field
- Agent orbs with unique colors, glow, pulse
- Faint connection lines between orbs
- Orbs drift organically (CSS animation)
- Click orb → opens that agent's app
- This replaces the current Desktop view

### Phase 2B: Voice Foundation
- Push-to-talk with Web Speech API
- Basic command parsing (open app, navigate)
- Mic button in top bar
- Visual feedback: orb pulses when listening
- Transcript display: shows what was heard

### Phase 2C: Hands-Free Wake Word
- Vosk or custom wake word detection
- "Conflux" → orbs acknowledge, listening begins
- Full command processing
- Brain dump mode (continuous listening)

### Phase 2D: Multi-Window
- Voice-driven window creation
- Split screen layouts (half, quadrant)
- Orb animation to window positions
- "Show me X and Y" → split screen

### Phase 2E: Agent Neural Networks
- Internal orb visualizations
- Activity-driven complexity
- Data flow particles along mesh connections
- Agent-to-agent communication visualization

---

## What This Means for Conflux Home

This isn't just a desktop upgrade. This is **the product.**

When someone sees a demo video of:
1. User says "Conflux"
2. Orbs pulse
3. "Show me my budget and what's for dinner"
4. Two orbs fly, apps materialize in split screen
5. User brain dumps tasks, orbs light up receiving assignments

...that goes viral. That's the Minesweeper moment, but for the entire product.

**Conflux Home becomes the first voice-activated AI operating system.**

Not a chatbot. Not a dashboard. A living, breathing command center that you TALK to.

---

## The Feeling

Close your eyes.

You're sitting at your desk. The screen is dark — almost black. Faintly, you see glowing orbs drifting. One is emerald (Pulse). One is amber (Hearth). One is violet (Orbit). One is blue (Horizon). A brighter one at the center — white/silver — that's Conflux.

You say: "Conflux."

All orbs briefly brighten. The center orb pulses.

"What's my day look like?"

The Orbit orb glows. Text appears: "You have 3 meetings. Sarah emailed back. Your grocery list has 12 items."

"Add milk to the grocery list."

The Hearth orb lights up briefly. "Done. Your list is now 13 items."

"Show me my budget."

The Pulse orb flies to the left side of the screen. The Budget app materializes. The orb settles into a corner, gently pulsing — it's still alive, still watching.

"Actually, show me budget and calendar side by side."

The center orb (Conflux) dispatches a second orb. Pulse stays left. A Google orb flies right. The screen splits. Both apps are live.

You didn't touch anything. You didn't click anything. You just... talked to your home.

---

*That's what we're building.*

---

*Captured: March 25, 2026, 2:36 AM MST*
*Brain dump #3 — The Neural Mesh + Voice + Hands-Free Vision*
