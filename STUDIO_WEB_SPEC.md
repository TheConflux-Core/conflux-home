# Studio Web Module — Full Build Spec

> **Vision:** "CodePen meets AI" — type what you want, see it live, copy the code.
> **Standard:** Need, not want. A developer opens this and doesn't go back to CodePen.

---

## THE EXPERIENCE

1. User types: *"A 3D animated button with hover glow effect in React + Tailwind"*
2. LLM generates clean, working code (HTML/CSS/JS or JSX + Tailwind)
3. **Live preview renders instantly** in a sandboxed iframe
4. User sees the button — it animates, it glows, it works
5. Code is displayed with syntax highlighting in a split pane
6. User can **edit the code** → preview updates live
7. One-click **Copy Code** / **Save to Vault** / **Export as ZIP**
8. Remix — "make it blue" / "add a loading state" / "make it bigger"

---

## ARCHITECTURE

### Data Flow

```
User Prompt + Framework + Complexity
        ↓
   studio_generate_web (Tauri command)
        ↓
   LLM call (MiniMax primary, OpenAI fallback)
        ↓
   Parse response → extract HTML/CSS/JS blocks
        ↓
   Store in studio_generations (metadata_json has the code)
        ↓
   Return to frontend
        ↓
   Render in sandboxed iframe (srcdoc)
        ↓
   Display code in syntax-highlighted editor
        ↓
   User edits → live re-render in iframe
```

### Backend (Rust)

**New Tauri Command: `studio_generate_web`**

```rust
#[tauri::command]
pub async fn studio_generate_web(
    generation_id: String,
    prompt: String,
    framework: String,       // "html" | "react" | "vue" | "svelte" | "tailwind"
    complexity: String,      // "simple" | "medium" | "complex"
    reference_image: Option<String>,  // optional screenshot to match
) -> Result<StudioGeneration, String>
```

**Responsibilities:**
1. Build system prompt based on framework + complexity
2. Call LLM (MiniMax API via reqwest)
3. Parse response — extract code blocks from markdown fences
4. If framework is "html" → return single HTML file (all CSS/JS inline)
5. If framework is "react" → return JSX component with Tailwind classes
6. If framework is "tailwind" → return HTML + Tailwind CDN script tag
7. Store full code in `studio_generations.metadata_json`
8. Update generation status to "complete"
9. Return the generation record

**LLM Prompt Strategy:**

```
System: You are an expert web developer. Generate ONLY code, no explanations.
Rules:
- Output a SINGLE complete HTML file
- All CSS must be in a <style> tag in the <head>
- All JS must be in a <script> tag before </body>
- Use modern CSS (flexbox, grid, custom properties, animations)
- Make it visually polished — this is a demo, not a prototype
- Include hover states, transitions, and micro-interactions
- For React: output a single JSX component with Tailwind classes
- For Tailwind: include the CDN script tag, use utility classes
- NEVER use external dependencies unless CDN-linked
- Code must be immediately runnable in a browser

User: {prompt}
Framework: {framework}
Complexity: {complexity}
```

**Response Parsing:**
- Extract code between ```html ... ``` or ```jsx ... ``` or ``` ... ``` fences
- If no fences found, treat entire response as code
- Validate it starts with `<!DOCTYPE html>` or `<html` for HTML mode
- For React, validate it contains JSX syntax

### Database

**No schema changes needed.** We reuse `studio_generations`:
- `module` = "code"
- `metadata_json` = JSON with `{ "code": "...", "framework": "...", "complexity": "...", "language": "html" }`
- `output_path` = null (code lives in metadata, not as a file)
- `output_url` = null

### Frontend (React)

**New Component: `WebPreview.tsx`**

The preview canvas replacement when `activeModule === 'code'`:

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────┬──────────────────────────────┐│
│  │                      │                              ││
│  │   CODE PANE          │   LIVE PREVIEW               ││
│  │                      │                              ││
│  │   Syntax-highlighted │   Sandboxed iframe           ││
│  │   HTML/CSS/JS or     │   Renders the generated      ││
│  │   JSX code           │   code in real-time          ││
│  │                      │                              ││
│  │   [Copy] [Save] [↓]  │   Device frame options       ││
│  │                      │                              ││
│  └──────────────────────┴──────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Prompt Bar (existing)                              ││
│  │  "Describe your component..."    [Generate]         ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Sub-components:**

