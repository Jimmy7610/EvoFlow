
const API_URL = "http://localhost:4000/api";

async function verify() {
  console.log("--- EvoFlow System Verification ---");
  
  try {
    const resp = await fetch(`${API_URL}/sessions`);
    const data = await resp.json();
    console.log(`[API] Sessions Connectivity: ${data.success ? "OK" : "FAILED"}`);
    if (data.items) console.log(`[API] Session Count: ${data.items.length}`);
  } catch (e) {
    console.log(`[API] Connectivity: FAILED (${e.message})`);
  }

  try {
    const resp = await fetch("http://localhost:11434/api/tags");
    const data = await resp.json();
    console.log(`[Ollama] Connectivity: OK`);
    console.log(`[Ollama] Models: ${data.models.map(m => m.name).join(", ")}`);
  } catch (e) {
    console.log(`[Ollama] Connectivity: FAILED (${e.message})`);
  }

  console.log("--- Verification Complete ---");
}

verify();
