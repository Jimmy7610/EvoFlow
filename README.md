# EvoFlow AI Ops 🚀

**Managed Operations Dashboard for Local LLM Workflows and Advanced Chat.**

EvoFlow is a powerful, monorepo-based "AI Ops" command center designed for users who want 100% private, high-performance local AI. It transforms local models (via Ollama) into a professional-grade workspace with advanced reasoning and a premium design.

> **"Din helt privata, lokala kommandocentral för AI."**  
> EvoFlow är din personliga AI-hubb – 100% kontroll, inga molnavgifter.

---

## ✨ 30-Day Transformation Features

EvoFlow has recently undergone a major structural and visual transformation to become a "Premium Local AI Product".

### 💬 Advanced Chat Experience
- **Premium Rendering (Day 4)**: Full Markdown support via `react-markdown` and `remark-gfm`. 
  - **Syntax Highlighting**: Beautiful code blocks with one-click **"COPY"** functionality.
  - **GFM Tables**: Full support for complex data and alignment.
  - **Contextual Math & Logic**: Elegant rendering for blockquotes and lists.
- **Composer Perfection (Day 5)**: 
  - **Auto-resizing Input**: The textarea grows with your prompts perfectly.
  - **Stop Generation**: Interrupt AI responses instantly with a dedicated Stop button (`AbortController`).
  - **Power User Shortcuts**: `Cmd/Ctrl + Enter` to send, `Shift + Enter` for new lines, `Esc` to blur.
- **Advanced Rendering (Day 4)**: Full GFM support, syntax highlighting, and contextual message actions.
- **System Reliability (Day 8)**: Real-time Ollama status monitoring and robust error handling for local API disconnections.
- **Battle Mode (Day 3)**: Compare two different local models side-by-side in real-time.
- **Persona & Prompt Library (Day 9)**: 
  - **Dynamic AI Personas**: Switch between specialized roles like **Code Expert**, **Security Lead**, and **Product Architect** instantly.
  - **Quick Prompt ⚡ Menu**: Access a library of pre-defined templates for common tasks like code reviews, bug fixes, and architecture planning.
  - **Personalized System Prompts**: Every session can have its own custom instruction set for ultra-tailored AI behavior.
  - **Ollama Visibility**: Direct feedback on backend connection and processing states.
  - **Quad-Indication Dashboard**: Unified health monitoring for API, Web, Executor, and Ollama in the sidebar.
- **Battle Mode 2.0 (Day 10)**: 
  - **Multi-Persona Comparison**: Compare different AI roles (e.g., Code Expert vs Product Architect) side-by-side on the same model or across different models.
  - **Independent Persona Selection**: Full control over system prompts for both primary and secondary chat panes.
  - **Intelligent Model Matching**: Automated detection of "best match" models for each persona. If you select **Code Expert**, EvoFlow automatically activates high-performance coding models like `qwen3-coder:30b` if they are installed locally.
- **Advanced Intelligence (Day 11)**:
  - **Battle Mode 2.0**: Enhanced model benchmarking with persona-level optimization and real-time comparisons.
  - **Reasoning Flow Visualizer**: High-fidelity, animated transparency into multi-agent workflows (Memory, Planning, Execution).
  - **System Health Monitor**: Real-time observability of backend services and model status.



### 📁 Session & Export Power (Day 7)
Professional-grade tools for high-volume data handling:
- **Multi-Selection Mode**: Enter "Manage" mode to select multiple sessions for bulk operations.
- **Markdown Export**: Transform your chats into high-fidelity, readable `.md` documents with full metadata preserved.
- **Premium Bulk Cleanup**: Permanently delete multiple sessions at once with a safe, theme-consistent "Click to Confirm" button state (replacing native popups).
- **Selective JSON Export**: Export only curated sessions to share or back up specific workflows.

### 🎨 Theme Ecosystem (Day 6)
Experience EvoFlow in your favorite environment. All themes are persistent via `localStorage`.
- **Midnight**: Our signature deep blue/black oculart-safe dark mode.
- **Emerald**: A refreshing forest-inspired palette with vibrant green accents.
- **Cyberpunk**: A high-energy neon world of pink and purple.
- **Obsidian**: A ultra-minimalist slate and monochrome aesthetic.
- **Light**: A clean, high-contrast professional white mode.
- **Font Scaling**: Dynamically adjust the text size of the chat history for perfect readability.

### 🧠 Smart Logic & Memory
- **Multi-step Reasoning**: Transparent agent flow where you see the **Planner**, **Executor**, and **Reviewer** at work.
- **Attachment Awareness**: Upload `.txt`, `.md`, or `.pdf` files to provide context. Active documents appear as interactive chips in the composer.
- **Managed Lifecycle**: Control your local background workers (API/Executor) directly from the Dashboard.

---

## 🏗 Monorepo Structure

- **`apps/web`**: Next.js 14 frontend using `framer-motion` for world-class animations.
- **`apps/api`**: Express.js backbone with Prisma/SQLite for persistent session management.
- **`workers/executor`**: The "Brain" – handles model orchestration and multi-agent loops.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [Ollama](https://ollama.com/) (running with `llama3` or `mistral` pulled)

### Quick Start
```bash
# Install dependencies
pnpm install

# Initialize Database
cd apps/api && npx prisma db push

# Launch the whole system
pnpm dev
```

## 🛠 Tech Stack
- **Languages**: TypeScript (Full Stack)
- **UI Architecture**: Next.js, Framer Motion, Lucide React
- **Logic**: Ollama (Local AI), React Markdown
- **Data**: SQLite + Prisma ORM
