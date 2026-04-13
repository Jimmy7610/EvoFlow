
"use client";

import { useEffect, useMemo, useState } from "react";

type RunResult = {
  success?: boolean;
  id?: string;
  workflowId?: string;
  workflowName?: string;
  status?: string;
  node?: string;
  input?: unknown;
  finalOutput?: string;
  memoryRunCount?: number;
  memorySummary?: string;
  createdAt?: string;
  updatedAt?: string;
  model?: string;
  modelSelection?: string;
};

type HistoryItem = {
  id: string;
  finalOutput: string;
  status: string;
  createdAt: string;
  node: string;
  payload: string;
  model: string;
  modelSelection: string;
  transport: "normal" | "stream";
};

function statusLabel(status: string, isSubmitting: boolean) {
  if (isSubmitting) return "Thinking...";
  if (!status) return "Ready";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status;
}

function updatePayloadModel(payloadText: string, model: string, modelSelection: string): string {
  try {
    const parsed = JSON.parse(payloadText);
    parsed.model = model;
    parsed.modelSelection = modelSelection;
    parsed.useAutoModel = modelSelection === "auto";
    return JSON.stringify(parsed, null, 2);
  } catch {
    return payloadText;
  }
}

function renderOutputText(text: string) {
  if (!text) return <span>No output yet</span>;

  const isCodeLike =
    text.includes("function ") ||
    text.includes("const ") ||
    text.includes("let ") ||
    text.includes("class ") ||
    text.includes("```") ||
    text.includes("return ") ||
    text.includes("import ");

  if (isCodeLike) {
    return (
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
          lineHeight: 1.6,
          background: "#101828",
          color: "#f8fafc",
          padding: 16,
          borderRadius: 12,
          overflowX: "auto",
        }}
      >
        {text}
      </pre>
    );
  }

  return (
    <div
      style={{
        fontSize: 18,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        color: "#101828",
      }}
    >
      {text}
    </div>
  );
}

