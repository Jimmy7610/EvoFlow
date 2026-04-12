# 🕵️ Day 1: Full UX Audit - EvoFlow AI Ops

This audit identifies the primary friction points and upgrade opportunities for EvoFlow as it transitions from a functional prototype to a premium AI product.

---

## 🚫 TOP 20 Friction Points

### 🗺 Navigation & Onboarding
1.  **Landing Page (/)**: Currently a "Testpanel V4" dev page. No product identity or onboarding flow.
2.  **Overcrowded Header**: The `/chat` top bar is packed with 10+ buttons, creating decision fatigue.
3.  **Language Inconsistency**: Mixed Swedish ("Avsluta") and English ("Export chats") in critical UI controls.

### 📁 Session Management
4.  **Visual Noise**: "Rename" and "Delete" buttons are permanently visible on every session in the sidebar.
5.  **Renaming Bug**: Title strings are sometimes appended instead of replaced (e.g., "New chatAudit Session").
6.  **Destructive Actions**: Missing confirmation modals for session deletion.
7.  **Auto-Naming**: The system doesn't reliably generate a clean title from the first prompt.

### 💬 Chat Experience
8.  **Composer Layout**: The massive `textarea` makes the small "Send" button look disconnected and floating.
9.  **Loading States**: "AI IS THINKING..." (All-caps) feels aggressive and unpolished.
10. **Metadata Overload**: Model badges like `llama3-stream` appear on user messages where they are irrelevant.
11. **Streaming Jitter**: Slight vertical layout shifting occurs as the AI streams content.

### ⚔️ Battle Mode (Comparison)
12. **Cramped Opponent View**: The right-side "Opponent" panel lacks the spacing and hierarchy of the main view.
13. **Model Selection**: Switching models in Battle Mode requires too many clicks (dropdown -> search -> select).

### ⚙️ Operational UI
14. **Process Controls**: Manual "Start/Avsluta" buttons for the background worker feel like a technical chore, not a product feature.
15. **Status Badges**: API/Web/Executor status takes up prime real estate that could be used for session context.
16. **Developer Leak**: Raw API base URLs and ISO timestamps (e.g., `2026-04-11T09:38...`) are visible on the Workflows page.

### 🎨 Visual Polish
17. **Default Aesthetics**: Standard browser buttons and borders clash with the "premium" dark mode goal.
18. **Navigation States**: Current page link (e.g., "Chat") has no distinct active state in the global nav.
19. **Typography Hierarchy**: Heading levels in messages are inconsistent and lack proper vertical rhythm.
20. **File Management**: The "+ Add" file button is isolated at the bottom left, far from the execution context.

---

## ✨ TOP 20 Upgrade Opportunities

### 🚀 High Impact
1.  **Real Homepage**: A premium landing page introducing "Private Multi-model Intelligence."
2.  **Clean Sidebar**: Move session actions into a hover-triggered "meatball" (three-dot) menu.
3.  **Unified Language**: Select a single primary language (English recommended for pro tools) for all labels.
4.  **Shadow & Radius System**: Implement consistent `rounded-2xl` and `soft-shadow` tokens.

### 🧠 Intelligence UI
5.  **Animated "Thinking"**: Use a subtle dot loader or a fading pulse instead of text indicators.
6.  **Relative Timestamps**: Update "2026-04-11..." to "Just now", "Yesterday", or "2 hours ago."
7.  **Automatic Context**: Automatically attach recently uploaded files to new prompts.

### ⌨️ Interaction Design
8.  **Composer Perfection**: Integrated "Send" icon inside the composer, auto-growing height, and `Cmd+Enter` support.
9.  **File Chips**: Show attached documents as small, removable "chips" inside the composer area.
10. **Toast Notifications**: Modern notifications for successes (Exported!) or failures (Model Offline).

### 🛡 Reliability
11. **Background Management**: Automate the executor startup when the app loads.
12. **Safe Delete**: Implement a "Spring-loaded" or confirmation modal for destructive actions.

### 🎨 Aesthetics
13. **Obsidian Glass**: Refine the sidebar and message bubbles with frosted glass (blur) and tighter borders.
14. **High-Quality Icons**: Replace text-based badges with model-specific mono-icons (Llama, Mistral, etc.).
15. **Compact Mode**: A toggle for power users to reduce padding and increase information density.

### 📊 Differentiation
16. **Battle Stats**: Add "Tokens/sec" and "Response Time" metrics to the Battle Mode results.
17. **Export Preview**: A "Print Preview" style view before exporting to Markdown.
18. **Prompt Library**: A simple modal to save and insert frequently used "System Prompts".
19. **Global Search**: `Ctrl+K` command palette to find sessions or search specific message content.
20. **Professional Onboarding**: A brief, three-step guide for first-time users to set up Ollama.

---

## 🏁 Verdict: Day 1
The foundation is **rock solid**, but the "engine" is currently naked. Week 1 will focus on "clothing" the engine in a premium, professional suit, starting with the session management and sidebar tomorrow.
