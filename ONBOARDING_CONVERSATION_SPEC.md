# Conflux Home — Onboarding Conversation Spec
## "Meet Your Team" — The Most Important 90 Seconds

**Date:** 2026-03-22 11:40 PM MST  
**Philosophy:** Every other app asks you to fill out forms. We have a conversation. The difference is everything.

---

## THE CORE INSIGHT

Onboarding isn't setup. It's the first relationship the user has with their AI family.

A form says: "Tell us about yourself."
A conversation says: "Hey, I'm ZigBot. What are you working on?"

The form gets compliance. The conversation gets trust.

---

## CURRENT FLOW (5 Steps)
0. Welcome → Name input
1. Heartbeat → "Your team is waking up"
2. Goals → Pick 2-3 cards (business, learning, work, creative, life)
3. Team → Toggle agents on/off
4. Alive → Boot-up animation → Enter

## PROPOSED FLOW (6 Steps, Reimagined)

0. **Welcome** — "What's your name?" (keep as-is, it's great)
1. **Heartbeat** — Team wakes up (keep as-is, perfect)
2. **Conversation** — NEW. Replaces Goals cards.
3. **Team Preview** — Show recommended team based on conversation. Keep toggle but make it feel like "Here's who chose you" not "pick your agents"
4. **Alive** — Enhanced with personalized message
5. **Voice Demo** — NEW. Optional TTS moment. "Welcome home, Don."

---

## STEP 2: THE CONVERSATION

### Design: Chat Interface, Not Form

The user sees a chat bubble appear from ZigBot:

> 👋 Hey! I'm ZigBot. I'll be your strategic partner.
> 
> I want to understand what you're working on so I can put together the right team for you.
> 
> Tell me a bit about what you're trying to do. Don't overthink it — just talk to me like you'd talk to a friend.

User types a freeform response. Examples:
- "I run a small marketing agency and I'm trying to scale without hiring"
- "I'm a developer building side projects, need help with research and content"
- "Honestly I just want to see what AI can do"

### After User Responds

ZigBot responds with insight + agent recommendation:

> Got it. You're running a marketing agency and want to scale. That's a growth problem — and a perfect fit for a few of my teammates.
> 
> I'm thinking:
> - **Helix** 🔬 — she'll dig into your market and find what your competitors are missing
> - **Pulse** 📣 — he handles all the marketing and launch strategy stuff
> - **Forge** 🔨 — he builds. Landing pages, content, automation. Fast.
> 
> And obviously me. I'm not going anywhere.
> 
> Want to tell me more, or should I introduce you to the team?

### The Magic: It Feels Like Advice, Not Data Collection

The user doesn't realize they just populated:
- `USER.md` → their name, role, goals
- Recommended agents → based on their words, not card clicks
- Tone/context → for all future interactions

### Second Message (Optional Deepener)

If user engages (types more):

> Nice. What's the hardest part about what you're doing right now? 
> 
> (This helps me understand where to focus first.)

User responds:
- "Finding clients" → Pulse + Helix get flagged for lead gen
- "Too much to do, not enough time" → Spectra + Forge get flagged for automation
- "I don't know what I don't know" → Helix + Vector get flagged for strategy

If user is brief or wants to skip:

> No worries, I've got enough to work with. Let me show you your team.

### What Gets Populated Silently

```json
{
  "user_name": "Don",
  "user_role": "runs a marketing agency",
  "user_goal": "scale without hiring",
  "user_pain_point": "not specified",
  "recommended_agents": ["zigbot", "helix", "pulse", "forge"],
  "conversation_context": "User runs a marketing agency, focused on growth and scaling."
}
```

This writes to:
- `localStorage` → `conflux-user-profile`
- Engine memory → `engine_store_memory` (first API call, doesn't count against quota)

### API Call Details
- The conversation IS the first engine call
- Uses `engine_chat` with a system prompt that's specifically for onboarding
- System prompt: "You are ZigBot during onboarding. Ask 1-2 questions to understand the user's role and goals. After they respond, recommend 3-4 agents with one-line descriptions. Be warm, direct, and slightly playful. Never use corporate language."
- This call is FREE — doesn't count against quota (engine-side flag)
- The response also extracts structured data (name, role, goals) and stores it

---

## STEP 3: TEAM PREVIEW (Replaces Current Goals + Team Steps)

Based on the conversation, show the recommended team. But frame it differently:

> Based on our chat, here's your team:
> 
> [Agent cards with personality one-liners]
> 
> These agents chose you based on what you told me. You can swap anyone in or out, but I'd trust the team.

### Agent Personality Intros (One-Liners)

Instead of "Strategic Partner — Guides your strategy" (boring), use:

- **ZigBot:** "I'm the one you come to when you need to think. Or when it's 2 AM and you have a crazy idea."
- **Helix:** "I find things other people miss. Market signals, competitor moves, hidden opportunities."
- **Forge:** "You describe it, I build it. Landing pages, content, code. I don't do slow."
- **Vector:** "I'm the reality check. I'll tell you if your idea is gold or garbage."
- **Pulse:** "I get your stuff in front of the right people. Marketing, launches, growth."
- **Quanta:** "I check everything twice. Nothing ships without my sign-off."
- **Prism:** "I keep the team organized. When 10 things need to happen at once, I'm your person."
- **Spectra:** "I break big scary goals into small doable steps."
- **Luma:** "I press the buttons. Launches, deployments, going live. That's me."
- **Catalyst:** "I'm the early warning system. If something's about to break, I'll let you know."

### Toggle Behavior
- Recommended agents are ON by default
- User can toggle any agent on/off
- Minimum 1 agent
- Toggle animation: agent "steps forward" when enabled, "steps back" when disabled
- The toggle feels like inviting someone to join, not configuring software

---

## STEP 4: ALIVE (Enhanced)

Current: "Your team is coming alive..." with generic animation.

Enhanced with personalization:

> Don, your team is coming alive...
> 
> [Scan-line boot sequence, same as now]
> 
> ZigBot: "Hey Don. I've been waiting for this."
> Helix: "Ready to dig in."
> Forge: "Let's build something."

Each agent gets a personalized first message based on the conversation context. This is the moment that makes people say "holy shit."

### Agent First Messages (Generated, Not Hardcoded)

After the boot sequence, show 2-3 agent "first words" — short, personality-driven messages that reference what the user told us during the conversation.

Generated via engine_chat with prompt: "You are [AgentName]. The user just told us: [conversation_context]. Say one short sentence to introduce yourself that's relevant to their goals. Be warm, direct, slightly playful. No corporate language."

These are generated DURING the boot animation (async), so they feel spontaneous.

If the API call fails (offline, rate limit, etc.), fall back to hardcoded personality intros from the list above.

---

## STEP 5: VOICE DEMO (NEW, Optional)

After the Alive sequence, one final moment:

> 🎵 [TTS plays: "Welcome home, Don. Your team is ready."]

This is a SIMULATED TTS moment — pre-generated audio or browser Speech Synthesis API. Doesn't require a paid plan. It's a demo of what's possible.

If browser TTS is available:
- Use `window.speechSynthesis` with a warm voice
- "Welcome home, [name]. Your team is ready."

If not available (some browsers block it):
- Skip gracefully, no error
- Show a static message: "🔊 Your team has voices. Upgrade to hear them speak."

### The "Upgrade" Hook

The voice demo plants the seed:
- Free: Text-based agents
- Paid: Voice conversations, TTS responses, STT input
- Premium: Custom voices, always-on voice assistant

But it's never pushy. It's a teaser, not an ad.

---

## TECHNICAL ARCHITECTURE

### Engine Integration

The conversation step needs to call the engine. Two approaches:

**Option A: Call engine_chat directly**
- First message: system prompt for onboarding
- Subsequent messages: continue conversation
- Extract structured data from final response
- Pro: Real AI conversation
- Con: Needs engine running, first call latency

**Option B: Simulated conversation**
- Pre-written ZigBot messages based on keyword matching
- User freeform input → keyword extraction → response template
- Pro: Works offline, instant, no API cost
- Con: Less magical, can feel canned

**Recommendation: Option A with Option B fallback**
- Try engine_chat first
- If fails (offline, no engine, rate limit), fall back to simulated
- User never sees the difference

### Data Extraction

After conversation, extract:
```typescript
interface UserProfile {
  name: string;           // from Step 0
  role: string;           // "marketing agency owner", "developer", etc.
  goals: string[];        // ["scale business", "automate tasks"]
  painPoints: string[];   // ["finding clients", "too much to do"]
  conversationSummary: string;  // 1-2 sentence summary
  recommendedAgents: string[];  // agent IDs
  tone: 'casual' | 'professional' | 'technical';  // inferred from writing style
}
```

This gets:
1. Saved to `localStorage` → `conflux-user-profile`
2. Sent to `engine_store_memory` → persistent agent memory
3. Used to personalize agent system prompts going forward

### The "Doesn't Count" Rule

Mark the onboarding conversation as a special API call:
- Engine flag: `onboarding: true`
- Quota system skips counting onboarding calls
- User feels like they got something for free (they did)
- Goodwill built before the product even starts

---

## THE SKIP PATH

The conversation step has a "Skip for now" link at the bottom — same style as the BYOK link. Small, quiet, not advertised.

If skipped:
- Default agents: ZigBot, Helix, Forge (universally useful)
- No USER.md population from conversation
- Goals step (current card-based) serves as fallback
- ZigBot says: "No worries. You can always tell me more later."

The skip should feel like pressing snooze, not like failing.

---

## EDUCATIONAL MOMENTS (Woven In)

During the conversation, ZigBot naturally drops knowledge:

After user describes their role:
> "Cool. One thing to know — your agents get smarter the more you work with them. They remember everything. So this conversation? It's the starting point, not the ceiling."

After recommending agents:
> "Quick thing — your data stays on this machine. Always. I don't send anything to the cloud unless you tell me to."

After team preview:
> "These agents talk to each other. If Helix finds something interesting, she'll flag it for Vector. If Forge builds something, Quanta checks it. It's a real team, not a bunch of chatbots."

These aren't separate educational slides — they're woven into the conversation naturally. The user learns without feeling taught.

---

## TIMING & PACING

| Step | Duration | Feel |
|------|----------|------|
| Welcome | 5-10s | Warm, personal |
| Heartbeat | 6s | Watching something come alive |
| Conversation | 30-60s | Chatting with a friend |
| Team Preview | 10-15s | Meeting your coworkers |
| Alive | 8-10s | Cinematic payoff |
| Voice Demo | 3-5s | "Holy shit" moment |
| **Total** | **~90s** | |

90 seconds from "What's your name?" to "Welcome home." That's the target. Long enough to feel meaningful, short enough to not feel like a tutorial.

---

## WHAT THIS REPLACES

Current Steps 2-3 (Goals cards + Team toggles) get folded into the conversation:
- No more card-clicking for goals
- No more manual agent toggling (recommended by default, toggle to customize)
- The conversation IS the goals step
- The team preview IS the team step

Net result: 5 steps → still 5 steps, but one of them (the conversation) is 10x more engaging than the card grid it replaced.

---

## METRICS TO TRACK

- **Conversation completion rate** — how many users finish vs. skip
- **Average conversation length** — how many messages before they're satisfied
- **Agent customization rate** — how many users change the recommended team
- **Time to first chat** — how quickly after onboarding do they start using agents
- **Return rate** — do users who complete the conversation come back more?

These tell us if the conversation is working. If completion rate is high and return rate is high, we've nailed it.

---

## FUTURE ENHANCEMENTS

### Phase 2: Multi-Agent Conversation
During onboarding, multiple agents chime in:
> ZigBot: "I think Helix would be great for this."
> Helix: "I'm in. What's the first thing you want to research?"

### Phase 3: Voice-First Onboarding
User speaks their answers (STT). Agents respond with voices (TTS). Full conversational onboarding without typing.

### Phase 4: Adaptive Conversation
The conversation adapts based on user behavior:
- Fast typer → shorter questions, more direct
- Long responses → deeper follow-ups
- Short responses → quick path, skip depth

### Phase 5: Community Onboarding
Users can share their onboarding conversation (anonymized) as a "team story." New users see examples: "Here's how Sarah's team came together."

---

*The onboarding is the product. Get this right and everything else follows.*
