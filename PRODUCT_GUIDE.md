# EvoFlow AI Ops: The Professional Guide

Welcome to **EvoFlow AI Ops**, a specialized local-first AI workspace and assistent environment. This document provides a comprehensive overview of the platform, its intended use cases, and best practices for leveraging local machine learning models in your daily workflow.

---

## 1. Product Overview

EvoFlow AI Ops is far more than a simple chatbot; it is a **controlled, local-first AI operating environment**. Designed for professionals who require privacy, control, and a structured workspace, EvoFlow transforms your local compute power into a thoughtful partner for planning, brainstorming, and execution.

Unlike cloud-based services, EvoFlow operates entirely on your infrastructure using **Ollama**. This ensures that your private data, project briefs, and proprietary code never leave your machine. It is a persistent assistant platform where conversations are organized into focused sessions, allowing for long-term iteration on complex problems.

---

## 2. What EvoFlow AI Ops Is Designed For

EvoFlow is built for the "thinker" and the "builder." It excels in scenarios that require more than a single-turn response.

### Core Use Cases:
*   **Structured Planning**: Breaking down a vague project goal into concrete, actionable steps.
*   **Technical Problem Solving**: Iterating on code architecture, debugging logic, or exploring new library implementations.
*   **Content & Creative Strategy**: Brainstorming marketing angles, structuring articles, or refining brand voice.
*   **Prompt Engineering Lab**: Testing how different models respond to the same instructions to find the perfect prompt.
*   **Private Research**: Thinking through sensitive business or personal data without external exposure.

---

## 3. Core Concepts

### Local-First Intelligence
The system relies on your local **Ollama** installation. This means your experience is directly tied to the models you have installed. You have the flexibility to switch between lightweight, lightning-fast models for simple tasks and massive, high-parameter models for deep reasoning.

### Persistent Sessions
Every conversation in EvoFlow is a separate "Session." This allows you to maintain context for different projects simultaneously. A session for "Python API Refactor" stays distinct from "Marketing Plan Q3," ensuring context remains clean and retrieval is accurate.

### Dynamic Workflow Modes
EvoFlow supports two distinct ways of thinking:
1.  **Direct Mode**: A traditional, high-speed conversational style.
2.  **Multi-step Mode**: A more structured reasoning flow where the AI plans, executes, and reviews its own output before presenting it to you.

---

## 4. How to Use the App

### Step 1: Initiating a Session
Upon opening the app, create a **New Chat** or select an existing one from the sidebar. Give your sessions descriptive names to keep your workspace organized.

### Step 2: Choosing the Right Model
Before sending a message, select your model from the dropdown. 
*   **For fast questions** (e.g., "What is the syntax for a CSS grid?"): Use a smaller model like `phi3` or `llama3-8b`.
*   **For complex reasoning** (e.g., "Architecture this microservice cluster"): Use a larger model like `llama3-70b` or `command-r` if your hardware allows.

### Step 3: Selecting Your Mode
*   **Use Direct Mode** for quick Q&A, formatting tasks, or simple translations.
*   **Use Multi-step Mode** when you need the AI to "think before it speaks." This is ideal for multi-layered requests where a single-shot response might miss details.

### Step 4: Interacting with Streaming
EvoFlow uses **Progressive Streaming**. As the model generates its response, text will appear in real-time. This allows you to begin reading and evaluating the output immediately instead of waiting for a complete block of text.

---

## 5. Best Practices

To get the most out of EvoFlow AI Ops, adopt an **iterative mindset**:

*   **Provide Context Early**: Begin a session by explaining the role the AI should take (e.g., "You are a senior DevOps engineer focusing on security").
*   **Be Specific**: Instead of "Fix this code," try "Refactor this function to be more memory-efficient and add error handling."
*   **Iterate and Refine**: If the first answer isn't perfect, don't start over. Follow up with "Keep that, but change X to Y" or "Focus more on the security aspect of that answer."
*   **Segment Your Projects**: Don't put everything in one long chat. Create a new session for every new goal to keep the AI's "internal memory" sharp and relevant.

---

## 6. What to Expect from Local AI

Working with local models is fundamentally different from using GPT-4 or Claude over the cloud. 

*   **Hardware is King**: Your response speed (tokens per second) is determined by your CPU/GPU. 
*   **Varied Quality**: A 7B parameter model will be very fast but may struggle with highly abstract logic. A 70B model might be slower but will offer significantly better reasoning.
*   **Local Control**: You are the admin. You can update your models, delete history permanently, and work completely offline.
*   **Model Personalities**: Different models have different "personalities." If one model isn't giving you the tone you want, try another one via Ollama.

---

## 7. Current Capabilities

As of the current version, EvoFlow AI Ops supports:
*   ✅ **Ollama Integration**: Automated detection of your local model library.
*   ✅ **Local RAG (Document Flow)**: Drag-and-drop support for PDF/Text analysis per session.
*   ✅ **Battle Mode**: Side-by-side benchmarking of different LLM models.
*   ✅ **Advanced Session Management**: Full CRUD operations on your local chat history.
*   ✅ **Real-time Streaming**: Low-latency visual feedback for all model types.
*   ✅ **Language Consistency**: AI automatically matches the user's input language.
*   ✅ **Unified Runner**: A single command (`npm run dev`) to start the entire ecosystem.

---

## 8. Long-Term Vision

EvoFlow AI Ops is evolving from a কথোপকথন workspace into a **comprehensive AI Operating Environment**. Our future roadmap includes:

*   **Tool Execution**: Allowing the AI to run local scripts, search your filesystem, and interact with external APIs.
*   **Vector Memory (RAG)**: Drag-and-drop document support where the AI can "read" your local PDFs and folders to provide context-aware answers.
*   **Visual Logic**: Integrated support for local image generation and multi-modal analysis.
*   **Agentic Workflows**: Cross-session collaboration where different AI agents can hand off tasks to one another to reach a larger objective.

---

*EvoFlow AI Ops: Privacy, Performance, and Precision in the Age of Local AI.*
