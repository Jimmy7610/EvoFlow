import { Router } from "express";

const router = Router();
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

router.get("/models", async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: `Failed to fetch models from Ollama: ${response.status} ${text}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Ollama route error";
    return res.status(500).json({ error: message });
  }
});

export default router;
