
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
  modelSelection?: string;
  transport?: "normal" | "stream";
};

type Session = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workflowMode: "direct" | "multi-step";
  model: string;
  modelSelection: "auto" | "manual";
  transport: "normal" | "stream";
  messages: Message[];
  documents: ChatDocument[];
};

type ChatDocument = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
};

type ModelsResponse = {
  items?: string[];
  defaultModel?: string;
};

type DevControlItem = {
  label: string;
  running: boolean;
  managed: boolean;
  port?: number;
  pid?: number | null;
  startedAt?: string;
  cwd?: string;
  command?: string;
  lastError?: string;
};

type DevStatusResponse = {
  success?: boolean;
  controls?: {
    api?: DevControlItem;
    web?: DevControlItem;
    executor?: DevControlItem;
  };
  error?: string;
};

type AgentRole = "assistant" | "planner" | "executor" | "system" | "critic";

const STORAGE_KEY = "evoflow-chat-sessions-v1";
const EXPORT_FILE_PREFIX = "evoflow-chat-export";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTitle(input: string) {
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed || "New chat";
}

function createEmptySession(defaultModel: string): Session {
  const now = new Date().toISOString();
  return {
    id: uid("session"),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    workflowMode: "multi-step",
    model: defaultModel,
    modelSelection: "auto",
    transport: "stream",
    messages: [],
    documents: [],
  };
}

function loadSessions(defaultModel: string): Session[] {
  if (typeof window === "undefined") return [createEmptySession(defaultModel)];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createEmptySession(defaultModel)];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createEmptySession(defaultModel)];
    }
    return parsed as Session[];
  } catch {
    return [createEmptySession(defaultModel)];
  }
}

function saveSessions(sessions: Session[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

async function fetchModels(apiBaseUrl: string, demoToken: string): Promise<{ models: string[]; defaultModel: string }> {
  const endpoints = ["/ollama/models", "/api/ollama/models"];

  for (const path of endpoints) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
      },
    });

    if (!response.ok) continue;
    const data = (await response.json()) as ModelsResponse;
    const models = Array.isArray(data.items) ? data.items : [];
    const defaultModel = (typeof data.defaultModel === "string" && data.defaultModel) || models[0] || "";
    return { models, defaultModel };
  }

  return { models: [], defaultModel: "" };
}

function detectAgentRole(content: string): AgentRole {
  const normalized = (content || "").trim().toLowerCase();
  if (normalized.startsWith("[planner]") || normalized.startsWith("planner:")) return "planner";
  if (normalized.startsWith("[executor]") || normalized.startsWith("executor:")) return "executor";
  if (normalized.startsWith("[system]") || normalized.startsWith("system:")) return "system";
  if (normalized.startsWith("[critic]") || normalized.startsWith("critic:")) return "critic";
  return "assistant";
}

function getAgentPresentation(role: AgentRole) {
  switch (role) {
    case "planner":
      return { label: "Planner", accent: "#7c3aed" };
    case "executor":
      return { label: "Executor", accent: "#2563eb" };
    case "system":
      return { label: "System", accent: "#0f766e" };
    case "critic":
      return { label: "Critic", accent: "#b45309" };
    default:
      return { label: "EvoFlow AI", accent: "#475467" };
  }
}

function createExportPayload(sessions: Session[]) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "EvoFlow AI Ops",
    sessions,
  };
}

function normalizeImportedSessions(payload: unknown, defaultModel: string): Session[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { sessions?: unknown[] }).sessions)
      ? (payload as { sessions: unknown[] }).sessions
      : [];

  return source.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const raw = item as Partial<Session> & { messages?: Partial<Message>[] };
    const now = new Date().toISOString();
    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .filter((message) => message && typeof message === "object")
          .map((message) => ({
            id: uid("message"),
            role: message?.role === "assistant" ? "assistant" : "user",
            content: typeof message?.content === "string" ? message.content : "",
            createdAt: typeof message?.createdAt === "string" ? message.createdAt : now,
            model: typeof message?.model === "string" ? message.model : raw.model || defaultModel,
            modelSelection: message?.modelSelection === "manual" ? "manual" : "auto",
            transport: message?.transport === "normal" ? "normal" : "stream",
          }))
      : [];

    return [{
      id: uid("session"),
      title: typeof raw.title === "string" ? formatTitle(raw.title) : "Imported chat",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
      updatedAt: now,
      workflowMode: raw.workflowMode === "direct" ? "direct" : "multi-step",
      model: raw.model || defaultModel,
      modelSelection: raw.modelSelection === "manual" ? "manual" : "auto",
      transport: raw.transport === "normal" ? "normal" : "stream",
      messages,
      documents: Array.isArray(raw.documents) ? raw.documents : [],
    }];
  });
}


function detectCodeLanguage(code: string) {
  const source = code.toLowerCase();
  if (source.includes("function ") || source.includes("interface ") || source.includes(": string") || source.includes("typescript")) return "typescript";
  if (source.includes("const ") || source.includes("let ") || source.includes("=>") || source.includes("javascript")) return "javascript";
  if (source.includes("def ") || source.includes("print(") || source.includes("python")) return "python";
  if (source.includes("<div") || source.includes("</")) return "html";
  return "code";
}

function RichMessageContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }

  const normalized = content || "";
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  const blocks: Array<{ type: "text" | "code"; value: string; language?: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: "text", value: normalized.slice(lastIndex, match.index) });
    }
    blocks.push({
      type: "code",
      language: match[1] || detectCodeLanguage(match[2] || ""),
      value: match[2] || "",
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    blocks.push({ type: "text", value: normalized.slice(lastIndex) });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", value: normalized });
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <div
              key={`code-${index}`}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                overflow: "hidden",
                background: "#0b1220",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#111827",
                  color: "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                <span>{block.language || "code"}</span>
                <button
                  type="button"
                  onClick={() => copyText(block.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Copy code
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "6px 10px",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12.5,
                  lineHeight: 1.4,
                  color: "#f8fafc",
                }}
              >
                {block.value}
              </pre>
            </div>
          );
        }

        const lines = block.value.split("\n");
        return (
          <div key={`text-${index}`} style={{ display: "grid", gap: 4 }}>
            {lines.map((line, lineIndex) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={`spacer-${lineIndex}`} style={{ height: 2 }} />;
              if (trimmed.startsWith("### ")) return <h3 key={lineIndex} style={{ margin: 0, fontSize: 17 }}>{trimmed.slice(4)}</h3>;
              if (trimmed.startsWith("## ")) return <h2 key={lineIndex} style={{ margin: 0, fontSize: 19 }}>{trimmed.slice(3)}</h2>;
              if (trimmed.startsWith("# ")) return <h1 key={lineIndex} style={{ margin: 0, fontSize: 20 }}>{trimmed.slice(2)}</h1>;
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIndex} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 800 }}>•</span>
                    <span>{trimmed.slice(2)}</span>
                  </div>
                );
              }
              if (/^\d+\.\s/.test(trimmed)) {
                const firstDot = trimmed.indexOf(".");
                return (
                  <div key={lineIndex} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 800 }}>{trimmed.slice(0, firstDot + 1)}</span>
                    <span>{trimmed.slice(firstDot + 2)}</span>
                  </div>
                );
              }
              return (
                <p key={lineIndex} style={{ margin: 0, lineHeight: 1.4 }}>
                  {line}
                  {isStreaming && index === blocks.length - 1 && lineIndex === lines.length - 1 ? (
                    <span style={{ marginLeft: 2, animation: "blink 1s step-end infinite" }}>▌</span>
                  ) : null}
                </p>
              );
            })}
          </div>
        );
      })}

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default function ChatClient() {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
  const demoToken = process.env.NEXT_PUBLIC_DEMO_TOKEN || "";

  const [models, setModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  useEffect(() => {
    // Lock body scroll for the fixed dashboard feel
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [input, setInput] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [agentViewEnabled, setAgentViewEnabled] = useState(true);
  const [devStatus, setDevStatus] = useState<DevStatusResponse["controls"] | null>(null);
  const [isDevActionLoading, setIsDevActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: "info" | "success" | "error" }[]>([]);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewDocData, setPreviewDocData] = useState<any | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonModel, setComparisonModel] = useState<string>("");
  const [comparisonMessages, setComparisonMessages] = useState<Message[]>([]);
  const [isComparisonSending, setIsComparisonSending] = useState(false);

  const addNotification = (message: string, type: "info" | "success" | "error" = "info") => {
    const id = uid("note");
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };
  const [devErrorText, setDevErrorText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const isDark = theme === "dark";
  const ui = {
    pageBg: isDark ? "radial-gradient(circle at top left, rgba(37,99,235,0.22), transparent 28%), radial-gradient(circle at top right, rgba(124,58,237,0.16), transparent 24%), linear-gradient(180deg, #07111f 0%, #0b1220 52%, #111827 100%)" : "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    pageBorder: isDark ? "rgba(148,163,184,0.16)" : "#d8dee8",
    panelBg: isDark ? "rgba(10,18,34,0.76)" : "rgba(255,255,255,0.94)",
    panelBorder: isDark ? "rgba(96,165,250,0.16)" : "#d8dee8",
    text: isDark ? "#f8fafc" : "#101828",
    muted: isDark ? "#a5b4cf" : "#475467",
    subtle: isDark ? "#8ea3c5" : "#667085",
    controlBg: isDark ? "rgba(15,23,42,0.9)" : "#ffffff",
    controlBorder: isDark ? "rgba(96,165,250,0.16)" : "#d0d5dd",
    chatCanvas: isDark ? "linear-gradient(180deg, rgba(7,17,31,0.84) 0%, rgba(10,18,34,0.92) 100%)" : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    userBubble: isDark ? "linear-gradient(180deg, #020617 0%, #0f172a 100%)" : "#111827",
    assistantBubble: isDark ? "rgba(15,23,42,0.94)" : "#ffffff",
    assistantBorder: isDark ? "rgba(96,165,250,0.14)" : "#e4e7ec",
    actionBg: isDark ? "rgba(9,16,30,0.92)" : "#ffffff",
    actionText: isDark ? "#e2e8f0" : "#101828",
    accent: "#60a5fa",
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setIsLoadingModels(true);
      const result = await fetchModels(apiBaseUrl, demoToken);
      if (!isMounted) return;

      setModels(result.models);
      setDefaultModel(result.defaultModel);
      setComparisonModel(result.defaultModel);

      // 1. Fetch from server
      let serverSessions: Session[] = [];
      try {
        const resp = await fetch(`${apiBaseUrl}/api/sessions`);
        const data = await resp.json();
        if (data.success && Array.isArray(data.items)) {
          serverSessions = data.items.map((s: any) => ({
             ...s,
             messages: s.messages || [],
             documents: s.documents || []
          }));
        }
      } catch (e) {
        console.error("Failed to fetch server sessions", e);
      }

      // 2. Synchronization logic
      const localSessions = loadSessions(result.defaultModel);
      
      if (serverSessions.length > 0) {
        // If server has data, use it as the source of truth
        setSessions(serverSessions);
        setActiveSessionId(serverSessions[0].id);
      } else if (localSessions.length > 0 && localSessions[0].title !== "New chat") {
        // Only migrate if server is empty but local has meaningful data
        console.log("Migrating local sessions to server...");
        setSessions(localSessions);
        setActiveSessionId(localSessions[0].id);
      } else {
        // Fallback to empty state
        setSessions(serverSessions.length > 0 ? serverSessions : (localSessions.length > 0 ? localSessions : [createEmptySession(result.defaultModel)]));
        setActiveSessionId(serverSessions[0]?.id || localSessions[0]?.id || "");
      }
      
      setIsLoadingModels(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, demoToken]);

  // Disable automatic localStorage saving as we move to SQL
  // useEffect(() => {
  //   if (sessions.length > 0) saveSessions(sessions);
  // }, [sessions]);

  useEffect(() => {
    refreshDevStatus();
    const timer = window.setInterval(() => {
      refreshDevStatus();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [apiBaseUrl, demoToken]);



  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  function patchSession(sessionId: string, updater: (session: Session) => Session) {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)));
  }

  function startRenameSession(sessionId: string, currentTitle: string) {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  }

  function cancelRenameSession() {
    setEditingSessionId("");
    setEditingTitle("");
  }

  async function handleSaveRename(sessionId: string) {
    const nextTitle = formatTitle(editingTitle);
    patchSession(sessionId, (session) => ({
      ...session,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    }));
    cancelRenameSession();

    try {
      await fetch(`${apiBaseUrl}/api/sessions/${sessionId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
    } catch (e) {
      console.error("Failed to sync rename to server", e);
    }
  }

  function handleExportChats() {
    const payload = createExportPayload(sessions);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${EXPORT_FILE_PREFIX}-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = normalizeImportedSessions(parsed, defaultModel);

      if (imported.length === 0) {
        setErrorText("Import failed: no valid chat sessions were found in the selected file.");
        return;
      }

      setSessions((prev) => [...imported, ...prev]);
      setActiveSessionId(imported[0].id);
      cancelRenameSession();
      setErrorText("");
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setErrorText(`Import failed: ${text}`);
    }
  }

  async function copyWholeMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  }

  const handleDocumentPreview = async (docId: string) => {
    setPreviewDocId(docId);
    setPreviewDocData(null);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/documents/${docId}`);
      const data = await resp.json();
      if (data.success) {
        setPreviewDocData(data.item);
      } else {
        addNotification("Failed to load document content", "error");
      }
    } catch (e) {
      addNotification("Network error loading document", "error");
    }
  };

  const handleExportMarkdown = () => {
    if (!activeSession) return;
    const date = new Date().toLocaleDateString();
    let md = `# EvoFlow Session: ${activeSession.title}\n\n`;
    md += `**Date:** ${date}\n`;
    md += `**Model:** ${activeSession.model} (${activeSession.workflowMode} mode)\n\n`;
    
    if (activeSession.documents && activeSession.documents.length > 0) {
      md += `## Attached Context\n`;
      activeSession.documents.forEach(d => {
        md += `- ${d.name} (${d.type})\n`;
      });
      md += `\n---\n\n`;
    }

    activeSession.messages.forEach(m => {
      md += `### ${m.role === 'user' ? 'USER' : 'ASSISTANT'}\n`;
      if (m.model) md += `*Model: ${m.model}*\n\n`;
      md += `${m.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.title.replace(/\s+/g, '_').toLowerCase()}_export.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addNotification("Session exported to Markdown", "success");
  };

  const docInputRef = useRef<HTMLInputElement|null>(null);

  async function handleDocumentUpload(file: File) {
    if (!activeSession) return;
    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (data.success && data.document) {
        patchSession(activeSession.id, (s) => ({
          ...s,
          documents: [...(s.documents || []), data.document],
        }));
        addNotification(`Uploaded ${file.name}`, "success");
      }
    } catch (e) {
      console.error("Document upload failed", e);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!activeSession) return;
    if (!window.confirm("Remove this document from the session?")) return;

    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/documents/${docId}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (data.success) {
        patchSession(activeSession.id, (s) => ({
          ...s,
          documents: (s.documents || []).filter(d => d.id !== docId),
        }));
      }
    } catch (e) {
      console.error("Document deletion failed", e);
    }
  }

  async function handleCreateSession() {
    const fresh = createEmptySession(defaultModel);
    // Optimistic UI
    setSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setInput("");
    setErrorText("");

    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fresh.title,
          model: fresh.model,
          transport: fresh.transport,
          workflowMode: fresh.workflowMode,
        }),
      });
      const data = await resp.json();
      if (data.success && data.session) {
        // Update the optimistic ID with the server ID
        setSessions((prev) => prev.map(s => s.id === fresh.id ? { ...s, id: data.session.id } : s));
        setActiveSessionId(data.session.id);
      }
    } catch (e) {
      console.error("Failed to create session on server", e);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!window.confirm("Delete this session?")) return;
    
    if (editingSessionId === sessionId) {
      cancelRenameSession();
    }

    // Try API first or optimistic
    try {
      await fetch(`${apiBaseUrl}/api/sessions/${sessionId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete session on server", e);
    }

    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== sessionId);
      if (next.length === 0) {
        // We'll let the user create a new one or auto-create
        const fallback = createEmptySession(defaultModel);
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(next[0].id);
      }
      return next;
    });
  }


  async function refreshDevStatus() {
    try {
      const response = await fetch(`${apiBaseUrl}/dev/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
        },
      });

      const data = (await response.json()) as DevStatusResponse;
      if (!response.ok) {
        throw new Error(data?.error || `Status request failed (${response.status})`);
      }

      setDevStatus(data.controls || null);
      setDevErrorText("");
    } catch (error) {
      setDevErrorText(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleDevControl(action: "start" | "stop") {
    try {
      setIsDevActionLoading(true);

      const response = await fetch(`${apiBaseUrl}/dev/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
        },
      });

      const data = (await response.json()) as DevStatusResponse;
      if (!response.ok) {
        throw new Error(data?.error || `${action} request failed (${response.status})`);
      }

      setDevStatus(data.controls || null);
      setDevErrorText("");
    } catch (error) {
      setDevErrorText(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDevActionLoading(false);
    }
  }

  function updateActiveSessionField<K extends keyof Session>(field: K, value: Session[K]) {
    if (!activeSession) return;
    patchSession(activeSession.id, (session) => ({
      ...session,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  // Handle scroll events to detect if user is near bottom
  const handleSendComparison = async (message: string) => {
    if (!activeSession) return;
    setIsComparisonSending(true);
    const tempId = uid("msg");
    const newMsg: Message = {
      id: tempId,
      sessionId: activeSession.id,
      role: "assistant",
      content: "",
      model: comparisonModel,
      createdAt: new Date().toISOString(),
    };
    setComparisonMessages((prev) => [...prev, newMsg]);

    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: activeSession.id,
          workflowMode: activeSession.workflowMode,
          modelSelection: "manual",
          model: comparisonModel,
          transport: "stream",
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Comparison request failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        full += chunk;
        setComparisonMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, content: full } : m))
        );
      }
    } catch (e) {
      addNotification("Comparison model failed", "error");
    } finally {
      setIsComparisonSending(false);
    }
  };
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShouldAutoScroll(isAtBottom);
  };

  // Smart auto-scroll effect
  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeSession?.messages, shouldAutoScroll]);

  async function handleSend() {
    if (!activeSession || !input.trim() || isSending) return;

    const userText = input.trim();
    if (isComparisonMode) {
      handleSendComparison(userText);
    }
    const now = new Date().toISOString();
    const userMessage: Message = {
      id: uid("user"),
      role: "user",
      content: userText,
      createdAt: now,
      model: activeSession.model,
      modelSelection: activeSession.modelSelection,
      transport: activeSession.transport,
    };

    const assistantId = uid("assistant");
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: now,
      model: activeSession.model,
      modelSelection: activeSession.modelSelection,
      transport: activeSession.transport,
    };

    patchSession(activeSession.id, (session) => ({
      ...session,
      title: session.messages.length === 0 ? formatTitle(userText) : session.title,
      updatedAt: now,
      messages: [...session.messages, userMessage, assistantMessage],
    }));

    setInput("");
    setErrorText("");
    setIsSending(true);
    setShouldAutoScroll(true); // Always scroll on new user message

    // Sync User Message to DB
    fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        content: userText,
        model: userMessage.model,
        transport: userMessage.transport,
        modelSelection: userMessage.modelSelection,
      }),
    }).catch(e => console.error("Failed to sync user message", e));

    try {
      const conversation = activeSession.messages
        .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
        .join("\n\n");

      const prompt = conversation
        ? `${conversation}\n\nUser: ${userText}\n\nAssistant:`
        : userText;

      const payload = {
        message: prompt,
        mode: activeSession.workflowMode,
        model: activeSession.model,
        modelSelection: activeSession.modelSelection,
        sessionId: activeSession.id,
      };

      if (activeSession.transport === "stream") {
        const response = await fetch(`${apiBaseUrl}/runs/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
          const text = await response.text();
          throw new Error(text || `Stream request failed (${response.status})`);
        }

        const modelFromHeader = response.headers.get("x-evoflow-model") || activeSession.model;
        const selectionFromHeader = (response.headers.get("x-evoflow-model-selection") as "auto" | "manual" | "default") || activeSession.modelSelection;

        patchSession(activeSession.id, (session) => ({
          ...session,
          model: modelFromHeader,
          modelSelection: selectionFromHeader === "default" ? "manual" : selectionFromHeader,
        }));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;

          patchSession(activeSession.id, (session) => ({
            ...session,
            updatedAt: new Date().toISOString(),
            messages: session.messages.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: full,
                    model: modelFromHeader,
                    modelSelection: selectionFromHeader,
                    transport: "stream",
                  }
                : message
            ),
          }));
        }

        // Sync Assistant Message to DB (Streaming complete)
        fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: full,
            model: modelFromHeader,
            transport: "stream",
            modelSelection: selectionFromHeader,
          }),
        }).catch(e => console.error("Failed to sync assistant message", e));
      } else {
        const response = await fetch(`${apiBaseUrl}/runs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        if (!response.ok) throw new Error(text || `Request failed (${response.status})`);

        let parsed: { finalOutput?: string; model?: string; modelSelection?: string } | null = null;
        try {
          parsed = JSON.parse(text) as { finalOutput?: string; model?: string; modelSelection?: string };
        } catch {
          parsed = { finalOutput: text };
        }

        const output = parsed?.finalOutput || text;
        const model = parsed?.model || activeSession.model;
        const selection = (parsed?.modelSelection as "auto" | "manual" | "default" | undefined) || activeSession.modelSelection;

        patchSession(activeSession.id, (session) => ({
          ...session,
          model,
          modelSelection: selection === "default" ? "manual" : selection,
          updatedAt: new Date().toISOString(),
          messages: session.messages.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: output,
                  model,
                  modelSelection: selection,
                  transport: "normal",
                }
              : message
          ),
        }));

        // Sync Assistant Message to DB (Normal complete)
        fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: output,
            model,
            transport: "normal",
            modelSelection: selection,
          }),
        }).catch(e => console.error("Failed to sync assistant message", e));
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setErrorText(text);

      patchSession(activeSession.id, (session) => ({
        ...session,
        updatedAt: new Date().toISOString(),
        messages: session.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: `[error] ${text}`,
              }
            : message
        ),
      }));
    } finally {
      setIsSending(false);
    }
  }


  if (isLoadingModels) {
    return (
      <main style={{ width: "100%", padding: "0", margin: 0, color: ui.text, overflowX: "hidden" }}>
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>EvoFlow Chat</h1>
        <div>Loading local Ollama models...</div>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        maxWidth: "1800px",
        margin: "0 auto",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        background: ui.pageBg,
        color: ui.text,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          zIndex: 100,
          background: isDark ? "rgba(10, 20, 35, 0.82)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(18px)",
          margin: "0 0 10px 0",
          padding: "8px 16px",
          borderRadius: 16,
          border: `1px solid ${ui.panelBorder}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 14, flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.0, letterSpacing: -0.4, margin: 0, color: ui.text }}>EvoFlow Chat</h1>
            <nav style={{ display: "flex", gap: 12, fontSize: 13, fontWeight: 600 }}>
              <Link href="/" style={{ color: ui.accent, textDecoration: "none", opacity: 0.65 }}>Dashboard</Link>
              <Link href="/workflows" style={{ color: ui.accent, textDecoration: "none", opacity: 0.65 }}>Workflows</Link>
              <Link href="/chat" style={{ color: ui.text, textDecoration: "none", fontWeight: 700 }}>Chat</Link>
            </nav>
          </div>
          <div style={{ color: ui.subtle, marginTop: 4, fontSize: 11, fontWeight: 500, opacity: 0.6 }}>
            Local Ollama mode · Multi-step & Streaming · Obsidian 2.0
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", padding: "4px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)", border: `1px solid ${ui.panelBorder}` }}>
          <button
            type="button"
            onClick={() => handleDevControl("start")}
            disabled={isDevActionLoading}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${ui.controlBorder}`,
              background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
              color: "#ffffff",
              cursor: isDevActionLoading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {isDevActionLoading ? "Working..." : "Start"}
          </button>

          <button
            type="button"
            onClick={() => handleDevControl("stop")}
            disabled={isDevActionLoading}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${ui.controlBorder}`,
              background: isDark ? "rgba(127, 29, 29, 0.85)" : "#7f1d1d",
              color: "#ffffff",
              cursor: isDevActionLoading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {isDevActionLoading ? "Working..." : "Avsluta"}
          </button>

          <button
            type="button"
            onClick={handleExportChats}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${ui.controlBorder}`,
              background: ui.actionBg,
              color: ui.actionText,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Export chats
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${ui.controlBorder}`,
              background: ui.actionBg,
              color: ui.actionText,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Import chats
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${ui.controlBorder}`,
              background: ui.actionBg,
              color: ui.actionText,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Export to MD
          </button>

          <button
            type="button"
            onClick={() => setIsComparisonMode(!isComparisonMode)}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: isComparisonMode ? `1px solid ${ui.accent}` : `1px solid ${ui.controlBorder}`,
              background: isComparisonMode ? (isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff") : ui.actionBg,
              color: isComparisonMode ? ui.accent : ui.actionText,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {isComparisonMode ? "Battle Mode: On" : "Battle Mode: Off"}
          </button>

          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            style={{
              padding: "8px 12px",
              borderRadius: 14,
              border: `1px solid ${ui.controlBorder}`,
              background: ui.actionBg,
              color: ui.actionText,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          <button
            type="button"
            onClick={handleCreateSession}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(96,165,250,0.3)",
              background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            New chat
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleImportFile(file);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: 12,
            color: ui.subtle,
            width: "100%",
          }}
        >
          {[
            devStatus?.api ? { key: "api", item: devStatus.api } : null,
            devStatus?.web ? { key: "web", item: devStatus.web } : null,
            devStatus?.executor ? { key: "executor", item: devStatus.executor } : null,
          ]
            .filter(Boolean)
            .map((entry) => {
              const item = entry!.item;
              return (
                <div
                  key={entry!.key}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: `1px solid ${item?.running ? "rgba(34,197,94,0.35)" : ui.controlBorder}`,
                    background: item?.running ? (isDark ? "rgba(22,163,74,0.12)" : "#f0fdf4") : ui.actionBg,
                    color: item?.running ? (isDark ? "#86efac" : "#166534") : ui.subtle,
                    fontWeight: 700,
                  }}
                  title={
                    entry!.key === "executor"
                      ? `Managed process. ${item?.pid ? `PID ${item.pid}. ` : ""}${item?.command || ""}${item?.cwd ? ` in ${item.cwd}` : ""}`
                      : entry!.key === "web"
                        ? "Detected from the local web port."
                        : "This API is running because this page can reach it."
                  }
                >
                  {item?.label}: {item?.running ? "running" : "stopped"}
                </div>
              );
            })}

          <div style={{ color: ui.subtle }}>
            Start/Avsluta controls the managed background worker. Web/API status is shown read-only so the UI stays available.
          </div>
        </div>

        {/* --- DOCUMENTS SECTION --- */}
        {activeSession && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${ui.panelBorder}`, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: ui.muted, letterSpacing: 1, textTransform: "uppercase" }}>Attached Documents</span>
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 800, 
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", 
                  padding: "1px 6px", 
                  borderRadius: 6,
                  color: ui.accent 
                }}>
                  {activeSession.documents?.length || 0}
                </span>
              </div>
              <button 
                onClick={() => docInputRef.current?.click()}
                style={{ fontSize: 10, fontWeight: 700, background: "transparent", border: "none", color: ui.accent, cursor: "pointer" }}
              >
                + Add File
              </button>
              <input 
                ref={docInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocumentUpload(file);
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <AnimatePresence>
                {isUploading && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ padding: "6px 10px", fontSize: 12, color: ui.accent, fontStyle: "italic", overflow: "hidden" }}
                  >
                    Uploading document...
                  </motion.div>
                )}
                {activeSession.documents && activeSession.documents.length > 0 ? (
                  activeSession.documents.map((doc) => (
                    <motion.div 
                      key={doc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8, 
                        padding: "6px 10px", 
                        borderRadius: 8, 
                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                        border: `1px solid ${ui.panelBorder}`,
                        fontSize: 12,
                        overflow: "hidden"
                      }}
                    >
                      <span style={{ opacity: 0.6 }}>📄</span>
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</span>
                      <span style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{doc.type}</span>
                      <button 
                         onClick={() => handleDeleteDocument(doc.id)}
                         style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, padding: "0 4px", opacity: 0.5 }}
                      >
                         ×
                      </button>
                    </motion.div>
                  ))
                ) : !isUploading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleDocumentUpload(file);
                    }}
                    style={{ 
                      border: `1px dashed ${ui.panelBorder}`, 
                      borderRadius: 12, 
                      padding: "20px 10px", 
                      textAlign: "center", 
                      fontSize: 12, 
                      color: ui.subtle,
                      background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
                    }}
                  >
                    Drag & drop PDF/TXT files here to chat with them.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>

      {devErrorText ? (
        <div
          style={{
            marginBottom: 10,
            padding: "9px 10px",
            borderRadius: 18,
            border: "1px solid rgba(248, 113, 113, 0.35)",
            background: isDark ? "rgba(127, 29, 29, 0.18)" : "#fff1f2",
            color: isDark ? "#fecaca" : "#991b1b",
            fontSize: 13,
          }}
        >
          {devErrorText}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "230px minmax(0, 1fr)",
          gap: 12,
          flex: 1,
          alignItems: "stretch",
          padding: "0 4px 10px 4px",
          overflow: "hidden",
        }}
      >
        <aside
          style={{
            border: `1px solid ${ui.panelBorder}`,
            borderRadius: 16,
            background: ui.panelBg,
            padding: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ fontSize: 13, color: ui.subtle, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
            Sessions
          </div>
          <div style={{ fontSize: 12, color: ui.subtle, marginBottom: 4, lineHeight: 1.35 }}>
            Local sessions stay on this device. Import safely merges chat backups.
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 6, paddingRight: 4 }}>
            <AnimatePresence initial={false}>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  layout
                style={{
                  border: activeSessionId === session.id ? `1px solid ${ui.accent}` : `1px solid rgba(255,255,255,0.03)`,
                  borderRadius: 12,
                  padding: "8px 10px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 180ms ease",
                  background: activeSessionId === session.id ? (isDark ? "rgba(255,255,255,0.04)" : "#f8fafc") : "transparent",
                  boxShadow: activeSessionId === session.id ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {editingSessionId === session.id ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(session.id);
                        if (e.key === "Escape") cancelRenameSession();
                      }}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        borderRadius: 14,
                        border: `1px solid ${ui.controlBorder}`,
                        background: ui.controlBg,
                        color: ui.text,
                        boxSizing: "border-box",
                      }}
                    />

                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleSaveRename(session.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${ui.controlBorder}`,
                          background: ui.actionBg,
                          color: ui.actionText,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={cancelRenameSession}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${ui.controlBorder}`,
                          background: "transparent",
                          color: ui.subtle,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveSessionId(session.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: ui.text,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 13, lineHeight: 1.2 }}>{session.title}</div>
                        <div style={{ fontSize: 10, color: ui.muted, marginTop: 4 }}>
                          {(session.messages || []).length} messages · {session.modelSelection} · {session.transport}
                          {session.documents && (session.documents.length || 0) > 0 && (
                            <span style={{ marginLeft: 6, color: ui.accent, fontWeight: 700 }}>
                              📎 {session.documents.length}
                            </span>
                          )}
                        </div>
                    </button>

                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => startRenameSession(session.id, session.title)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 8,
                          border: `1px solid ${ui.controlBorder}`,
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                          color: ui.text,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 8,
                          border: `1px solid rgba(239, 68, 68, 0.2)`,
                          background: "transparent",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </aside>

        <section
          style={{
            border: `1px solid ${ui.panelBorder}`,
            borderRadius: 16,
            background: ui.panelBg,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            display: "grid",
            gridTemplateColumns: isComparisonMode ? "1fr 1fr" : "1fr",
            gap: isComparisonMode ? 12 : 0,
            overflow: "hidden",
            padding: 12,
          }}
        >
          {activeSession ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, width: "100%", marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>Mode</label>
                  <select
                    value={activeSession.workflowMode}
                    onChange={(e) => updateActiveSessionField("workflowMode", e.target.value as "direct" | "multi-step")}
                    style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: `1px solid ${ui.controlBorder}`, background: isDark ? "rgba(10,18,34,0.4)" : "transparent", color: ui.text, fontSize: 13, outline: "none" }}
                  >
                    <option style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value="direct">Direct</option>
                    <option style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value="multi-step">Multi-step</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>Model selection</label>
                  <select
                    value={activeSession.modelSelection}
                    onChange={(e) => updateActiveSessionField("modelSelection", e.target.value as "auto" | "manual")}
                    style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: `1px solid ${ui.controlBorder}`, background: isDark ? "rgba(10,18,34,0.4)" : "transparent", color: ui.text, fontSize: 13, outline: "none" }}
                  >
                    <option style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value="auto">Auto</option>
                    <option style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value="manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>Model</label>
                  <select
                    value={activeSession.model}
                    onChange={(e) => updateActiveSessionField("model", e.target.value)}
                    disabled={activeSession.modelSelection === "auto"}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      borderRadius: 8,
                      border: `1px solid ${ui.controlBorder}`,
                      background: activeSession.modelSelection === "auto" ? (isDark ? "rgba(15,23,42,0.3)" : "#f2f4f7") : (isDark ? "rgba(10,18,34,0.4)" : "transparent"),
                      color: ui.text,
                      fontSize: 13,
                      outline: "none",
                    }}
                  >
                    {models.map((model) => (
                      <option key={model} style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>Response mode</label>
                  <select
                    value={activeSession.transport}
                    onChange={(e) => updateActiveSessionField("transport", e.target.value as "normal" | "stream")}
                    style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: `1px solid ${ui.controlBorder}`, background: isDark ? "rgba(10,18,34,0.4)" : "transparent", color: ui.text, fontSize: 13, outline: "none" }}
                  >
                    <option style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value="stream">Streaming</option>
                    <option style={{ background: isDark ? "#0f172a" : "#fff", color: ui.text }} value="normal">Normal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flex: 1, gap: isComparisonMode ? 12 : 0, overflow: "hidden" }}>
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  style={{
                    flex: 1,
                    border: `1px solid ${ui.panelBorder}`,
                    borderRadius: 16,
                    padding: "16px 16px 100px 16px",
                    background: ui.chatCanvas,
                    overflowY: "auto",
                    overflowX: "hidden",
                    boxShadow: isDark ? "inset 0 2px 8px rgba(0,0,0,0.2)" : "inset 0 2px 4px rgba(0,0,0,0.02)",
                    scrollBehavior: "smooth",
                    position: "relative"
                  }}
                >
                {activeSession.messages.length === 0 ? (
                  <div style={{ color: ui.subtle, maxWidth: 720, lineHeight: 1.8, padding: 8 }}>
                    Start the conversation. Example:
                    <br />
                    <br />
                    <strong>Direct:</strong> Respond with exactly one word: KIWI
                    <br />
                    <strong>Multi-step:</strong> Write a short haiku about rain.
                    <br />
                    <strong>Agent view:</strong> Frontend now recognizes labels like <code>[planner]</code> and <code>[executor]</code> if your backend starts returning them later.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    <AnimatePresence initial={false}>
                      {activeSession.messages.map((message, idx) => {
                      const isFirstInGroup = idx === 0 || activeSession.messages[idx - 1].role !== message.role;
                      const agent = message.role === "assistant" ? getAgentPresentation(detectAgentRole(message.content)) : null;
                      const isStreaming = isSending && message.role === "assistant" && idx === activeSession.messages.length - 1;

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                            mass: 0.8
                          }}
                          style={{
                            display: "flex",
                            justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                            marginTop: isFirstInGroup ? 6 : -2, // Smoother stacking
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "85%",
                              padding: "8px 12px",
                              borderRadius: 12,
                              background: message.role === "user" ? (isDark ? "#2563eb" : "#3b82f6") : ui.assistantBubble,
                              color: message.role === "user" ? "#fff" : ui.text,
                              border: `1px solid ${message.role === "user" ? "rgba(255,255,255,0.1)" : ui.assistantBorder}`,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              position: "relative",
                            }}
                          >
                            {isFirstInGroup && (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {/* Role Avatar/Badge */}
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      background: message.role === "user" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #475467, #1e293b)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 9,
                                      fontWeight: 800,
                                      color: "#fff",
                                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                    }}
                                  >
                                    {message.role === "user" ? "U" : "AI"}
                                  </div>
                                  
                                  <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
                                    {message.role === "user" ? "You" : "EvoFlow AI"}
                                  </div>

                                  {message.role === "assistant" && agentViewEnabled && agent ? (
                                    <span
                                      style={{
                                        padding: "3px 8px",
                                        borderRadius: 999,
                                        fontSize: 9.5,
                                        fontWeight: 800,
                                        letterSpacing: 0.2,
                                        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.04)",
                                        color: agent.accent,
                                        border: `1px solid ${agent.accent}33`,
                                      }}
                                    >
                                      {agent.label}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )}

                                {message.role === "assistant" && activeSession.documents && activeSession.documents.length > 0 && (
                                  <div style={{ fontSize: 10, color: ui.accent, fontWeight: 700, marginBottom: 4 }}>
                                    📎 Using Document Context
                                  </div>
                                )}
                                <RichMessageContent
                              content={message.content}
                              isStreaming={isStreaming}
                            />

                            {/* Streaming Indicator */}
                            {isStreaming && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, opacity: 0.8 }}>
                                <div style={{ display: "flex", gap: 3 }}>
                                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: ui.accent, animation: "pulse 1.5s infinite" }} />
                                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: ui.accent, animation: "pulse 1.5s infinite 0.2s" }} />
                                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: ui.accent, animation: "pulse 1.5s infinite 0.4s" }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: ui.accent, letterSpacing: 0.5, textTransform: "uppercase" }}>
                                  AI is thinking...
                                </span>
                              </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, opacity: 0.5 }}>
                              <div style={{ fontSize: 10 }}>
                                {message.model ? `${message.model} · ` : ""}{message.transport || activeSession.transport}
                              </div>
                              
                              {message.role === "assistant" && (
                                <button
                                  type="button"
                                  onClick={() => copyWholeMessage(message.content)}
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 6,
                                    border: `1px solid ${ui.panelBorder}`,
                                    background: "rgba(255,255,255,0.03)",
                                    color: ui.subtle,
                                    cursor: "pointer",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    marginTop: 4,
                                  }}
                                >
                                  Copy
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
                </div>

                {/* --- COMPARISON PANE (BATTLE MODE) --- */}
                {isComparisonMode && (
                  <div
                    style={{
                      flex: 1,
                      border: `1px solid ${ui.panelBorder}`,
                      borderRadius: 16,
                      padding: "16px 16px 40px 16px",
                      background: isDark ? "rgba(0,0,0,0.15)" : "rgba(248,250,252,0.5)",
                      overflowY: "auto",
                      maxHeight: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, position: "sticky", top: 0, background: isDark ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.9)", padding: "4px 0", zIndex: 5, backdropFilter: "blur(4px)" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: ui.accent, textTransform: "uppercase", letterSpacing: 1.5 }}>Opponent: {comparisonModel}</span>
                      <select
                        value={comparisonModel}
                        onChange={(e) => setComparisonModel(e.target.value)}
                        style={{ height: 26, padding: "0 8px", borderRadius: 6, border: `1px solid ${ui.controlBorder}`, background: ui.controlBg, color: ui.text, fontSize: 11, outline: "none" }}
                      >
                        {models.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {comparisonMessages.length === 0 ? (
                        <div style={{ color: ui.subtle, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 40, padding: 20 }}>
                          Battle mode active. <br/>Enter a message to see responses from two models side-by-side.
                        </div>
                      ) : (
                        comparisonMessages.map((msg) => (
                          <div key={msg.id} style={{ display: "flex", gap: 10, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", padding: 10, borderRadius: 12, border: `1px solid ${ui.panelBorder}` }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, background: ui.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                              VS
                            </div>
                            <div style={{ flex: 1 }}>
                               <div style={{ fontSize: 13, lineHeight: 1.6, color: ui.text, whiteSpace: "pre-wrap" }}>{msg.content}</div>
                               {isComparisonSending && msg.id === comparisonMessages[comparisonMessages.length-1].id && (
                                 <div style={{ height: 2, background: ui.accent, width: "30%", marginTop: 8, borderRadius: 1, animation: "pulse 1.5s infinite" }} />
                               )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  marginTop: -40, 
                  padding: "20px 10px 10px 10px",
                  background: ui.chatCanvas,
                  borderTop: `1px solid ${ui.panelBorder}`,
                  zIndex: 10,
                }}
              >
                {/* --- ATTACHMENT CHIPS UI --- */}
                {activeSession && activeSession.documents && activeSession.documents.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, padding: "0 4px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: ui.accent, textTransform: "uppercase", letterSpacing: 0.5, flexBasis: "100%", marginBottom: 4 }}>
                      Active Context ({activeSession.documents.length})
                    </div>
                    <AnimatePresence>
                      {activeSession.documents.map((doc) => (
                        <motion.div 
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.8, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 5 }}
                          onClick={() => handleDocumentPreview(doc.id)}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 6, 
                            padding: "4px 10px", 
                            borderRadius: 10, 
                            background: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
                            border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.3)" : "#dbeafe"}`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: ui.accent,
                            cursor: "pointer"
                          }}
                        >
                          {doc.type.includes("image") || ["png", "jpg", "jpeg", "webp"].includes(doc.type) ? (
                            <span style={{ fontSize: 12 }}>🖼️</span>
                          ) : (
                            <span style={{ opacity: 0.8 }}>📎</span>
                          )}
                          <span style={{ maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                            style={{ background: "transparent", border: "none", color: ui.accent, cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 900 }}
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {errorText ? (
                  <div
                    style={{
                      marginBottom: 4,
                      padding: 10,
                      border: "1px solid #f5c2c7",
                      borderRadius: 18,
                      background: "#fff5f5",
                      color: "#b42318",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {errorText}
                  </div>
                ) : null}

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end", padding: "6px", borderRadius: 14, border: `1px solid ${ui.panelBorder}`, background: isDark ? "rgba(10,18,34,0.9)" : "#ffffff", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
                  <div>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Write your next message here..."
                      style={{
                        width: "100%",
                        minHeight: 120,
                        padding: "12px",
                        borderRadius: 10,
                        border: `1px solid transparent`,
                        fontSize: 15,
                        boxSizing: "border-box",
                        resize: "vertical",
                        lineHeight: 1.3,
                        background: "transparent",
                        color: ui.text,
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                      color: "#fff",
                      cursor: !input.trim() || isSending ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      minWidth: 100,
                      height: 48,
                      opacity: !input.trim() || isSending ? 0.6 : 1,
                    }}
                  >
                    {isSending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
      {/* --- NOTIFICATION TOASTS --- */}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "grid", gap: 8, zIndex: 9999 }}>
        <AnimatePresence>
          {notifications.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: isDark ? "rgba(10, 20, 35, 0.95)" : "#ffffff",
                border: `1px solid ${note.type === "error" ? "rgba(239, 68, 68, 0.4)" : ui.panelBorder}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                color: note.type === "error" ? "#ef4444" : ui.text,
                fontSize: 13,
                fontWeight: 600,
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: note.type === "success" ? "#22c55e" : note.type === "error" ? "#ef4444" : ui.accent 
              }} />
              {note.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- DOCUMENT PREVIEW MODAL --- */}
      <AnimatePresence>
        {previewDocId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 40 }}
            onClick={() => setPreviewDocId(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 1000, maxHeight: "90%", background: ui.panelBg, borderRadius: 24, border: `1px solid ${ui.panelBorder}`, boxShadow: "0 32px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${ui.panelBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: ui.text }}>{previewDocData?.name || "Loading..."}</h3>
                  {previewDocData && (
                    <div style={{ fontSize: 12, color: ui.subtle, marginTop: 4 }}>
                      {previewDocData.type} · {new Object(previewDocData.content).toString().length} chars · {new Date(previewDocData.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <button onClick={() => setPreviewDocId(null)} style={{ background: ui.actionBg, border: `1px solid ${ui.controlBorder}`, color: ui.text, borderRadius: 12, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>Close</button>
              </div>
              <div style={{ flex: 1, padding: 24, overflowY: "auto", background: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)" }}>
                {!previewDocData ? (
                  <div style={{ textAlign: "center", color: ui.subtle, padding: 40 }}>Loading document content...</div>
                ) : (
                  <>
                    {(previewDocData.type.includes("image") || ["png", "jpg", "jpeg", "webp"].includes(previewDocData.type)) ? (
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <img 
                          src={`data:image/${previewDocData.type};base64,${previewDocData.content}`} 
                          alt={previewDocData.name} 
                          style={{ maxWidth: "100%", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }} 
                        />
                      </div>
                    ) : (
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: ui.text, fontSize: 13, lineHeight: 1.6, fontFamily: "inherit" }}>
                        {previewDocData.content}
                      </pre>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
