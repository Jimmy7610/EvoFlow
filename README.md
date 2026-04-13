# EvoFlow AI Ops 🚀

**Premium Managed Operations Dashboard for Local LLM Workflows.**

EvoFlow is a powerful, monorepo-based "AI Ops" command center designed for professionals who want 100% privacy, high-performance local AI, and uncompromised UX. It transforms local models (via Ollama) into a premium workspace with advanced multi-agent reasoning, RAG analysis, web search, and model benchmarking.

> **"Din helt privata, lokala kommandocentral för AI."**  
> EvoFlow är din personliga AI-hubb – 100% kontroll, inga molnavgifter.

---

## ✨ Features

EvoFlow has evolved into a "Premium Local AI Product" through a rigorous 30-day roadmap, prioritizing both raw intelligence and user experience.

### 🏠 Premium Interface & UX Clarity
- **Stunning Dashboards**: A premium, dark-first product homepage with Framer Motion micro-animations.
- **Fixed-Viewport Layout**: A zero-scroll global layout (100vh) pushing all scrolling into dedicated chat and context panels.
- **Cognitive Polish**: Contextual tooltips, intelligent empty states with actionable prompt defaults, and collapsible dev controls to eliminate decision fatigue.
- **Theme Ecosystem**: Persistent UI themes including *Midnight*, *Emerald*, *Cyberpunk*, *Obsidian*, and clean *Light* setups. Dynamic font scaling ensures perfect readability.

### 🧠 Advanced Intelligence
- **Multi-Agent Reasoning Visualizer**: See the AI "think" in real-time. A beautifully animated stepper tracks the Planner, Executor, and Reviewer as they work through complex prompts.
- **Live Web Research**: The agentic workflow can autonomously fetch live news and search the web (via an integrated zero-config DuckDuckGo scraper) for grounded answers.
- **Intelligent RAG (Document Analysis)**: Upload `.txt`, `.md`, or `.pdf` files. EvoFlow maintains a contextual memory of uploaded documents per session.
- **Intelligent Persona Routing**: Switch between roles like *Code Expert*, *Security Lead*, or *Product Architect*. EvoFlow will automatically activate the local highest-performance model for that specific job (e.g., `qwen2.5-coder` for coding).

### 💬 The Chat Experience
- **Battle Mode 2.0**: The ultimate benchmarking tool. Compare two different local models or two different system personas side-by-side on the exact same prompt to evaluate generation quality.
- **Streaming & Control**: Real-time response streaming with instant interruption (Stop Generation) via AbortControllers.
- **High-Fidelity Rendering**: Full Markdown, GitHub Flavored Markdown (GFM) tables, and gorgeous syntax highlighting for code blocks with one-click copy.
- **Quick Prompts ⚡**: A built-in library of rapid-fire templates for code review, summarizing, and fixing bugs.

### 📁 Session & Export Power
- **Persistent Memory**: A robust SQLite + Prisma backend means sessions survive browser reboots.
- **Bulk Management**: Multi-selection mode for cleaning up the sidebar.
- **Unified Exports**: One-click export to high-fidelity `.md` or raw `.json` payloads for archiving flows.

---

## 🏗 Monorepo Architecture

EvoFlow enforces a clean separation of concerns using a Next.js frontend, an Express API, and a background Node worker.

- **`apps/web`**: Next.js 14 App Router, React 18, and `framer-motion` for world-class animations.
- **`apps/api`**: Express.js backbone serving as the unified integration layer for Ollama and Prisma interactions.
- **`workers/executor`**: The "Brain" — handles long-running multi-agent loops and web capabilities asynchronously.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS, v18+ recommended)
- [Ollama](https://ollama.com/) (running natively with models like `llama3` or `qwen2.5-coder` installed)
- `pnpm` or `npm`

### Quick Start

EvoFlow uses a custom `evoflow-root-runner` to orchestrate all services simultaneously.

```bash
# Install all dependencies across the monorepo
npm run install:all

# Initialize the Database
cd apps/api && npx prisma db push && cd ../..

# Launch the whole system (Web, API, and Executor)
npm run dev
```

The system will start and be accessible at `http://localhost:3000`.

---

## 🛠 Tech Stack
- **Core**: TypeScript (Full Stack)
- **UI Framework**: Next.js 14, React 18
- **Styling & Animation**: Vanilla CSS, Framer Motion, Lucide React
- **Local AI Logic**: Ollama, LangChain (Concepts)
- **Persistence**: SQLite + Prisma ORM
- **Web Capabilities**: Axios + Cheerio
