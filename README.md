# 🚀 EvoFlow - Jimmy's Intelligence Workspace (v6.0)

EvoFlow is a powerful, personal AI platform designed for advanced reasoning, deep analysis, and secure local-first interactions. Built entirely from scratch by **Jimmy**, this workspace is intended for users who need more than just a chat interface — it provides a high-depth environment for research, code architecture, and complex decision-making.

## 💎 The Vision
The purpose of EvoFlow is to bridge the gap between simple LLM chats and professional-grade intelligence environments. It focuses on:
- **Absolute Privacy**: Running local models (Ollama) ensures your data never leaves your system.
- **Deep Reasoning**: Tools specifically designed to break the "brevity wall" and provide exhaustive, high-quality analysis.
- **Workflow Orchestration**: Managing multi-step tasks that require planning, research, and synthesis.

![EvoFlow V6 Banner](https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1200)

### 💎 Universal Premium UI (v21.12)
- **Shared Theme Engine**: Centralized design tokens (Midnight, Obsidian, Emerald) ensuring absolute visual parity across the platform.
- **Glassmorphic Navigation**: A unified, high-depth header shared by Dash, Chat, Workflows, and Dev routes.
- **Master Power Control**: 
    - **System Dormant Mode**: Manually deactivate entire intelligence workspace with a single click.
    - **Launch Logic**: Re-activate intelligent services instantly through the unified "Launch Chat" protocol.
    - **Interface Lock**: Secure, glassmorphic overlay preventing access during dormant states.
- **Active Response UX**: Thinking skeletons, real-time status indicators, and instant abort support.
- **Message Timestamps**: Swedish-localized date/time tracking for history audit.

### 👁️ Vision Intelligence Core (Llava Augmented)
- **Deep Scan Protocol**: Multi-layered image analysis covering Environment, Figures, Textures, Lighting, and Technical elements.
- **Narrative Force Engine**: Explicitly designed to break the "GPT-4o brevity wall," delivering 1000+ word exhaustive reports.
- **Multimodal Clipboard**: Instant `Ctrl+V` screenshot uploads with automatic vision engine switching.
- **LightBox POV**: Full-screen focus mode for detailed examination of uploaded visual assets.

### 🧠 Advanced Reasoning & Memory
- **Context Steering Engine**: Precise real-time control over AI memory. Force the model to focus on specific keywords or exclude irrelevant topics.
- **Battle Mode (Benchmarking)**: Side-by-side model comparison to audit model drift and reasoning depth in real-time.
- **Reasoning Stepper**: Visualized multi-step planning (Planner -> Research -> Synthesis), allowing you to peek into the AI's internal process.

### ⚡ Technical Stack
- **Frontend**: Next.js 14, Framer Motion (Premium Animations), Shared Theme Library (`lib/themes.ts`).
- **Backend (API)**: Node.js/Express with Postgres/Prisma persistence.
- **Engine**: Local Ollama (optimized for 8192 token prediction and 16k context windows).

---

## 🛠️ Quick Start

### 1. Requirements
- Node.js 18+
- [Ollama](https://ollama.com/) (Local models)
- PostgreSQL (or use the built-in SQLite for development)

### 2. Installation
```bash
# Clone the repo
git clone https://github.com/Jimmy7610/EvoFlow.git
cd EvoFlow

# Install dependencies
npm install

# Setup Database
npx prisma generate
npx prisma db push

# Launch the workspace
npm run dev
```

### 3. Setup Vision (IMPORTANT)
To enable the **Visual Analyst** persona, ensure you have Llava pulled locally:
```bash
ollama pull llava
```

---

## 🏗️ Technical Architecture

EvoFlow uses a three-tier architecture to ensure maximum performance and security:
- **`apps/web`**: Lightweight React frontend with high-refresh-rate UI updates.
- **`apps/api`**: Intelligence Orchestrator. Handles model selection, session hydration, and stream multiplexing.
- **`workers/executor`**: Dedicated background processing for long-running multi-step reasoning tasks.

---

## 🛡️ Security & Privacy
- **Local First**: All core processing is defaulted to local Ollama models (Llama 3, Llava, Gemma).
- **Sandboxed Execution**: Background tasks are executed in managed Node environments.

---

*Made with ❤️ by **Jimmy** - Sole Developer and Visionary.*