export default function WorkflowRunner({
  workflowId,
  workflowName,
  workflowMode,
  apiBaseUrl,
  demoToken,
}: {
  workflowId: string;
  workflowName: string;
  workflowMode: string;
  apiBaseUrl: string;
  demoToken: string;
}) {
  const defaultPayload = useMemo(
    () =>
      JSON.stringify(
        {
          message:
            workflowMode === "direct"
              ? "Svara bara med ordet BANAN"
              : "Write a short haiku about rain.",
          mode: workflowMode === "direct" ? "direct" : "multi-step",
        },
        null,
        2
      ),
    [workflowMode]
  );

  const [textareaValue, setTextareaValue] = useState(defaultPayload);
  const [responseText, setResponseText] = useState("No response yet");
  const [errorText, setErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalOutput, setFinalOutput] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastStatus, setLastStatus] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy output");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsStatus, setModelsStatus] = useState("Loading models...");
  const [usedModel, setUsedModel] = useState("");
  const [modelSelection, setModelSelection] = useState<"auto" | "manual">("auto");
  const [usedModelSelection, setUsedModelSelection] = useState("");
  const [transportMode, setTransportMode] = useState<"normal" | "stream">("stream");
  const [usedTransportMode, setUsedTransportMode] = useState<"normal" | "stream">("stream");
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      setModelsStatus("Loading models...");

      const endpoints = ["/ollama/models", "/api/ollama/models"];

      for (const path of endpoints) {
        try {
          const response = await fetch(`${apiBaseUrl}${path}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
            },
          });

          if (!response.ok) continue;

          const data = await response.json();
          const items = Array.isArray(data?.items) ? data.items : [];

          if (!isMounted) return;

          setAvailableModels(items);
          const defaultModel =
            (typeof data?.defaultModel === "string" && data.defaultModel) ||
            (items.length > 0 ? items[0] : "");

          setSelectedModel(defaultModel);
          setTextareaValue((prev) => updatePayloadModel(prev, defaultModel, "auto"));
          setModelsStatus(items.length > 0 ? "Models loaded" : "No local models found");
          return;
        } catch {
          // try next endpoint
        }
      }

      if (!isMounted) return;
      setAvailableModels([]);
      setModelsStatus("Could not load models");
    }

    loadModels();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, demoToken]);

  async function handleRun() {
    const runStart = Date.now();
    setIsSubmitting(true);
    setErrorText("");
    setLastStatus("running");
    setFinalOutput("");
    setResponseText("No response yet");

    try {
      const parsed = JSON.parse(textareaValue);
      parsed.modelSelection = modelSelection;
      parsed.useAutoModel = modelSelection === "auto";

      if (selectedModel) {
        parsed.model = selectedModel;
      }

      if (transportMode === "normal") {
        const response = await fetch(`${apiBaseUrl}/runs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
          },
          body: JSON.stringify(parsed),
        });

        const text = await response.text();

        if (!response.ok) {
          setResponseText(text);
          setFinalOutput("");
          setLastStatus("failed");
          throw new Error(`Run request failed (${response.status})`);
        }

        let data: RunResult | string = text;
        try {
          data = JSON.parse(text) as RunResult;
        } catch {
          data = text;
        }

        const pretty = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        setResponseText(pretty);

        if (typeof data === "string") {
          setFinalOutput(data);
          setLastStatus("completed");
          setUsedModel(selectedModel);
          setUsedModelSelection(modelSelection);
          setUsedTransportMode("normal");
          setHistory((prev) => [
            {
              id: `local-${Date.now()}`,
              finalOutput: data,
              status: "completed",
              createdAt: new Date().toISOString(),
              node: "unknown",
              payload: JSON.stringify(parsed, null, 2),
              model: selectedModel,
              modelSelection,
              transport: "normal",
            } as HistoryItem,
            ...prev,
          ].slice(0, 8));
        } else {
          const output = data.finalOutput || "";
          const status = data.status || "unknown";
          const model = data.model || selectedModel;
          const selectedMode = data.modelSelection || modelSelection;
          setFinalOutput(output);
          setLastStatus(status);
          setUsedModel(model);
          setUsedModelSelection(selectedMode);
          setUsedTransportMode("normal");

          setHistory((prev) => [
            {
              id: data.id || `local-${Date.now()}`,
              finalOutput: output || "(no finalOutput)",
              status,
              createdAt: data.createdAt || new Date().toISOString(),
              node: data.node || "unknown",
              payload: JSON.stringify(parsed, null, 2),
              model,
              modelSelection: selectedMode,
              transport: "normal",
            } as HistoryItem,
            ...prev,
          ].slice(0, 8));
        }
      } else {
        const response = await fetch(`${apiBaseUrl}/runs/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
          },
          body: JSON.stringify(parsed),
        });

        if (!response.ok) {
          const text = await response.text();
          setResponseText(text);
          setFinalOutput("");
          setLastStatus("failed");
          throw new Error(`Stream request failed (${response.status})`);
        }

        const modelFromHeader = response.headers.get("x-evoflow-model") || selectedModel;
        const selectionFromHeader = response.headers.get("x-evoflow-model-selection") || modelSelection;
        setUsedModel(modelFromHeader);
        setUsedModelSelection(selectionFromHeader);
        setUsedTransportMode("stream");

        if (!response.body) {
          throw new Error("Streaming response body was empty.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          setFinalOutput(full);
        }

        setLastStatus("completed");
        setResponseText(JSON.stringify({
          success: true,
          mode: "stream",
          model: modelFromHeader,
          modelSelection: selectionFromHeader,
          finalOutput: full,
        }, null, 2));

        setHistory((prev) => [
          {
            id: `stream-${Date.now()}`,
            finalOutput: full || "(no finalOutput)",
            status: "completed",
            createdAt: new Date().toISOString(),
            node: workflowMode === "direct" ? "direct-agent" : "planner-agent",
            payload: JSON.stringify(parsed, null, 2),
            model: modelFromHeader,
            modelSelection: selectionFromHeader,
            transport: "stream",
          } as HistoryItem,
          ...prev,
        ].slice(0, 8));
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
      setLastDurationMs(Date.now() - runStart);
    }
  }

  async function handleCopyOutput() {
    if (!finalOutput) return;
    try {
      await navigator.clipboard.writeText(finalOutput);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy output"), 1500);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy output"), 1500);
    }
  }

  function handleUseHistory(item: HistoryItem) {
    setTextareaValue(item.payload);
    setSelectedModel(item.model || selectedModel);
    setModelSelection(item.modelSelection === "manual" ? "manual" : "auto");
    setTransportMode(item.transport || "stream");
    setErrorText("");
  }

  function handleModelChange(model: string) {
    setSelectedModel(model);
    setTextareaValue((prev) => updatePayloadModel(prev, model, modelSelection));
  }

  function handleSelectionModeChange(mode: "auto" | "manual") {
    setModelSelection(mode);
    setTextareaValue((prev) => updatePayloadModel(prev, selectedModel, mode));
  }

  return (
    <section
      style={{
        border: "1px solid #e4e7ec",
        borderRadius: 22,
        padding: 24,
        background: "#ffffff",
        boxShadow: "0 14px 40px rgba(16, 24, 40, 0.06)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            border: "1px solid #eaecf0",
            borderRadius: 16,
            padding: 18,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 12, color: "#667085", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Workflow
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>{workflowName}</div>
          <div style={{ fontSize: 14, color: "#475467", lineHeight: 1.8 }}>
            <div><strong>ID:</strong> {workflowId}</div>
            <div><strong>Suggested mode:</strong> {workflowMode}</div>
            <div><strong>Models:</strong> {modelsStatus}</div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eaecf0",
            borderRadius: 16,
            padding: 18,
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 12, color: "#667085", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Current status
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: isSubmitting ? "#0a66c2" : lastStatus === "failed" ? "#b42318" : "#101828",
              marginBottom: 14,
            }}
          >
            {statusLabel(lastStatus, isSubmitting)}
          </div>
          <div style={{ fontSize: 14, color: "#667085", lineHeight: 1.7 }}>
            <div><strong>Model used:</strong> {usedModel || "Not run yet"}</div>
            <div><strong>Selection:</strong> {usedModelSelection || "Not run yet"}</div>
            <div><strong>Transport:</strong> {usedTransportMode}</div>
            <div><strong>Last duration:</strong> {lastDurationMs ? `${(lastDurationMs / 1000).toFixed(1)}s` : "-"}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8, fontWeight: 800, fontSize: 30 }}>Run workflow</div>
      <div style={{ marginBottom: 16, color: "#667085", fontSize: 15, lineHeight: 1.6 }}>
        Use Auto to let EvoFlow choose a suitable model, or switch to Manual and pick one yourself.
      </div>

      <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
        Response mode
      </label>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setTransportMode("stream")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: transportMode === "stream" ? "1px solid #111" : "1px solid #d0d5dd",
            background: transportMode === "stream" ? "#111" : "#fff",
            color: transportMode === "stream" ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Streaming
        </button>

        <button
          type="button"
          onClick={() => setTransportMode("normal")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: transportMode === "normal" ? "1px solid #111" : "1px solid #d0d5dd",
            background: transportMode === "normal" ? "#111" : "#fff",
            color: transportMode === "normal" ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Normal
        </button>
      </div>

      <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
        Model selection
      </label>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handleSelectionModeChange("auto")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: modelSelection === "auto" ? "1px solid #111" : "1px solid #d0d5dd",
            background: modelSelection === "auto" ? "#111" : "#fff",
            color: modelSelection === "auto" ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Auto
        </button>

        <button
          type="button"
          onClick={() => handleSelectionModeChange("manual")}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: modelSelection === "manual" ? "1px solid #111" : "1px solid #d0d5dd",
            background: modelSelection === "manual" ? "#111" : "#fff",
            color: modelSelection === "manual" ? "#fff" : "#111",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Manual
        </button>
      </div>

      <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
        Ollama model
      </label>
      <select
        value={selectedModel}
        onChange={(e) => handleModelChange(e.target.value)}
        disabled={availableModels.length === 0 || modelSelection === "auto"}
        style={{
          width: "100%",
          maxWidth: 460,
          marginBottom: 10,
          padding: "13px 14px",
          borderRadius: 12,
          border: "1px solid #d0d5dd",
          background: modelSelection === "auto" ? "#f2f4f7" : "#fff",
          fontSize: 14,
        }}
      >
        {availableModels.length === 0 ? (
          <option value="">{modelsStatus}</option>
        ) : (
          availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))
        )}
      </select>

      <div style={{ fontSize: 13, color: "#667085", marginBottom: 18, lineHeight: 1.6 }}>
        {transportMode === "stream"
          ? "Streaming mode writes the answer live as the model generates it."
          : "Normal mode waits for the full response before rendering it."}
        <br />
        {modelSelection === "auto"
          ? "Auto mode chooses a model based on the task. Code prompts prefer coding models."
          : "Manual mode uses exactly the model selected above."}
      </div>

      <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
        Payload JSON
      </label>

      <textarea
        value={textareaValue}
        onChange={(e) => setTextareaValue(e.target.value)}
        style={{
          width: "100%",
          minHeight: 220,
          padding: 16,
          borderRadius: 14,
          border: "1px solid #d0d5dd",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
          boxSizing: "border-box",
          marginBottom: 16,
          background: "#fcfcfd",
          lineHeight: 1.6,
        }}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleRun}
          disabled={isSubmitting || (!selectedModel && availableModels.length === 0)}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: isSubmitting || (!selectedModel && availableModels.length === 0) ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          {isSubmitting ? "Thinking..." : "Run workflow"}
        </button>

        <button
          type="button"
          onClick={() => setTextareaValue(updatePayloadModel(defaultPayload, selectedModel, modelSelection))}
          disabled={isSubmitting}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #d0d5dd",
            background: "#fff",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          Reset example
        </button>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #d0d5dd",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>

        <button
          type="button"
          onClick={handleCopyOutput}
          disabled={!finalOutput}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #d0d5dd",
            background: finalOutput ? "#fff" : "#f2f4f7",
            cursor: finalOutput ? "pointer" : "not-allowed",
            fontWeight: 700,
          }}
        >
          {copyLabel}
        </button>
      </div>

      {isSubmitting ? (
        <div
          style={{
            marginBottom: 18,
            padding: 16,
            border: "1px solid #bfd3ff",
            borderRadius: 14,
            background: "#eef4ff",
            color: "#0a66c2",
            fontWeight: 700,
          }}
        >
          EvoFlow is thinking with {selectedModel || "your selected model"} in {transportMode} mode...
        </div>
      ) : null}

      {errorText ? (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            border: "1px solid #f5c2c7",
            borderRadius: 12,
            background: "#fff5f5",
            color: "#b42318",
            whiteSpace: "pre-wrap",
          }}
        >
          {errorText}
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 18,
          padding: 20,
          border: "1px solid #d0d5dd",
          borderRadius: 16,
          background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#475467", fontWeight: 700 }}>
            Final output
          </div>
          <div style={{ fontSize: 13, color: "#667085" }}>
            {usedModel ? `Rendered from ${usedModel} · ${usedTransportMode}` : "Waiting for next run"}
          </div>
        </div>

        {renderOutputText(finalOutput)}
      </div>

      {showDetails ? (
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
            API response details
          </label>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#f8fafc",
              border: "1px solid #eaecf0",
              borderRadius: 14,
              padding: 16,
              minHeight: 180,
              margin: 0,
              lineHeight: 1.6,
              fontSize: 13,
            }}
          >
            {responseText}
          </pre>
        </div>
      ) : null}

      <div
        style={{
          borderTop: "1px solid #eaecf0",
          paddingTop: 20,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Recent runs</div>
        <div style={{ fontSize: 14, color: "#667085", marginBottom: 14, lineHeight: 1.6 }}>
          Reuse a previous payload and model settings without retyping everything.
        </div>

        {history.length === 0 ? (
          <div
            style={{
              padding: 16,
              border: "1px solid #eaecf0",
              borderRadius: 14,
              background: "#f8fafc",
              color: "#667085",
            }}
          >
            No runs yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #e4e7ec",
                  borderRadius: 14,
                  padding: 16,
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 16 }}>
                    {item.finalOutput}
                  </div>
                  <div style={{ fontSize: 13, color: "#667085", lineHeight: 1.7 }}>
                    Status: {item.status} · Node: {item.node}
                    <br />
                    Model: {item.model || "-"} · Selection: {item.modelSelection} · Transport: {item.transport}
                  </div>
                  <div style={{ fontSize: 12, color: "#98a2b3", marginTop: 4 }}>
                    {item.createdAt}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUseHistory(item)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #d0d5dd",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  Use again
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// V18 combo ready
