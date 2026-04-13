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
- **Interactive Reasoning Visualization**: Gain deep insight into the AI's "thinking". Every step (Planner, Context, Generation) is now interactive—click to expand and see the internal thought process, retrieved context matches, and relevancy scores.
- **Deep Memory Retrieval (RAG)**: The memory engine transparency allows you to see exactly which previous messages were retrieved to build the current response.
- **Advanced Context Steering 🎯**: Surgically guide the AI's memory. Define focus keywords to boost specific topics or apply exclusion rules to block irrelevant historical data from reaching the AI context.
- **Live Web Research**: The agentic workflow autonomously fetches live news and searches the web (integrated DuckDuckGo) for grounded answers.
- **Hybrid Cloud-Local Routing**: Seamlessly mix local models with premium cloud models (OpenAI/Anthropic). EvoFlow intelligently routes tasks based on your model selection and stored API keys.

### 💬 The Chat Experience
- **Battle Mode 2.0**: The ultimate benchmarking tool. Compare two different models (e.g., GPT-4o vs Llama-3) or personas side-by-side to evaluate quality.
- **Streaming & Control**: High-performance streaming with instant interruption (Stop Generation) and masking of sensitive API keys in the settings panel.
- **Intelligent Persona Routing**: Switch between roles like *Code Expert* or *Security Lead*. EvoFlow automatically pairs these with the optimal model configuration.

### ⚙️ Professional Settings & Infrastructure
- **API Key Management**: Securely store and manage your cloud AI keys directly in the UI with masked displays for privacy.
- **Unified Root Infrastructure**: Both the API and Worker now share a stable, unified SQLite database at the project root for maximum reliability in high-load scenarios.
- **System Monitors**: Real-time status indicators for the local API, background worker, and Ollama connectivity.

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