1. **`CodeEditor`** — Syntax-highlighted code display
   - Use **Prism.js** or **highlight.js** (lightweight, no build step)
   - Read-only mode by default, click to edit
   - Editable mode: textarea overlay with syntax highlighting
   - Line numbers
   - Language detection (HTML/JSX/CSS)

2. **`LivePreview`** — Sandboxed iframe
   - Uses `srcdoc` attribute for HTML content
   - `sandbox="allow-scripts"` for security
   - Auto-refreshes on code change (debounced 300ms)
   - Device frame toggle: Desktop / Tablet / Mobile
   - Refresh button for manual re-render

3. **`CodeActions`** — Action bar below code
   - **Copy Code** — copies to clipboard with toast notification
   - **Save to Vault** — saves as .html file in vault
   - **Export ZIP** — for multi-file projects (future)
   - **Fullscreen** — expand code editor to full screen
   - **Remix** — "make it blue" / "add animation" / follow-up prompts

4. **`FrameworkSelector`** — Quick switch in toolbar
   - HTML | React | Tailwind | Vue (pill buttons)
   - Switching framework re-generates from same prompt

**Integration with existing StudioDashboard:**

The preview canvas area (`studio-preview-canvas`) currently shows:
- Generating shimmer (when loading)
- Image preview (for image module)
- Audio player (for music module)
- Error states

We add a new case: when `activeModule === 'code'` and generation is complete, render `<WebPreview>` instead of the generic image/audio preview.

---

## WHAT GETS MODIFIED

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/WebPreview.tsx` | Main web preview component |
| `src/components/CodeEditor.tsx` | Syntax-highlighted code editor |
| `src/components/LivePreview.tsx` | Sandboxed iframe renderer |
| `src/components/CodeActions.tsx` | Copy/Save/Export action bar |

### Files to Modify
| File | Change |
|------|--------|
| `src/hooks/useStudio.ts` | Add `generateWeb()` handler in `generate()` |
| `src/components/StudioDashboard.tsx` | Render `WebPreview` for code module |
| `src/components/AdjustmentPanel.tsx` | Already has code controls — minor tweaks |
| `src-tauri/src/commands.rs` | Add `studio_generate_web` command |
| `src-tauri/src/engine/mod.rs` | Add `generate_web()` function |
| `src-tauri/src/lib.rs` | Register new command |
| `src/styles-studio.css` | Add code editor + preview styles |

### Dependencies to Add
| Package | Purpose | Size |
|---------|---------|------|
| `prismjs` | Syntax highlighting | ~30KB |
| `react-simple-code-editor` | Editable code pane | ~5KB |

Or use a simpler approach: `<pre><code>` with manual highlighting via a custom hook that wraps Prism. Avoids adding a full editor library.

---

## PHASES

### Phase 1 — The Core (Backend + Basic Preview)
**Goal:** Prompt in → code out → preview renders

**Backend:**
- [ ] `studio_generate_web` Tauri command
- [ ] LLM prompt template (HTML mode first)
- [ ] Response parser — extract code from markdown fences
- [ ] Store in `studio_generations.metadata_json`
- [ ] Register command in `lib.rs`

**Frontend:**
- [ ] `LivePreview.tsx` — sandboxed iframe with srcdoc
- [ ] Wire into `useStudio.ts` — new case in `generate()` for `activeModule === 'code'`
- [ ] Show code in a basic `<pre>` block below the preview
- [ ] Copy to clipboard button
- [ ] Basic CSS for the split layout

**Test:** Type "a blue button with hover effect" → see working button in preview → copy code works

---

### Phase 2 — The Polish (Editor + UX)
**Goal:** CodePen-quality editing experience

- [ ] `CodeEditor.tsx` — syntax highlighting with Prism.js
- [ ] Line numbers
- [ ] Editable mode — click code → edit → preview updates live
- [ ] Device frame toggle (Desktop 1280px / Tablet 768px / Mobile 375px)
- [ ] Framework selector in the toolbar (HTML / React / Tailwind)
- [ ] Template presets in AdjustmentPanel ("Landing Page", "Component", "Animation", "Form", "Dashboard")
- [ ] Remix flow — "make it bigger", "change the color to green"
- [ ] Fullscreen code editor mode
- [ ] Error handling — show LLM errors gracefully in preview pane

**Test:** Edit code → preview updates. Switch frameworks → re-generates. Remix works.

---

### Phase 3 — The Power Features
**Goal:** Export, multi-file, deployment

- [ ] Export as ZIP (HTML file + assets)
- [ ] Multi-file React project generation (component + styles + utils)
- [ ] "Save to Vault" stores as .html file with proper metadata
- [ ] Generation history — click past web generations to reload them
- [ ] Batch generate — 4 variations of same prompt
- [ ] Code diff view — compare original vs remixed version
- [ ] Share link — generate a temporary hosted URL (stretch goal)

**Test:** Full workflow — generate → edit → save to vault → export ZIP → open in browser

---

## TECHNICAL DETAILS

### Sandboxed Iframe Strategy

```tsx
// LivePreview.tsx
const buildSrcDoc = (code: string, framework: string): string => {
  if (framework === 'html' || framework === 'tailwind') {
    // Code is already a complete HTML document
    return code;
  }
  if (framework === 'react') {
    // Wrap JSX in a minimal React runtime
    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${code}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<${componentName} />);
  <\/script>
</body>
</html>`;
  }
};
```

### LLM Response Parsing

```rust
fn extract_code_block(response: &str, framework: &str) -> String {
    // Try to find markdown code fences
    let patterns = match framework {
        "react" => vec!["```jsx", "```javascript", "```tsx"],
        "html" => vec!["```html", "```"],
        "tailwind" => vec!["```html", "```"],
        _ => vec!["```"],
    };

    for pattern in patterns {
        if let Some(start) = response.find(pattern) {
            let code_start = start + pattern.len();
            if let Some(end) = response[code_start..].find("```") {
                return response[code_start..code_start + end].trim().to_string();
            }
        }
    }

    // No fences — return full response as code
    response.trim().to_string()
}
```

### Code Validation

Before returning to frontend:
1. For HTML: check it contains `<html` or `<!DOCTYPE` or at minimum `<style` or `<div`
2. For React: check it contains `return` and JSX syntax (`<` and `/>`)
3. For Tailwind: check it contains `class=` or `className=`
4. If validation fails, wrap in a minimal HTML shell

---

## ADJUSTMENT PANEL CHANGES

The existing code adjustments are good but need tweaks:

```tsx
// Current (good):
language: 'html', framework: 'vanilla', complexity: 'simple'

