# EvoFlow AI Ops 🚀

Managed Operations Dashboard for Local LLM Workflows and Advanced Chat.

EvoFlow is a powerful monorepo designed to manage local AI operations, featuring a professional-grade dashboard, advanced session-based chat, and a managed background worker system.

> **"Din helt privata, lokala kommandocentral för AI."**  
> EvoFlow är som att ha en egen ChatGPT på din dator – 100% privat, 100% kontroll. För en djupare genomgång, se [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md).

## 🏗 Project Structure

- **`apps/web`**: Next.js frontend with a fixed-viewport dashboard layout, glassmorphic UI, and real-time state management.
- **`apps/api`**: Express backend providing high-performance integration between the UI and local AI workers.
- **`workers/executor`**: Smart background worker that handles LLM logic, including planning, execution, and review cycles.

## ✨ Key Features

- **Advanced Chat Interface**:
  - **Local Ollama Integration**: Connects directly to local models (llama3, mistral, etc.).
  - **Multi-step Reasoning**: Transparent agent flow (Planner -> Executor -> Reviewer).
  - **Smart Memory Retrieval**: Context-aware follow-ups using keyword scoring and task history.
  - **Session Management**: Rename, delete, and persist local chat history safely.
  - **Compact Dashboard**: High-density UI (V27) optimized for information-rich operations.
- **Managed Lifecycle**: Start and stop background services (API/Executor) directly from the web interface.
- **Premium Aesthetics**: Dark-mode first design with glassmorphism, blur effects, and smooth transitions.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- [Ollama](https://ollama.com/) (running locally with `llama3` or `mistral` pulled)

### Installation
```bash
# Install dependencies
pnpm install

# Start development environment
pnpm dev
```

## 🧠 Smart Memory Configuration
The executor can be fine-tuned via `.env` in `workers/executor/.env`:

```env
MEMORY_LOOKBACK_RUNS=12
MEMORY_MAX_RELEVANT_RUNS=4
MEMORY_MIN_SCORE=1
```

## 🛠 Tech Stack
- **Frontend**: Next.js, TypeScript, Vanilla CSS (Custom Glassmorphism)
- **Backend**: Express.js
- **Intelligence**: Ollama (Local LLMs)
- **Architecture**: Monorepo with PNPM Workspaces
