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
- [x] **V27: Compact Mode**: Significant reduction of whitespace. Tightened margins, gaps, and font sizes. Simplified input bar to maximize chat real estate.
- [x] **V28: Unified Runner**: Consolidated multiple terminal windows into a single color-coded session using `concurrently`.

### Phase 3: Intelligence & Context (The "Power User" Era)
- [x] **RAG - Document Flow**: Native support for PDF and text analysis. Integrated document management into the sidebar with session isolation.
- [x] **Battle Mode**: Side-by-side model comparison allows for benchmarking generation quality in real-time.
- [x] **Language Consistency**: Enforced cross-model language matching (AI adapts to user prompt language automatically).
- [x] **Unified Export**: One-click Markdown and JSON export tools for session archiving.
- [x] **Aesthetic Motion**: Full integration of Framer Motion for premium sidebar transitions and message animations.
- [x] **Premium State Management**: Replaced volatile local storage with a robust SQLite/Prisma architecture. Persistent session history across reboots.

### Phase 4: Intelligence & System Maturity (The "Pro" Era)
- [x] **Intelligent Model Matching & Dynamic Persona Routing**
- [x] **Battle Mode 2.0 (Dual-Pane Benchmarking)**
- [x] **Reasoning Flow Visualizer (Real-time Transparency)**
- [x] **System Health Dashboard & Observability**
- [x] **Day 11: Contextual Memory Injection**: Automated retrieval of relevant project files based on current chat intent.

### Phase 5: Web Capability Layer (The "Live" Era)
- [x] **Zero-Config Search Tool**: Built-in DuckDuckGo scraper using axios/cheerio.
- [x] **Live Web Research Integration**: Added to the agentic planner and visualized in the Reasoning Stepper.

### Phase 6: UX Clarity & Premium Productization
- [x] **Premium Landing Page**: Replaced the developer 'Testpanel V4' with a stunning, dark-first product homepage.
- [x] **Chat UX Overhaul**: Added tooltips, collapsible dev controls, and clear labels to reduce decision fatigue.
- [x] **Welcome Onboarding**: Added an interactive empty state with actionable example prompts.
- [x] **System Hardening**: Fixed latent TypeScript build errors and ensured stable production compilation.

---

## 🏗 In Progress
- [ ] **Accessibility Audit**: Ensuring high-contrast ratios in Dark Mode for better readability.
- [ ] **Multi-Step Visualization Improvement**: Enhancing the UI for tracking complex agent reasoning paths.


---

## 🔮 Future Backlog (Framtidsplan)

### 🎨 UI & Aesthetics
- **Dynamic Theming**: Fine-grained controls for Light/Dark mode with custom accent color pickers.
- **Glassmorphic Variants**: Add "Frosted Glass" options for different panel depths.
- **Toast Notifications**: Minimalist popup notifications for API state changes or generation status.

### 🛠 Features & UX
- **Image Generation Preview**: Visual feedback area for integrated image generation tasks.
- **Advanced Context Steering**: User-defined focus areas for the RAG engine (e.g., "prioritize code blocks").
- **Voice-to-Execution**: Direct voice command integration for hands-free local LLM operations.

### ⚙️ Infrastructure
- **Custom Model Pointers**: Ability to point to remote Ollama/OpenAI instances per session.
- **Multi-Node Workers**: Support for distributing LLM tasks across multiple background machines.
- **API Key Management**: Secure local storage for external API keys (OpenAI, Anthropic) as fallbacks.

---

> "Build for precision, design for professionals."