// Updated:
framework: 'html' | 'react' | 'tailwind' | 'vue'  // rename from 'language'
complexity: 'simple' | 'medium' | 'complex'          // keep
// Add:
theme: 'dark' | 'light' | 'auto'                     // new
responsive: boolean                                    // new
animations: boolean                                    // new
```

**Template presets** (new — in AdjustmentPanel):
- 🎯 **Component** — Single reusable UI component
- 📄 **Landing Page** — Full page with hero, sections, CTA
- 📊 **Dashboard** — Data display with cards, charts, tables
- 📝 **Form** — Input form with validation styling
- ✨ **Animation** — CSS/JS animations and transitions
- 🎮 **Interactive** — Games, quizzes, interactive demos

---

## COMPLEXITY LEVELS

| Level | What the LLM generates |
|-------|----------------------|
| **Simple** | Single element or small component. < 100 lines. Button, card, badge, loader. |
| **Medium** | Multi-section component. 100-300 lines. Form, navbar, hero section, pricing table. |
| **Complex** | Full page or interactive component. 300-800 lines. Dashboard layout, landing page, game. |

---

## SUCCESS CRITERIA

### Phase 1 Done When:
- [ ] "A blue button" → renders a blue button in preview
- [ ] "A landing page for a coffee shop" → renders a full page
- [ ] Copy button works
- [ ] No console errors
- [ ] `cargo check` clean, `tsc --noEmit` clean

### Phase 2 Done When:
- [ ] Code has syntax highlighting
- [ ] Editing code updates preview in real-time
- [ ] Framework switcher works
- [ ] Remix ("make it red") produces new generation
- [ ] Templates pre-fill the prompt

### Phase 3 Done When:
- [ ] Save to Vault stores .html file
- [ ] Export ZIP works
- [ ] Past generations reload correctly
- [ ] Batch 4 variations works

---

## ESTIMATED TOKENS & TIME

| Phase | Rust Changes | React Changes | CSS | Estimated Effort |
|-------|-------------|---------------|-----|-----------------|
| Phase 1 | ~200 lines | ~150 lines | ~50 lines | 1 session |
| Phase 2 | ~50 lines | ~400 lines | ~200 lines | 1 session |
| Phase 3 | ~150 lines | ~200 lines | ~50 lines | 1 session |

**Total:** ~400 lines Rust, ~750 lines React, ~300 lines CSS

---

*This turns Studio from "image + music generator" into "the creative command center."*
*The Web module alone could be the reason people open Conflux every day.*
