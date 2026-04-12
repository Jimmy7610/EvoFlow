# EvoFlow AI Ops — Full System Report

## 1. Executive Summary
EvoFlow AI Ops is a professional-grade, local-first workspace designed for private AI operations. It transforms a local Ollama environment into a structured "Command Center" for professionals. The system is currently in a **Late Prototype / Early Production-Ready** state. It excels at high-density information display and local data privacy (RAG), but retains some internal configuration drift (DB providers) and prototype shortcuts in its authentication layer.

---

## 2. What Exists Today
- **Managed Local AI**: Deep integration with Ollama (Model discovery, streaming generate).
- **Session-Isolated RAG**: Document upload (PDF/Text) with extraction and per-conversation context injection.
- **Battle Mode**: Comparison engine for side-by-side benchmarking of different LLM models.
- **Persistent Operations**: SQLite-backed history (Prisma) for sessions, messages, and document inventory.
- **Managed Lifecycle**: UI-based controls to start/terminate background worker processes.
- **Intelligent Memory**: Heuristic retrieval and scoring of session history for context-aware follow-ups.
- **Language Consistency**: Enforced platform-wide rule ensuring AI matches the user's prompt language.
- **Power-user Exports**: One-click MD and JSON export tools.

---

## 3. Frontend Analysis
- **Framework**: Next.js (App Router), TypeScript.
- **Layout**: Fixed-Viewport (100vh) "Dashboard" architecture. Eliminates global page scrolling in favor of independent panel scrolling.
- **UI System**: Vanilla CSS with comprehensive CSS Variable tokens. Dark-mode first aesthetics with glassmorphism and blur effects.
- **Animations**: Framer Motion for sidebar transitions and message entry.
- **Key Component**: `ChatClient.tsx` is the monolithic heart of the UI, managing complex state synchronization between LocalStorage (backup) and REST API (source of truth).
- **Routes**:
    - `/chat`: The primary product environment.
    - `/`: Currently a developer "Testpanel V4" used for debugging raw JSON payloads and API connectivity.
    - `/workflows`: Placeholder / Partial implementation for visual workflow management.

---

## 4. Backend Analysis
- **Server**: Express.js (TypeScript).
- **Communication**: REST API with support for HTTP Streaming (Text-to-chunk) for AI responses.
- **DevOps Logic**: Uses `child_process.spawn` and `taskkill` to manage the "Executor" worker lifecycle from the web context.
- **Security**: Contains a `requireAuth` middleware placeholder that currently defaults to `next()` (Bypass mode).
- **Model Orchestration**: Implements specialized logic for "Direct Mode" (short precision) vs "Multi-step" (reasoning proxy).

---

## 5. AI / Ollama Integration
- **Connectivity**: Interfaces with `http://localhost:11434` (Ollama default).
- **Streaming**: Robust chunked-encoding parser for real-time visual feedback.
- **Auto-Selection**: Heuristic choice of models based on prompt keywords (e.g., favors `coder` models for code tasks).
- **Vision Support**: Code exists to handle image uploads via the `images` array in the generate payload.

---

## 6. Session / Memory / Storage
- **Database**: Prisma ORM with **SQLite** (`dev.db`) as the primary local persistence layer.
- **Storage Discrepancy**: Root `.env` references PostgreSQL, but active schema uses SQLite—indicates a transition or environment drift.
- **Model Relationship**: `ChatSession` has-many `ChatMessage` and `ChatDocument`. 
- **Local Memory**: The backend performs a "Topic Extraction" on incoming messages to index and retrieve relevant historic runs from memory.

---

## 7. Advanced Features
- **RAG Engine**: Uses `pdf-parse` for document extraction. Context is injected into the AI's system prompt as `[Context from filename]: ...`.
- **Battle Mode**: Implements a parallel fetch flow in the frontend (`handleSendComparison`) allowing a second model to respond to the same prompt concurrently.
- **Exporting**: Supports full JSON state archiving and clean Markdown session summaries.

---

## 8. Code Quality Review
- **Structure**: High (Managed monorepo with pnpm).
- **Maintainability**: Medium-High. Component logic is concentrated in `ChatClient.tsx`; extraction into smaller hooks/components is recommended for scale.
- **Logic Integrity**: Good. Strong typing across the stack, especially in the Worker-to-API communication.

---

## 9. Production Readiness
- **Stable**: Chat UI, Streaming, Document Uploads, SQLite persistence.
- **Weak**: Authentication (Missing), Database configuration consistency, Error handling during AI timeouts.
- **Verdict**: Ready for local/internal team use. Requires Auth and Config hardening for multi-user or cloud deployment.

---

## 10. Biggest Opportunities
- **Visual Workflow Editor**: Transforming the `/workflows` placeholder into a node-based graph editor.
- **Cross-Node Workers**: Support for offloading AI generation to other machines in the local network.
- **Advanced Context Steering**: User controls to weight specific documents in the RAG pipeline higher than others.

---

## 11. Immediate Priorities
1. **Resolve DB Drift**: Sync `.env` and `schema.prisma` to a single standard.
2. **Harden Auth**: Replace the `requireAuth` placeholder with a real JWT/Session solution.
3. **Refactor ChatClient**: Break down the 2100+ line component into sub-components (`Sidebar`, `MessageList`, `ControlPanel`).
4. **Implement Global Error Toasts**: Replace `console.error` with user-facing notifications.
5. **Finalize Visual Workflows**: Build the UI for the `/workflows` route.
6. **Robust PDF Handling**: Add support for multi-page/large PDF chunking (Recursive Character Splitting).
7. **Model Settings**: Add UI sliders for Temperature, Top-P, and Context Window size.
8. **Dark/Light Mode Polish**: Ensure all "compact mode" elements have high-contrast light mode variants.
9. **Automated Backups**: Logic to auto-export JSON on major session updates.
10. **Installer Script**: A single `.bat` or `.sh` script to verify Ollama and install all monorepo deps.

---

## 12. Brutally Honest Final Verdict
EvoFlow is a **top-tier local AI tool for developers**. It provides a "workspace" feel that stock Ollama or generic ChatGPT clones lack. Technically, it is a solid monorepo with a well-thought-out data model. However, it currently wears its "Dev Panel" origins on its sleeve—specifically in the root page and the auth gaps. With two weeks of hardening on auth and component refactoring, it could easily be a commercial-grade local desktop application.
