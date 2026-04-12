"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Trash2, Check, ExternalLink, Code, Terminal, Layers, Square, X, Paperclip } from "lucide-react";

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
  pid?: number;
  command?: string;
  cwd?: string;
};

type DevStatusResponse = {
  success: boolean;
  controls: Record<string, DevControlItem>;
  error?: string;
};

const EXPORT_FILE_PREFIX = "evoflow-chats";

// --- UTILS ---
async function fetchModels(baseUrl: string, demoToken: string): Promise<{ models: string[]; defaultModel: string }> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}),
      },
    });

    const data = (await response.json()) as ModelsResponse;
    const items = data.items || [];
    return {
      models: items,
      defaultModel: data.defaultModel || (items.length > 0 ? items[0] : "llama3"),
    };
  } catch (error) {
    console.error("Failed to fetch models", error);
    return { models: ["llama3", "mistral", "phi3"], defaultModel: "llama3" };
  }
}

function loadSessions(defaultModel: string): Session[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("evoflow_sessions");
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function createEmptySession(model: string): Session {
  return {
    id: uid("session"),
    title: "New chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflowMode: "direct",
    model,
    modelSelection: "manual",
    transport: "stream",
    messages: [],
    documents: [],
  };
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

function formatTitle(text: string) {
  if (text.length <= 40) return text;
  return text.substring(0, 37) + "...";
}

function createExportPayload(sessions: Session[]) {
  return {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    sessions,
  };
}

function normalizeImportedSessions(data: any, defaultModel: string): Session[] {
  if (!data || typeof data !== "object") return [];
  const items = Array.isArray(data) ? data : data.sessions || [];
  return items.map((s: any) => ({
    id: s.id || uid("session"),
    title: s.title || "Imported Chat",
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString(),
    workflowMode: s.workflowMode || "direct",
    model: s.model || defaultModel,
    modelSelection: s.modelSelection || "manual",
    transport: s.transport || "stream",
    messages: s.messages || [],
    documents: s.documents || [],
  }));
}

function detectAgentRole(content: string): string {
  if (content.toLowerCase().includes("[planner]")) return "planner";
  if (content.toLowerCase().includes("[executor]")) return "executor";
  if (content.toLowerCase().includes("[brain]")) return "brain";
  return "default";
}

function getAgentPresentation(role: string) {
  switch (role) {
    case "planner": return { label: "Planner", color: "#3b82f6", accent: "#60a5fa" };
    case "executor": return { label: "Executor", color: "#10b981", accent: "#34d399" };
    case "brain": return { label: "Thinking", color: "#8b5cf6", accent: "#a78bfa" };
    default: return null;
  }
}

// --- SUB-COMPONENT: RICH MESSAGE CONTENT (DAY 4 UPGRADE) ---
function RichMessageContent({ content, isStreaming, isDark, ui }: { content: string, isStreaming: boolean, isDark: boolean, ui: any }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="prose-container" style={{ fontSize: 14, lineHeight: 1.6, color: "inherit" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "16px 0", borderRadius: 8, border: `1px solid ${ui.panelBorder}`, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderBottom: `2px solid ${ui.panelBorder}` }}>{children}</thead>,
          th: ({ children }) => <th style={{ padding: "12px", textAlign: "left", fontWeight: 800, color: ui.text }}>{children}</th>,
          td: ({ children }) => <td style={{ padding: "12px", borderBottom: `1px solid ${ui.panelBorder}`, opacity: 0.9 }}>{children}</td>,
          tr: ({ children }) => <tr style={{ borderBottom: `1px solid ${ui.panelBorder}` }}>{children}</tr>,
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");
            const codeId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

            if (inline) {
              return (
                <code style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.05)", padding: "2px 5px", borderRadius: 4, fontStyle: "normal", fontWeight: 600, fontSize: "0.9em" }} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div style={{ position: "relative", margin: "16px 0", borderRadius: 10, overflow: "hidden", border: `1px solid ${ui.panelBorder}`, background: "#0f172a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{match ? match[1] : "code"}</span>
                  <button
                    onClick={() => handleCopyCode(codeContent, codeId)}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700 }}
                  >
                    {copiedId === codeId ? <Check size={12} style={{ color: "#22c55e" }} /> : <Copy size={12} />}
                    {copiedId === codeId ? "COPIED" : "COPY"}
                  </button>
                </div>
                <pre style={{ margin: 0, padding: 12, overflowX: "auto", fontSize: 13, lineHeight: 1.5 }}>
                  <code className={className} style={{ background: "transparent", padding: 0, color: "#e2e8f0" }} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          blockquote: ({ children }) => (
            <blockquote style={{ margin: "12px 0", padding: "4px 16px", borderLeft: `4px solid ${ui.accent}`, background: isDark ? "rgba(96,165,250,0.05)" : "rgba(37,99,235,0.03)", fontStyle: "italic", opacity: 0.85 }}>{children}</blockquote>
          ),
          ul: ({ children }) => <ul style={{ margin: "10px 0", paddingLeft: "20px", display: "grid", gap: 4 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "10px 0", paddingLeft: "20px", display: "grid", gap: 4 }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 4, marginLeft: 4 }}>{children}</li>,
          a: ({ href, children }) => <Link href={href || "#"} target="_blank" style={{ color: ui.accent, textDecoration: "underline", fontWeight: 600 }}>{children} <ExternalLink size={12} style={{ display: "inline", marginBottom: 2 }} /></Link>,
          p: ({ children }) => (
            <div style={{ margin: "10px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {children}
              {isStreaming && <span style={{ marginLeft: 2, display: "inline-block", width: 8, height: 15, background: ui.accent, verticalAlign: "middle", animation: "blink 1s step-end infinite" }}></span>}
            </div>
          )
        }}
      >
        {content}
      </ReactMarkdown>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        .prose-container table tr:last-child td { border-bottom: none; }
      `}</style>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function ChatClient() {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
  const demoToken = process.env.NEXT_PUBLIC_DEMO_TOKEN || "";

  const [models, setModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState("");
  
  // Initialization & System Effects
  useEffect(() => {
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
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredSessionId, setHoveredSessionId] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState("");
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
  const [devErrorText, setDevErrorText] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isAborted, setIsAborted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 300);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const addNotification = (message: string, type: "info" | "success" | "error" = "info") => {
    const id = uid("note");
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  // Helper functions
  function patchSession(sessionId: string, updater: (session: Session) => Session) {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)));
  }

  function updateActiveSessionField<K extends keyof Session>(field: K, value: Session[K]) {
    if (!activeSession) return;
    patchSession(activeSession.id, (session) => ({
      ...session,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  // API Callbacks
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
      if (response.ok) {
        setDevStatus(data.controls || null);
        setDevErrorText("");
      }
    } catch (e) {
      setDevErrorText("Status request failed");
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
      if (response.ok) {
        setDevStatus(data.controls || null);
        setDevErrorText("");
      }
    } catch (error) {
      setDevErrorText(`${action} request failed`);
    } finally {
      setIsDevActionLoading(false);
    }
  }

  // --- Session Event Handlers ---
  async function handleCreateSession() {
    const fresh = createEmptySession(defaultModel);
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
        setSessions((prev) => prev.map(s => s.id === fresh.id ? { ...s, id: data.session.id } : s));
        setActiveSessionId(data.session.id);
      }
    } catch (e) {
      console.error("Failed to create session on server", e);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (confirmDeleteId !== sessionId) {
      setConfirmDeleteId(sessionId);
      return;
    }
    setConfirmDeleteId("");
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      if (next.length === 0) {
        const fb = createEmptySession(defaultModel);
        setActiveSessionId(fb.id);
        return [fb];
      }
      if (activeSessionId === sessionId) setActiveSessionId(next[0].id);
      return next;
    });
    try {
      await fetch(`${apiBaseUrl}/api/sessions/${sessionId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Delete failed");
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeSession) return;
    if (!window.confirm("Permanent delete?")) return;
    patchSession(activeSession.id, (s) => ({
      ...s,
      messages: s.messages.filter((m) => m.id !== messageId),
    }));
    try {
      await fetch(`${apiBaseUrl}/api/messages/${messageId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Message delete failed");
    }
  }

  // --- Document Event Handlers ---
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
      console.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!activeSession) return;
    if (!window.confirm("Remove this document?")) return;
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
      console.error("Delete failed");
    }
  }

  const handleDocumentPreview = async (docId: string) => {
    setPreviewDocId(docId);
    setPreviewDocData(null);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/documents/${docId}`);
      const data = await resp.json();
      if (data.success) setPreviewDocData(data.item);
    } catch (e) {
      addNotification("Preview failed", "error");
    }
  };

  // --- Chat Logic ---
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShouldAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeSession?.messages, shouldAutoScroll]);

  const handleSendComparison = async (message: string) => {
    if (!activeSession) return;
    setIsComparisonSending(true);
    const tempId = uid("msg");
    const newMsg: Message = { id: tempId, sessionId: activeSession.id as any, role: "assistant", content: "", model: comparisonModel, createdAt: new Date().toISOString() };
    setComparisonMessages((prev) => [...prev, newMsg]);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId: activeSession.id, workflowMode: activeSession.workflowMode, modelSelection: "manual", model: comparisonModel, transport: "stream" }),
      });
      if (!resp.ok || !resp.body) throw new Error("Comparison request failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setComparisonMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, content: full } : m)));
      }
    } catch (e) {
      addNotification("Comparison model failed", "error");
    } finally {
      setIsComparisonSending(false);
    }
  };

  async function handleSend() {
    if (!activeSession || !input.trim() || isSending) return;
    const userText = input.trim();
    if (isComparisonMode) handleSendComparison(userText);
    const now = new Date().toISOString();
    const userMessage: Message = { id: uid("user"), role: "user", content: userText, createdAt: now, model: activeSession.model, modelSelection: activeSession.modelSelection, transport: activeSession.transport };
    const assistantId = uid("assistant");
    const assistantMessage: Message = { id: assistantId, role: "assistant", content: "", createdAt: now, model: activeSession.model, modelSelection: activeSession.modelSelection, transport: activeSession.transport };
    patchSession(activeSession.id, (session) => ({
      ...session,
      title: session.messages.length === 0 ? formatTitle(userText) : session.title,
      updatedAt: now,
      messages: [...session.messages, userMessage, assistantMessage],
    }));
    setIsSending(true);
    setIsAborted(false);
    setShouldAutoScroll(true);
    abortControllerRef.current = new AbortController();

    // Sync User Msg
    fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: userText, model: userMessage.model, transport: userMessage.transport, modelSelection: userMessage.modelSelection }),
    }).catch(e => console.error("Sync user failed"));

    try {
      const prompt = activeSession.messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n") + (activeSession.messages.length > 0 ? "\n\n" : "") + `User: ${userText}\n\nAssistant:`;
      const payload = { message: prompt, mode: activeSession.workflowMode, model: activeSession.model, modelSelection: activeSession.modelSelection, sessionId: activeSession.id };

      if (activeSession.transport === "stream") {
        const response = await fetch(`${apiBaseUrl}/runs/stream`, { 
          method: "POST", 
          headers: { "Content-Type": "application/json", ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}) }, 
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal
        });
        if (!response.ok || !response.body) throw new Error("Stream failed");
        
        const modelFromHeader = response.headers.get("x-evoflow-model") || activeSession.model;
        const selectionFromHeader = (response.headers.get("x-evoflow-model-selection") as "auto" | "manual" | "default") || activeSession.modelSelection;
        patchSession(activeSession.id, (s) => ({ ...s, model: modelFromHeader, modelSelection: selectionFromHeader === "default" ? "manual" : selectionFromHeader }));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          patchSession(activeSession.id, (session) => ({
            ...session,
            updatedAt: new Date().toISOString(),
            messages: session.messages.map((m) => m.id === assistantId ? { ...m, content: full, model: modelFromHeader, transport: "stream", modelSelection: selectionFromHeader } : m),
          }));
        }
        fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "assistant", content: full, model: modelFromHeader, transport: "stream", modelSelection: selectionFromHeader }) }).catch(e => console.error("Sync assistant failed"));
      } else {
        const response = await fetch(`${apiBaseUrl}/runs`, { method: "POST", headers: { "Content-Type": "application/json", ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}) }, body: JSON.stringify(payload) });
        const text = await response.text();
        if (!response.ok) throw new Error("Request failed");
        let parsed: any;
        try { parsed = JSON.parse(text); } catch { parsed = { finalOutput: text }; }
        const output = parsed?.finalOutput || text;
        const model = parsed?.model || activeSession.model;
        const selection = parsed?.modelSelection || activeSession.modelSelection;
        patchSession(activeSession.id, (s) => ({ ...s, model, modelSelection: selection === "default" ? "manual" : selection, updatedAt: new Date().toISOString(), messages: s.messages.map(m => m.id === assistantId ? { ...m, content: output, model, transport: "normal", modelSelection: selection } : m) }));
        fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "assistant", content: output, model, transport: "normal", modelSelection: selection }) }).catch(e => console.error("Sync assistant failed"));
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log("Fetch aborted");
      } else {
        setErrorText(error instanceof Error ? error.message : "Chat failed");
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }

  function handleStopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsAborted(true);
    }
  }

  // Lifecycle
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingModels(true);
      const result = await fetchModels(apiBaseUrl, demoToken);
      if (!isMounted) return;
      setModels(result.models);
      setDefaultModel(result.defaultModel);
      setComparisonModel(result.defaultModel);
      try {
        const resp = await fetch(`${apiBaseUrl}/api/sessions`);
        const data = await resp.json();
        if (data.success && Array.isArray(data.items)) {
          const mapped = data.items.map((s: any) => ({ ...s, messages: s.messages || [], documents: s.documents || [] }));
          setSessions(mapped);
          if (mapped.length > 0) setActiveSessionId(mapped[0].id);
          else {
            const empty = createEmptySession(result.defaultModel);
            setSessions([empty]);
            setActiveSessionId(empty.id);
          }
        }
      } catch (e) { console.error("Initial load failed"); }
      setIsLoadingModels(false);
    })();
    return () => { isMounted = false; };
  }, [apiBaseUrl, demoToken]);

  useEffect(() => {
    refreshDevStatus();
    const t = setInterval(refreshDevStatus, 5000);
    return () => clearInterval(t);
  }, [apiBaseUrl, demoToken]);

  // Export/Import Helpers
  function handleExportChats() {
    const payload = createExportPayload(sessions);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${EXPORT_FILE_PREFIX}-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const imported = normalizeImportedSessions(JSON.parse(text), defaultModel);
      if (imported.length > 0) {
        setSessions(prev => [...imported, ...prev]);
        setActiveSessionId(imported[0].id);
      }
    } catch (e) { setErrorText("Import failed"); }
  }

  function startRenameSession(id: string, title: string) { setEditingSessionId(id); setEditingTitle(title); }
  function cancelRenameSession() { setEditingSessionId(""); setEditingTitle(""); }
  async function handleSaveRename(id: string) {
    const title = formatTitle(editingTitle.trim());
    if (!title) return cancelRenameSession();
    patchSession(id, (s) => ({ ...s, title, updatedAt: new Date().toISOString() }));
    cancelRenameSession();
    try { await fetch(`${apiBaseUrl}/api/sessions/${id}/rename`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }); } catch (e) {}
  }

  async function handleDuplicateSession(id: string) {
    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${id}/duplicate`, { method: "POST" });
      const data = await resp.json();
      if (data.success && data.session) {
        setSessions(prev => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        addNotification("Session duplicated", "success");
      }
    } catch (e) { addNotification("Duplicate failed", "error"); }
  }

  if (isLoadingModels) {
    return (
      <main style={{ width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: ui.pageBg, color: ui.text }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>EvoFlow</h1>
          <div style={{ opacity: 0.6 }}>Loading system context...</div>
        </div>
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
      {/* --- HEADER --- */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>EvoFlow Chat</h1>
              <nav style={{ display: "flex", gap: 12, fontSize: 13, fontWeight: 600 }}>
                <Link href="/" style={{ color: ui.accent, textDecoration: "none", opacity: 0.65 }}>Dashboard</Link>
                <Link href="/chat" style={{ color: ui.text, textDecoration: "none", fontWeight: 700 }}>Chat</Link>
              </nav>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => handleDevControl("start")} style={{ padding: "6px 12px", borderRadius: 10, background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>Start</button>
            <button onClick={() => handleDevControl("stop")} style={{ padding: "6px 12px", borderRadius: 10, background: isDark ? "rgba(127, 29, 29, 0.85)" : "#7f1d1d", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>Avsluta</button>
            <div style={{ width: 1, height: 20, background: ui.panelBorder, margin: "0 4px" }} />
            <button onClick={() => setIsComparisonMode(!isComparisonMode)} style={{ padding: "6px 12px", borderRadius: 10, background: isComparisonMode ? ui.accent : ui.actionBg, color: isComparisonMode ? "#fff" : ui.text, fontWeight: 700, border: `1px solid ${ui.panelBorder}`, cursor: "pointer" }}>{isComparisonMode ? "Battle: ON" : "Battle Mode"}</button>
            <button onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")} style={{ padding: "6px 12px", borderRadius: 10, background: ui.actionBg, color: ui.text, fontWeight: 700, border: `1px solid ${ui.panelBorder}`, cursor: "pointer" }}>{isDark ? "Light" : "Dark"}</button>
          </div>
        </div>
      </div>

      {devErrorText && <div style={{ marginBottom: 10, padding: 10, borderRadius: 12, background: isDark ? "rgba(127,29,29,0.2)" : "#fff1f2", color: "#ef4444", fontSize: 13 }}>{devErrorText}</div>}

      {/* --- CONTENT AREA --- */}
      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 12, flex: 1, overflow: "hidden", paddingBottom: 10 }}>
        {/* Sidebar */}
        <aside style={{ border: `1px solid ${ui.panelBorder}`, borderRadius: 16, background: ui.panelBg, padding: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: ui.subtle, textTransform: "uppercase" }}>Sessions</span>
            <button onClick={handleCreateSession} style={{ padding: "2px 8px", borderRadius: 6, background: ui.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New</button>
          </div>
          
          <input type="text" placeholder="Search sessions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 12, background: ui.controlBg, border: `1px solid ${ui.controlBorder}`, color: ui.text, fontSize: 12, marginBottom: 12, outline: "none" }} />

          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 6 }}>
            <AnimatePresence>
              {sessions.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map(session => (
                <motion.div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  style={{
                    padding: "10px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: activeSessionId === session.id ? (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9") : "transparent",
                    border: `1px solid ${activeSessionId === session.id ? ui.accent : "transparent"}`,
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: ui.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title}</div>
                  <div style={{ fontSize: 10, color: ui.subtle, marginTop: 4 }}>{session.messages.length} messages · {session.workflowMode}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Files section in sidebar */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${ui.panelBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase" }}>Context</span>
              <button onClick={() => docInputRef.current?.click()} style={{ fontSize: 10, color: ui.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>+ Add</button>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {activeSession?.documents?.map(doc => (
                <div key={doc.id} onClick={() => handleDocumentPreview(doc.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${ui.panelBorder}`, fontSize: 11, cursor: "pointer" }}>
                  <span style={{ opacity: 0.6 }}>📄</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <section style={{ border: `1px solid ${ui.panelBorder}`, borderRadius: 16, background: ui.panelBg, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {activeSession && (
            <>
              {/* Toolbar */}
              <div style={{ padding: "8px 16px", borderBottom: `1px solid ${ui.panelBorder}`, display: "flex", gap: 12, background: isDark ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.02)" }}>
                <select value={activeSession.workflowMode} onChange={e => updateActiveSessionField("workflowMode", e.target.value as any)} style={{ background: "none", border: "none", color: ui.subtle, fontSize: 11, fontWeight: 700, outline: "none", cursor: "pointer" }}>
                  <option value="direct">DIRECT MODE</option>
                  <option value="multi-step">MULTI-STEP MODE</option>
                </select>
                <div style={{ width: 1, height: 12, background: ui.panelBorder, alignSelf: "center" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: ui.subtle }}>{activeSession.model}</span>
              </div>

              {/* Messages Container */}
              <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px 20px", background: ui.chatCanvas }}>
                  <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
                    {activeSession.messages.length === 0 ? (
                      <div style={{ textAlign: "center", marginTop: 100, opacity: 0.4 }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
                        <div style={{ fontWeight: 700 }}>Start a new conversation</div>
                        <div style={{ fontSize: 13, marginTop: 8 }}>EvoFlow is ready to assist you locally.</div>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {activeSession.messages.map((message, idx) => {
                          const isStreaming = isSending && message.role === "assistant" && idx === activeSession.messages.length - 1;
                          return (
                            <motion.div
                              key={message.id}
                              onMouseEnter={() => setHoveredMessageId(message.id)}
                              onMouseLeave={() => setHoveredMessageId("")}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start", position: "relative" }}
                            >
                              <div style={{
                                maxWidth: "85%",
                                padding: "12px 16px",
                                borderRadius: 16,
                                background: message.role === "user" ? "#2563eb" : ui.assistantBubble,
                                color: message.role === "user" ? "#fff" : ui.text,
                                border: `1px solid ${message.role === "user" ? "rgba(255,255,255,0.1)" : ui.assistantBorder}`,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                position: "relative"
                              }}>
                                {/* Message Toolbar */}
                                <AnimatePresence>
                                  {hoveredMessageId === message.id && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: "absolute", top: -30, right: 0, display: "flex", gap: 4, background: ui.panelBg, border: `1px solid ${ui.panelBorder}`, padding: 2, borderRadius: 8, zIndex: 10 }}>
                                      <button onClick={() => handleDeleteMessage(message.id)} style={{ background: "none", border: "none", color: "#ef4444", padding: 4, cursor: "pointer" }}><Trash2 size={13} /></button>
                                      <button onClick={() => copyWholeMessage(message.content)} style={{ background: "none", border: "none", color: ui.accent, padding: 4, cursor: "pointer" }}><Copy size={13} /></button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.5, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{message.role === "user" ? "You" : "EvoFlow"}</div>
                                <RichMessageContent content={message.content} isStreaming={isStreaming} isDark={isDark} ui={ui} />
                                <div style={{ fontSize: 9, opacity: 0.4, marginTop: 8, textAlign: "right" }}>{message.model || activeSession.model}</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Comparison Mode (Battle) */}
                {isComparisonMode && (
                  <div style={{ width: 400, borderLeft: `1px solid ${ui.panelBorder}`, background: isDark ? "rgba(0,0,0,0.1)" : "#f8fafc", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "12px", borderBottom: `1px solid ${ui.panelBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: ui.accent }}>VS: {comparisonModel}</span>
                      <select value={comparisonModel} onChange={e => setComparisonModel(e.target.value)} style={{ fontSize: 10, background: "none", border: `1px solid ${ui.panelBorder}`, color: ui.text, borderRadius: 4 }}>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gap: 12 }}>
                      {comparisonMessages.map(m => (
                        <div key={m.id} style={{ padding: 10, borderRadius: 12, border: `1px solid ${ui.panelBorder}`, background: ui.panelBg }}>
                          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{m.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div style={{ padding: "10px 20px 20px 20px", borderTop: `1px solid ${ui.panelBorder}`, background: ui.panelBg }}>
                 <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    {/* Attachment Chips */}
                    <AnimatePresence>
                      {activeSession.documents && activeSession.documents.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
                        >
                          {activeSession.documents.map(doc => (
                            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 10, background: isDark ? "rgba(96,165,250,0.1)" : "rgba(37,99,235,0.05)", border: `1px solid ${isDark ? "rgba(96,165,250,0.2)" : "rgba(37,99,235,0.1)"}`, fontSize: 11, color: ui.accent, fontWeight: 600 }}>
                              <Paperclip size={12} />
                              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
                              <button onClick={() => handleDeleteDocument(doc.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: 2, padding: 0 }}>×</button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div style={{ position: "relative", display: "flex", gap: 10, alignItems: "flex-end" }}>
                       <div style={{ 
                         flex: 1, 
                         borderRadius: 20, 
                         border: `1px solid ${ui.controlBorder}`, 
                         background: ui.controlBg, 
                         overflow: "hidden", 
                         boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                         transition: "box-shadow 0.2s, border-color 0.2s",
                         ...(input.length > 0 ? { borderColor: ui.accent, boxShadow: `0 0 0 2px ${isDark ? "rgba(96,165,250,0.15)" : "rgba(37,99,235,0.1)"}` } : {})
                       }}>
                          <textarea 
                            ref={textareaRef}
                            value={input} 
                            onChange={e => setInput(e.target.value)} 
                            onKeyDown={e => { 
                              if (e.key === "Enter") {
                                if (e.shiftKey) return; // Allow newline
                                if (e.metaKey || e.ctrlKey || true) { // Standard Enter or Cmd+Enter
                                  e.preventDefault(); 
                                  handleSend(); 
                                }
                              }
                              if (e.key === "Escape") {
                                textareaRef.current?.blur();
                              }
                            }} 
                            placeholder="Type your message..." 
                            style={{ 
                              width: "100%", 
                              minHeight: 50, 
                              maxHeight: 300, 
                              padding: "14px 16px", 
                              border: "none", 
                              background: "none", 
                              color: ui.text, 
                              fontSize: 15, 
                              lineHeight: 1.5,
                              outline: "none", 
                              resize: "none" 
                            }} 
                          />
                       </div>
                       
                       <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                         {isSending ? (
                           <button 
                             onClick={handleStopGeneration}
                             style={{ 
                               width: 48, 
                               height: 48, 
                               borderRadius: 16, 
                               background: "#ef4444", 
                               color: "#fff", 
                               border: "none", 
                               cursor: "pointer", 
                               display: "flex", 
                               alignItems: "center", 
                               justifyContent: "center",
                               boxShadow: "0 4px 12px rgba(239,68,68,0.25)"
                             }}
                           >
                              <Square size={18} fill="currentColor" />
                           </button>
                         ) : (
                           <button 
                             onClick={handleSend} 
                             disabled={!input.trim()} 
                             style={{ 
                               width: 48, 
                               height: 48, 
                               borderRadius: 16, 
                               background: ui.accent, 
                               color: "#fff", 
                               border: "none", 
                               cursor: "pointer", 
                               display: "flex", 
                               alignItems: "center", 
                               justifyContent: "center", 
                               opacity: !input.trim() ? 0.3 : 1,
                               boxShadow: input.trim() ? `0 4px 12px ${isDark ? "rgba(96,165,250,0.3)" : "rgba(37,99,235,0.2)"}` : "none",
                               transition: "all 0.2s"
                             }}
                           >
                              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                              </motion.div>
                           </button>
                         )}
                       </div>
                    </div>
                 </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Persistence and Inputs */}
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
      <input ref={docInputRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocumentUpload(f); }} />

      {/* Notifications */}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "grid", gap: 8 }}>
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ padding: "10px 16px", borderRadius: 12, background: n.type === "error" ? "#ef4444" : "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>{n.message}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDocId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
             <div style={{ width: "90%", maxWidth: 1000, maxH: "90%", background: ui.panelBg, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: 16, borderBottom: `1px solid ${ui.panelBorder}`, display: "flex", justifyContent: "space-between" }}>
                   <div style={{ fontWeight: 700 }}>{previewDocData?.name || "Document Preview"}</div>
                   <button onClick={() => setPreviewDocId(null)} style={{ background: "none", border: "none", color: ui.text, cursor: "pointer", fontWeight: 700 }}>Close</button>
                </div>
                <div style={{ flex: 1, padding: 20, overflowY: "auto", fontSize: 13, whiteSpace: "pre-wrap" }}>
                   {previewDocData?.content || "Loading..."}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
