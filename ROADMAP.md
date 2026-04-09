# 🗺 EvoFlow AI Ops - Project Roadmap

This document tracks the evolution of EvoFlow, our managed operations dashboard for local LLM workflows. It serves as a historical record and a strategic guide for future development.

---

## ✅ Completed Milestones

### Phase 1: Foundation & Reliability
- [x] **Local AI Core**: Stable integration with Ollama for local LLMs.
- [x] **Monorepo Architecture**: Clean separation between `apps/web` (UI), `apps/api` (Services), and `workers/executor` (Execution).
- [x] **Managed Lifecycle**: Start/Stop controls for backend processes directly from the UI.
- [x] **Smart Memory**: Context-aware retrieval for follow-up prompts using semantic/keyword scoring.

### Phase 2: UI/UX Evolution (The "Premium" Era)
- [x] **V22: UX Polish**: Message grouping, role-based avatars, and integrated thinking indicators.
- [x] **V23: Expansion**: Transitioned to full-width constraints (1800px) and wider sidebars for better space utilization.
- [x] **V24-V25: Dashboard Framework**: Shifted to a **Fixed-Viewport (100vh)** layout. Independent scrollbars for chat and sidebar, eliminating page-level scrolling.
- [x] **V26: Consolidated Header**: Removed the global white header. Integrated Dashboard, Workflows, and Chat navigation directly into the app header.
- [x] **V27: Compact Mode**: Significant reduction of whitespace. Tightened margins, gaps, and font sizes. Simplified input bar to maximize chat real estate.
- [x] **V28: Unified Runner**: Consolidated multiple terminal windows into a single color-coded session using `concurrently`.

---

## 🏗 In Progress
- [ ] **Accessibility Audit**: Ensuring high-contrast ratios in Dark Mode for better readability.
- [ ] **State Persistence**: Moving beyond `localStorage` for larger session histories.

---

## 🔮 Future Backlog (Framtidsplan)

### 🎨 UI & Aesthetics
- **Smooth Transitions**: Implement `Framer Motion` for session switching and message entry animations.
- **Dynamic Theming**: Fine-grained controls for Light/Dark mode with custom accent color pickers.
- **Glassmorphic Variants**: Add "Frosted Glass" options for different panel depths.

### 🛠 Features & Ux
- **Image Generation Preview**: Visual feedback area for integrated image generation tasks.
- **RAG - Document Chat**: Drag-and-drop PDFs/TXT files to index them into the local smart memory.
- **Multi-Model Comparison**: Side-by-side mode to compare responses from different models (e.g., Llama3 vs Mistral).
- **Export Power-tools**: Export full session histories to PDF, Markdown, or JSON.
- **Toast Notifications**: Minimalist popup notifications for API state changes or generation status.

### ⚙️ Infrastructure
- **SQLite Integration**: Replace local storage with a lightweight local database for robust history management.
- **Multi-Node Workers**: Support for distributing LLM tasks across multiple background machines.
- **API Key Management**: Secure local storage for external API keys (OpenAI, Anthropic) as fallbacks.

---

> "Build for precision, design for professionals."
