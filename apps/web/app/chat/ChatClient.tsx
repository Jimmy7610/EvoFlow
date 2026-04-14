"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Trash2, Copy, Send, Plus, Search, Paperclip, ChevronRight, Check, Code, X, Settings, Palette, Target, Download, ExternalLink, Terminal, Layers, Square, Globe } from 'lucide-react';
import { THEMES, ThemeName } from '../../lib/themes';
import { PremiumHeader } from '../../components/PremiumHeader';
import { usePathname } from 'next/navigation';
import SystemStatus from "./SystemStatus";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
  modelSelection?: string;
  transport?: "normal" | "stream";
  steps?: any[]; // Day 11: Granular reasoning nodes
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
  contextSteering?: any;
};

type ChatDocument = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  content?: string;
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

type LightBoxState = {
  url: string;
  name: string;
} | null;

const EXPORT_FILE_PREFIX = "evoflow-chats";

const PERSONAS = {
  general: {
    name: "General",
    icon: "🏠",
    prompt: "You are a helpful assistant. Provide clear and accurate answers (be concise for simple direct questions, but be exhaustive and detailed if images, 1000-word requests, or complex analysis are mentioned).",
    keywords: ["llama3", "mistral", "gemma"]
  },
  coder: {
    name: "Code Expert",
    icon: "💻",
    prompt: "You are an expert software engineer. Focus on clean code, SOLID principles, design patterns, and efficient algorithms. Always provide explanation alongside code.",
    keywords: ["coder", "code", "starcoder", "deepseek"]
  },
  security: {
    name: "Security Lead",
    icon: "🛡️",
    prompt: "You are a senior cybersecurity professional. Focus on vulnerability analysis, threat modeling, and secure coding practices. Always highlight potential security risks.",
    keywords: ["security", "mistral"]
  },
  creative: {
    name: "Architect",
    icon: "🏛️",
    prompt: "You are a creative systems architect. Think big picture, focus on scalability, modularity, and innovative problem solving.",
    keywords: ["30b", "70b", "architect", "llama3.1"]
  },
  vision: {
    name: "Visual Analyst",
    icon: "👁️",
    prompt: "DU ÄR EN SPECIALISERAD VISUELL INTELLIGENS-AGENT. Ditt mål är att leverera en EXTREMT INGÅENDE och UTÖKAD analys. OM ANVÄNDAREN BER OM '1000 ORD' ELLER 'DJUP ANALYS', MÅSTE DU FÖLJA 'NARRATIVE FORCE PROTOCOL': 1. Miljö & Bakgrund (Beskriv i min 200 ord). 2. Centrala figurer & föremål (min 200 ord). 3. Texturer, färger & belysning (min 200 ord). 4. Teknisk analys (OCR, koder, UI/UX-mönster) (min 200 ord). 5. Stilistisk audit & Sammanfattning. DU FÅR INTE SAMMANFATTA. Du måste vara ordrik och beskriva varje pixel. SVARA ALLTID PÅ SAMMA SPRÅK SOM ANVÄNDAREN FRÅGAR PÅ (t.ex. SVENSKA). Om ingen bild finns, svara 'NO IMAGE DETECTED'.",
    keywords: ["llava", "vision", "gpt-4o"]
  }
};

type PersonaKey = keyof typeof PERSONAS;

// --- COMPONENTS (Day 11) ---

const ReasoningStepper = ({ steps, isDark, ui, activePersonaId }: { steps: any[], isDark: boolean, ui: any, activePersonaId?: string }) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const nodeIcons: Record<string, React.ReactNode> = {
    memory: <Globe size={14} />,
    planner: <Layers size={14} />,
    research: <Globe size={14} />,
    executor: <Terminal size={14} />,
    direct: <Square size={14} />,
  };

  const nodeLabels: Record<string, string> = {
    memory: "Context Analysis",
    planner: "Task Deconstruction",
    research: "Data Retrieval",
    executor: "Synthesis Engine",
    direct: "Direct Mode",
  };

  // Defensive check: if steps is a string (JSON from Prisma), parse it. 
  // If it's still not an array, default to empty.
  const normalizedSteps = useMemo(() => {
    if (typeof steps === 'string') {
      try { return JSON.parse(steps); } catch { return []; }
    }
    return Array.isArray(steps) ? steps : [];
  }, [steps]);

  if (normalizedSteps.length === 0) return null;

  return (
    <div style={{ margin: "12px 0", padding: "12px", borderRadius: 16, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${ui.panelBorder}` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, opacity: 0.8 }}>
        <div style={{ padding: "4px 8px", borderRadius: 6, background: ui.accent, color: "#fff", fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Reasoning Flow
        </div>
        <div style={{ fontSize: 9, color: ui.subtle, fontWeight: 600 }}>Click steps for details</div>
      </div>
      
      <div style={{ display: "grid", gap: 12, position: "relative" }}>
        {/* Connection Line */}
        <div style={{ position: "absolute", left: 11, top: 12, bottom: 12, width: 2, background: ui.panelBorder, opacity: 0.3 }} />

        {normalizedSteps.map((step: any, idx: number) => {
          const stepId = step.id || `step_${idx}`;
          const isExpanded = expandedStepId === stepId;
          const isActive = step.status === "active";
          const isCompleted = step.status === "completed";
          const icon = nodeIcons[step.node] || <Code size={14} />;

          return (
            <motion.div 
              key={stepId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative", zIndex: 1 }}
            >
              <div 
                onClick={() => setExpandedStepId(isExpanded ? null : stepId)}
                style={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: "50%", 
                  background: isCompleted ? "#22c55e" : (isActive ? ui.accent : ui.controlBg),
                  border: `2px solid ${isActive ? ui.accent : ui.panelBorder}`,
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: (isCompleted || isActive) ? "#fff" : ui.subtle,
                  boxShadow: isActive ? `0 0 12px ${ui.accent}` : "none",
                  transition: "all 0.3s",
                  cursor: "pointer"
                }}
              >
                {isCompleted ? <Check size={14} strokeWidth={3} /> : (isActive ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>{icon}</motion.div> : icon)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div 
                  onClick={() => setExpandedStepId(isExpanded ? null : stepId)}
                  style={{ fontSize: 13, fontWeight: 700, color: isActive ? ui.accent : ui.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                >
                  {nodeLabels[step.node] || step.node.toUpperCase()}
                  {isActive && <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>...</motion.span>}
                  {step.output && (
                    <div style={{ marginLeft: "auto", opacity: 0.4 }}>
                       {isExpanded ? <X size={10} /> : <div style={{ fontSize: 8 }}>VIEW</div>}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && step.output && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ 
                        marginTop: 8, 
                        padding: 12, 
                        background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", 
                        borderRadius: 12, 
                        border: `1px solid ${ui.panelBorder}`,
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: ui.text,
                        whiteSpace: "pre-wrap",
                        position: "relative"
                      }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(step.output);
                          }}
                          style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: ui.accent, cursor: "pointer", opacity: 0.6 }}
                          title="Copy details"
                        >
                          <Copy size={12} />
                        </button>
                        {step.output}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isExpanded && step.output && (
                  <div 
                    onClick={() => setExpandedStepId(stepId)}
                    style={{ fontSize: 11, opacity: 0.5, marginTop: 4, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px", cursor: "pointer" }}
                  >
                    {step.output}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const PROMPT_TEMPLATES = [
  { name: "Review Code", prompt: "Please perform a detailed code review of the following snippet. Look for bugs, security issues, and optimization opportunities:" },
  { name: "Summarize", prompt: "Please summarize the following text into 3 key bullet points:" },
  { name: "Fix Bug", prompt: "I have a bug in the following code. Please help me identify the cause and provide a fix:" },
  { name: "Write Test", prompt: "Please write comprehensive unit tests for the following function using a common testing framework:" }
];

const THEME_TOKENS = THEMES;

// --- UTILS ---
async function fetchModels(baseUrl: string, demoToken: string): Promise<{ models: string[]; defaultModel: string }> {
  try {
    const response = await fetch(`${baseUrl}/api/ollama/models`, {
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
function RichMessageContent({ content, isStreaming, isDark, ui, fontSize }: { content: string, isStreaming: boolean, isDark: boolean, ui: any, fontSize: number }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="prose-container" style={{ fontSize: fontSize, lineHeight: 1.6, color: "inherit", overflowWrap: "break-word", wordBreak: "break-word" }}>
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
          img: ({ src, alt }) => {
            const isGenerated = src?.includes("openai.com") || src?.includes("/api/generate");
            return (
              <div style={{ 
                margin: "20px 0", 
                borderRadius: 20, 
                overflow: "hidden", 
                border: isGenerated ? `2px solid ${ui.accent}66` : `1px solid ${ui.panelBorder}`,
                boxShadow: isGenerated ? `0 20px 50px ${ui.accent}33` : "0 10px 30px rgba(0,0,0,0.15)",
                background: ui.panelBg,
                padding: isGenerated ? "12px" : "0",
                maxWidth: "100%",
                position: "relative"
              }}>
                <img 
                  src={src} 
                  alt={alt} 
                  style={{ 
                    width: "100%", 
                    height: "auto", 
                    borderRadius: isGenerated ? 12 : 0, 
                    display: "block",
                    transition: "transform 0.3s"
                  }} 
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
                {isGenerated && (
                  <div style={{ padding: "12px 4px 4px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ui.accent, boxShadow: `0 0 8px ${ui.accent}` }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: ui.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Ai Generation</span>
                    </div>
                    <a href={src} target="_blank" rel="noreferrer" style={{ fontSize: 10, fontWeight: 800, color: ui.subtle, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      OPEN ORIGINAL <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            );
          },
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

// --- SUB-COMPONENT: SESSION ITEM (DAY 8 PERFORMANCE UPGRADE) ---
const SessionItem = memo(({ 
  session, 
  isActive, 
  isSelectionMode, 
  isSelected, 
  isDark, 
  ui,
  confirmDeleteId,
  hoveredSessionId,
  setHoveredSessionId,
  onSelect,
  onToggle,
  onDelete
}: {
  session: Session,
  isActive: boolean,
  isSelectionMode: boolean,
  isSelected: boolean,
  isDark: boolean,
  ui: any,
  confirmDeleteId: string,
  hoveredSessionId: string,
  setHoveredSessionId: (id: string) => void,
  onSelect: (id: string) => void,
  onToggle: (id: string) => void,
  onDelete: (id: string) => void
}) => {
  return (
    <motion.div
      onClick={() => isSelectionMode ? onToggle(session.id) : onSelect(session.id)}
      onMouseEnter={() => setHoveredSessionId(session.id)}
      onMouseLeave={() => setHoveredSessionId("")}
      style={{
        padding: "10px",
        borderRadius: 12,
        cursor: "pointer",
        background: isSelected ? (isDark ? "rgba(96,165,250,0.15)" : "#eff6ff") : (isActive ? (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9") : "transparent"),
        border: `1px solid ${isSelected ? ui.accent : (isActive ? ui.accent : "transparent")}`,
        transition: "all 0.2s",
        position: "relative"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        {isSelectionMode && (
          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSelected ? ui.accent : ui.panelBorder}`, background: isSelected ? ui.accent : "transparent", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isSelected && <Check size={10} color="#fff" strokeWidth={4} />}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: ui.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>{session.title}</div>
          <div style={{ fontSize: 10, color: ui.subtle, marginTop: 4 }}>{session.messages.length} messages · {session.workflowMode}</div>
        </div>
        
        <AnimatePresence>
          {!isSelectionMode && hoveredSessionId === session.id && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              style={{
                background: confirmDeleteId === session.id ? "#ef4444" : "none",
                border: "none",
                color: confirmDeleteId === session.id ? "#fff" : "#ef4444",
                padding: 4,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 9,
                fontWeight: 800,
                display: "flex",
                alignItems: "center"
              }}
            >
              {confirmDeleteId === session.id ? "SURE?" : <Trash2 size={12} />}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

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
  const [lightboxImage, setLightboxImage] = useState<LightBoxState>(null);
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredSessionId, setHoveredSessionId] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState("");
  const [activeThemeName, setActiveThemeName] = useState<ThemeName>("midnight");
  const pathname = usePathname();
  const [fontSize, setFontSize] = useState(14);
  const [agentViewEnabled, setAgentViewEnabled] = useState(true);
  const [devStatus, setDevStatus] = useState<DevStatusResponse["controls"] | null>(null);
  const [isDevActionLoading, setIsDevActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: "info" | "success" | "error" }[]>([]);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewDocData, setPreviewDocData] = useState<any | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonModel, setComparisonModel] = useState<string>("");
  const [comparisonPersonaId, setComparisonPersonaId] = useState<PersonaKey>("general");
  const [comparisonMessages, setComparisonMessages] = useState<Message[]>([]);
  const [isComparisonSending, setIsComparisonSending] = useState(false);
  const [devErrorText, setDevErrorText] = useState("");
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isAborted, setIsAborted] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirming, setIsBulkDeleteConfirming] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState<PersonaKey>("general");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDevControls, setShowDevControls] = useState(false);
  const [customAccentColor, setCustomAccentColor] = useState<string>("");
  const [isGlassmorphic, setIsGlassmorphic] = useState<boolean>(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  
  const [showInfraSettings, setShowInfraSettings] = useState(false);
  const [infraKeys, setInfraKeys] = useState<{ openai: string; anthropic: string }>({ openai: "", anthropic: "" });
  const [infraEndpoints, setInfraEndpoints] = useState<{ ollamaUrl: string }>({ ollamaUrl: "" });
  const [isInfraSaving, setIsInfraSaving] = useState(false);

  // Context Steering (Day 11/Fas 9)
  const [showContextSteering, setShowContextSteering] = useState(false);
  const [steeringRules, setSteeringRules] = useState({ focus: "", exclude: "", instructions: "" });
  const [isSteeringSaving, setIsSteeringSaving] = useState(false);

  // Load custom theme settings
  useEffect(() => {
    const savedAccent = localStorage.getItem("evoflow_custom_accent");
    const savedGlass = localStorage.getItem("evoflow_is_glass");
    if (savedAccent) setCustomAccentColor(savedAccent);
    if (savedGlass === "true") setIsGlassmorphic(true);
  }, []);

  // Save custom theme settings
  useEffect(() => {
    if (customAccentColor) localStorage.setItem("evoflow_custom_accent", customAccentColor);
    else localStorage.removeItem("evoflow_custom_accent");
    localStorage.setItem("evoflow_is_glass", String(isGlassmorphic));
  }, [customAccentColor, isGlassmorphic]);

  // RESTORED: Save Sessions fallback (Crucial until API sync is 100% complete)
  useEffect(() => {
    if (sessions.length > 0 && !isLoadingModels) {
      localStorage.setItem("evoflow_sessions", JSON.stringify(sessions));
    }
  }, [sessions, isLoadingModels]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeTheme = THEMES[activeThemeName];
  const isDark = activeTheme.isDark;

  const resolvedAccent = customAccentColor || activeTheme.accent;
  const rawPanelBg = activeTheme.panelBg;
  const glassPanelBg = isGlassmorphic ? rawPanelBg.replace(/[\d.]+\)$/g, '0.4)') : rawPanelBg;

  const ui = {
    name: activeThemeName,
    isDark,
    pageBg: activeTheme.pageBg,
    pageBorder: activeTheme.panelBorder,
    panelBg: glassPanelBg,
    panelBorder: activeTheme.panelBorder,
    text: activeTheme.text,
    muted: activeTheme.muted,
    subtle: activeTheme.subtle,
    controlBg: isDark ? "rgba(15,23,42,0.6)" : "#ffffff",
    controlBorder: activeTheme.panelBorder,
    chatCanvas: isGlassmorphic ? "transparent" : activeTheme.chatCanvas,
    userBubble: activeTheme.userBubble,
    assistantBubble: activeTheme.assistantBubble,
    assistantBorder: activeTheme.assistantBorder,
    actionBg: isDark ? "rgba(9,16,30,0.92)" : "#ffffff",
    actionText: activeTheme.text,
    accent: resolvedAccent,
    glassBlur: isGlassmorphic ? "blur(24px)" : "none",
  };

  // Day 11: Persistence Sync & Load (Hydrating directly from backend API)
  useEffect(() => {
    async function init() {
      const { models: m, defaultModel: dm } = await fetchModels(apiBaseUrl, demoToken);
      setModels(m);
      if (dm) setDefaultModel(dm);
      
      try {
        const setRes = await fetch(`${apiBaseUrl}/api/settings`, { headers: demoToken ? { Authorization: `Bearer ${demoToken}` } : {} });
        const setData = await setRes.json();
        if (setData.success) {
          setInfraKeys({ openai: setData.apiKeys?.openai || "", anthropic: setData.apiKeys?.anthropic || "" });
          setInfraEndpoints({ ollamaUrl: setData.endpoints?.ollamaUrl || "" });
        }
      } catch (e) {
        console.error("Failed to load infra settings", e);
      }
      
      let saved: Session[] = [];
      try {
        console.log("[Day 11] Fetching secure sessions from backend API...");
        const response = await fetch(`${apiBaseUrl}/api/sessions`, {
           headers: demoToken ? { Authorization: `Bearer ${demoToken}` } : {}
        });
        const data = await response.json();
        if (data.success && data.items && data.items.length > 0) {
           saved = data.items;
        }
      } catch(e) {
        console.error("Failed to fetch sessions from backend:", e);
        saved = loadSessions(dm || "llama3"); // Fallback
      }

      if (saved.length > 0) {
        console.log("[Day 11] Hydrating sessions from Database:", saved.length);
        setSessions(saved);
        setActiveSessionId(saved[0].id);
      } else {
        console.log("[Day 11] No sessions found, creating fresh one.");
        const fresh = createEmptySession(dm || "llama3");
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      }
      setIsLoadingModels(false);
    }
    init();
  }, [apiBaseUrl]); // Added apiBaseUrl to deps

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

  const copyWholeMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification("Copied to clipboard", "success");
  };

  async function saveInfraSettings() {
    setIsInfraSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/settings`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", ...(demoToken ? { Authorization: `Bearer ${demoToken}` } : {}) }, 
        body: JSON.stringify({ apiKeys: infraKeys, endpoints: infraEndpoints }) 
      });
      const data = await res.json();
      if (data.success) {
        addNotification("Infrastructure settings saved", "success");
        setShowInfraSettings(false);
        const { models: m } = await fetchModels(apiBaseUrl, demoToken);
        setModels(m);
      } else {
        addNotification("Failed to save settings", "error");
      }
    } catch(e) {
      addNotification("Error saving settings", "error");
    }
    setIsInfraSaving(false);
  }

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

  function toggleSessionSelection(id: string) {
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // --- Persistence Strategy (Day 14) ---
  async function ensureSessionPersisted(session: Session): Promise<string> {
    if (!session.id.startsWith("session-")) return session.id;
    
    console.log("[Day 14] Initializing temporary session on server:", session.id);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: session.title,
          model: session.model,
          transport: session.transport,
          workflowMode: session.workflowMode,
          contextSteering: session.contextSteering
        }),
      });
      const data = await resp.json();
      if (data.success && data.session) {
        const realId = data.session.id;
        // Sync local ID with DB ID immediately to prevent further race conditions
        setSessions((prev) => prev.map(s => s.id === session.id ? { ...s, id: realId } : s));
        setActiveSessionId(realId);
        return realId;
      }
      throw new Error("Session creation failed");
    } catch (e) {
      console.error("Critical failure: Session sync failed", e);
      addNotification("Sync failed - please refresh", "error");
      throw e;
    }
  }

  // --- Document Event Handlers ---
  async function handleDocumentUpload(file: File) {
    if (!activeSession) return;
    setIsUploading(true);
    try {
      // Step 1: Ensure session exists in DB
      const dbSessionId = await ensureSessionPersisted(activeSession);
      
      // Step 2: Upload document to the guaranteed ID
      const formData = new FormData();
      formData.append("file", file);
      
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${dbSessionId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (data.success && data.document) {
        patchSession(dbSessionId, (s) => ({
          ...s,
          documents: [...(s.documents || []), data.document],
        }));
        addNotification(`Uploaded ${file.name}`, "success");
      }
    } catch (e) {
      console.error("Upload failed", e);
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

  async function handlePaste(e: React.ClipboardEvent) {
    console.log("[ChatClient] Paste event detected", e.clipboardData.items.length, "items");
    const items = e.clipboardData.items;
    const files = e.clipboardData.files;
    let found = false;

    for (let i = 0; i < items.length; i++) {
      console.log(`[ChatClient] Item ${i}: type=${items[i].type}, kind=${items[i].kind}`);
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          uploadBlobAsScreenshot(blob);
          found = true;
        }
      }
    }

    if (!found && files && files.length > 0) {
      console.log("[ChatClient] Checking files collection...");
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith("image/")) {
          uploadBlobAsScreenshot(files[i]);
          found = true;
        }
      }
    }

    if (!found) {
      console.log("[ChatClient] No image found in clipboard data.");
    }
  }

  function uploadBlobAsScreenshot(blob: Blob | File) {
    const fileName = `screenshot-${Date.now()}.png`;
    const file = new File([blob], fileName, { type: "image/png" });
    addNotification("Pasting screenshot...", "info");
    handleDocumentUpload(file);
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
    
    // Batch the state update using rAF to avoid unnecessary layout work
    requestAnimationFrame(() => {
      setShouldAutoScroll(isAtBottom);
    });
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [activeSession?.messages, shouldAutoScroll]);

  const handleSendComparison = async (message: string) => {
    if (!activeSession) return;
    setIsComparisonSending(true);
    const tempId = uid("msg");
    const newMsg: Message = { id: tempId, role: "assistant", content: "", model: comparisonModel, createdAt: new Date().toISOString() };
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
          systemPrompt: PERSONAS[comparisonPersonaId].prompt
        }),
      });
      if (!resp.ok || !resp.body) throw new Error("Comparison request failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let lastSteps: any[] = [];
      let streamBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        
        // Day 11: Robust Token Filtering
        // Identify all complete tags in the current buffer
        let newContent = "";
        while (streamBuffer.length > 0) {
          const stepStartIdx = streamBuffer.indexOf("¤STEP¤");
          
          if (stepStartIdx === -1) {
            // No marker start found. 
            // BUT: if the buffer ends with '¤' or '¤S' etc., it might be a partial start.
            // Safe to take everything except a potential partial marker.
            const possiblePartial = streamBuffer.lastIndexOf("¤");
            if (possiblePartial !== -1 && streamBuffer.length - possiblePartial < 7) {
              newContent += streamBuffer.substring(0, possiblePartial);
              streamBuffer = streamBuffer.substring(possiblePartial);
              break;
            } else {
              newContent += streamBuffer;
              streamBuffer = "";
              break;
            }
          }

          // Found a start. Look for end.
          const stepEndIdx = streamBuffer.indexOf("¤", stepStartIdx + 6);
          if (stepEndIdx === -1) {
            // Incomplete tag. Move text BEFORE the tag to newContent, keep the rest in buffer.
            newContent += streamBuffer.substring(0, stepStartIdx);
            streamBuffer = streamBuffer.substring(stepStartIdx);
            break; 
          }

          // Complete tag found!
          // 1. Text before tag
          newContent += streamBuffer.substring(0, stepStartIdx);
          
          // 2. Extract and parse tag
          const tag = streamBuffer.substring(stepStartIdx, stepEndIdx + 1);
          try {
            const json = tag.replace("¤STEP¤", "").replace("¤", "");
            const step = JSON.parse(json);
            lastSteps = [...lastSteps.filter(s => s.node !== step.node || s.id === step.id), step];
          } catch(e) {}

          // 3. Advance buffer
          streamBuffer = streamBuffer.substring(stepEndIdx + 1);
        }

        full += newContent;
        setComparisonMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, content: full, steps: lastSteps } : m)));
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
    setInput("");
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

    try {
      // Step 1: Ensure Session is in DB
      const dbSessionId = await ensureSessionPersisted(activeSession);

      // Step 2: Sync User Msg
      fetch(`${apiBaseUrl}/api/sessions/${dbSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userText, model: userMessage.model, transport: userMessage.transport, modelSelection: userMessage.modelSelection }),
      }).catch(e => console.error("Sync user failed"));

      const prompt = activeSession.messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n") + (activeSession.messages.length > 0 ? "\n\n" : "") + `User: ${userText}\n\nAssistant:`;
      const payload = { 
        message: prompt, 
        mode: activeSession.workflowMode, 
        model: activeSession.model, 
        modelSelection: activeSession.modelSelection, 
        sessionId: dbSessionId,
        systemPrompt: PERSONAS[activePersonaId].prompt,
        options: {
          temperature: 0.2,
          num_predict: 8192,
          num_ctx: 16384,
        }
      };

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
        let steps: any[] = [];
        let streamBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || isAborted) break;
          streamBuffer += decoder.decode(value, { stream: true });

          // Day 11: Robust Token Filtering
          let newContent = "";
          while (streamBuffer.length > 0) {
            const stepStartIdx = streamBuffer.indexOf("¤STEP¤");
            
            if (stepStartIdx === -1) {
              const possiblePartial = streamBuffer.lastIndexOf("¤");
              if (possiblePartial !== -1 && streamBuffer.length - possiblePartial < 7) {
                newContent += streamBuffer.substring(0, possiblePartial);
                streamBuffer = streamBuffer.substring(possiblePartial);
                break;
              } else {
                newContent += streamBuffer;
                streamBuffer = "";
                break;
              }
            }

            const stepEndIdx = streamBuffer.indexOf("¤", stepStartIdx + 6);
            if (stepEndIdx === -1) {
              newContent += streamBuffer.substring(0, stepStartIdx);
              streamBuffer = streamBuffer.substring(stepStartIdx);
              break; 
            }

            newContent += streamBuffer.substring(0, stepStartIdx);
            const tag = streamBuffer.substring(stepStartIdx, stepEndIdx + 1);
            try {
              const json = tag.replace("¤STEP¤", "").replace("¤", "");
              const step = JSON.parse(json);
              steps = [...steps.filter(s => s.node !== step.node || s.id === step.id), step];
            } catch(e) {}
            streamBuffer = streamBuffer.substring(stepEndIdx + 1);
          }

          full += newContent;
          patchSession(activeSession.id, (s) => ({
            ...s,
            messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: full, steps } : m)),
          }));
        }

        // Final Sync to DB
        fetch(`${apiBaseUrl}/api/sessions/${activeSession.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: full, model: modelFromHeader, transport: "stream", modelSelection: selectionFromHeader, steps }),
        }).catch(e => console.error("Sync assistant failed"));
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
        const isConnError = error instanceof TypeError && error.message.includes("fetch");
        setErrorText(isConnError ? "Connection Lost: EvoFlow API or Ollama is offline." : (error instanceof Error ? error.message : "Chat failed"));
        if (isConnError) console.warn("[EvoFlow] Connection error — API or Ollama may be offline.");
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
    // Load preferences
    const savedTheme = localStorage.getItem("evoflow_theme") as ThemeName;
    if (savedTheme && THEMES[savedTheme]) setActiveThemeName(savedTheme);
    const savedSize = localStorage.getItem("evoflow_font_size");
    if (savedSize) setFontSize(parseInt(savedSize));

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
    localStorage.setItem("evoflow_theme", activeThemeName);
  }, [activeThemeName]);

  useEffect(() => {
    localStorage.setItem("evoflow_font_size", fontSize.toString());
  }, [fontSize]);



  useEffect(() => {
    refreshDevStatus();
    const t = setInterval(refreshDevStatus, 5000);
    return () => clearInterval(t);
  }, [apiBaseUrl, demoToken]);

  // Export/Import Helpers
  function convertToMarkdown(sessionsToExport: Session[]): string {
    return sessionsToExport.map(s => {
      let md = `# ${s.title}\n\n`;
      md += `**Date:** ${s.createdAt}\n`;
      md += `**Model:** ${s.model}\n`;
      md += `**Messages:** ${s.messages.length}\n\n`;
      md += `---\n\n`;
      s.messages.forEach(m => {
        md += `### ${m.role === "user" ? "YOU" : "EVOFLOW"} (${m.model || s.model})\n\n`;
        md += `${m.content}\n\n`;
        md += `*Sent at ${m.createdAt}*\n\n`;
      });
      return md;
    }).join("\n\n---\n\n");
  }

  async function handleExportChats(format: "json" | "markdown" = "json") {
    const sessionsToExport = isSelectionMode && selectedSessionIds.size > 0 
      ? sessions.filter(s => selectedSessionIds.has(s.id))
      : sessions;

    let content: string;
    let extension: string;
    let type: string;

    if (format === "markdown") {
      content = convertToMarkdown(sessionsToExport);
      extension = "md";
      type = "text/markdown";
    } else {
      content = JSON.stringify(createExportPayload(sessionsToExport), null, 2);
      extension = "json";
      type = "application/json";
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${EXPORT_FILE_PREFIX}-${new Date().getTime()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification(`Exported ${sessionsToExport.length} sessions as ${format.toUpperCase()}`, "success");
  }

  async function handleBulkDelete() {
    if (selectedSessionIds.size === 0) return;
    
    if (!isBulkDeleteConfirming) {
      setIsBulkDeleteConfirming(true);
      setTimeout(() => setIsBulkDeleteConfirming(false), 5000); // Reset after 5s
      return;
    }

    setIsBulkDeleteConfirming(false);

    const idsToDelete = Array.from(selectedSessionIds);
    
    setSessions(prev => {
      const remaining = prev.filter(s => !selectedSessionIds.has(s.id));
      if (selectedSessionIds.has(activeSessionId)) {
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : "");
      }
      return remaining;
    });

    setIsSelectionMode(false);
    setSelectedSessionIds(new Set());

    try {
      await Promise.all(idsToDelete.map(id => fetch(`${apiBaseUrl}/api/sessions/${id}`, { method: "DELETE" })));
      addNotification(`Deleted ${idsToDelete.length} sessions`, "success");
    } catch (e) {
      console.error("Bulk delete API failed", e);
      addNotification("Some deletions failed on server", "error");
    }
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

  // Load context steering when active session changes
  useEffect(() => {
    if (activeSession && activeSession.contextSteering) {
      try {
        const rules = JSON.parse(activeSession.contextSteering);
        setSteeringRules({
          focus: rules.focus?.join(", ") || "",
          exclude: rules.exclude?.join(", ") || "",
          instructions: rules.instructions || ""
        });
      } catch (e) {
        console.error("Failed to parse steering rules", e);
      }
    } else {
      setSteeringRules({ focus: "", exclude: "", instructions: "" });
    }
  }, [activeSessionId, activeSession?.contextSteering]);

  async function saveSteeringSettings() {
    if (!activeSessionId) return;
    setIsSteeringSaving(true);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/sessions/${activeSessionId}/steering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          steering: {
            focus: steeringRules.focus.split(",").map(s => s.trim()).filter(Boolean),
            exclude: steeringRules.exclude.split(",").map(s => s.trim()).filter(Boolean),
            instructions: steeringRules.instructions
          }
        })
      });
      if (resp.ok) {
        addNotification("Context focus updated", "success");
        setShowContextSteering(false);
      }
    } catch (e) {
      addNotification("Failed to save context focus", "error");
    } finally {
      setIsSteeringSaving(false);
    }
  }

  function getOptimalModelForPersona(personaKey: PersonaKey) {
    const persona = PERSONAS[personaKey];
    if (!persona.keywords) return null;
    
    // Search for a model name that contains any of the keywords
    for (const kw of persona.keywords) {
      const found = models.find(m => m.toLowerCase().includes(kw.toLowerCase()));
      if (found) return found;
    }
    return null;
  }

  function handlePersonaChange(key: PersonaKey) {
    setActivePersonaId(key);
    
    // Smart Switch Logic (Day 10)
    const bestModel = getOptimalModelForPersona(key);
    if (bestModel && activeSession && activeSession.model !== bestModel) {
      updateActiveSessionField("model", bestModel);
      addNotification(`Optimized for ${bestModel.toUpperCase()}`, "success");
    }
  }

  function handleComparisonPersonaChange(key: PersonaKey) {
    setComparisonPersonaId(key);
    
    // Smart Switch Logic (Day 10)
    const bestModel = getOptimalModelForPersona(key);
    if (bestModel && comparisonModel !== bestModel) {
      setComparisonModel(bestModel);
      addNotification(`Comparison optimized for ${bestModel.toUpperCase()}`, "success");
    }
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
        transition: "background 0.4s ease, color 0.4s ease"
      }}
    >
      {/* --- HEADER --- */}
      <PremiumHeader 
        activeThemeName={activeThemeName} 
        onThemeChange={setActiveThemeName} 
        ui={ui} 
        isDark={isDark} 
        activePath={pathname}
      />
      
      <div style={{ position: "relative" }}>
        <AnimatePresence>
          {showContextSteering && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{ position: "absolute", top: 10, right: 0, width: 280, background: ui.panelBg, backdropFilter: "blur(24px)", border: `1px solid ${ui.panelBorder}`, borderRadius: 16, padding: 18, boxShadow: "0 10px 40px rgba(0,0,0,0.4)", zIndex: 200, WebkitBackdropFilter: "blur(24px)" }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: ui.text, marginBottom: 4 }}>Context Steering</div>
              <div style={{ fontSize: 11, color: ui.subtle, marginBottom: 16 }}>Fine-tune AI memory & session focus</div>

              <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                     <label style={{ fontSize: 11, fontWeight: 700, color: ui.subtle }}>Focus Keywords</label>
                     <span style={{ fontSize: 9, color: ui.accent, fontWeight: 900, textTransform: "uppercase" }}>High Priority</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. typescript, schema, api" 
                    value={steeringRules.focus}
                    onChange={e => setSteeringRules(v => ({ ...v, focus: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${ui.controlBorder}`, background: ui.controlBg, color: ui.text, fontSize: 12, outline: "none" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                     <label style={{ fontSize: 11, fontWeight: 700, color: ui.subtle }}>Excluded Topics</label>
                     <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 900, textTransform: "uppercase" }}>Block</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. baking, pets" 
                    value={steeringRules.exclude}
                    onChange={e => setSteeringRules(v => ({ ...v, exclude: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${ui.controlBorder}`, background: ui.controlBg, color: ui.text, fontSize: 12, outline: "none" }}
                  />
                </div>
              </div>

              <button 
                onClick={saveSteeringSettings}
                disabled={isSteeringSaving}
                style={{ 
                  width: "100%", padding: "12px", borderRadius: 12, border: "none", 
                  background: ui.accent, color: "#fff", fontWeight: 800, 
                  cursor: isSteeringSaving ? "wait" : "pointer", opacity: isSteeringSaving ? 0.7 : 1,
                  boxShadow: `0 8px 16px ${ui.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                {isSteeringSaving ? "Updating..." : "Apply Context Steering"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInfraSettings && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{ position: "absolute", top: 10, right: 0, width: 320, background: ui.panelBg, backdropFilter: "blur(24px)", border: `1px solid ${ui.panelBorder}`, borderRadius: 16, padding: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.4)", zIndex: 200, WebkitBackdropFilter: "blur(24px)" }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: ui.text, marginBottom: 12 }}>Cloud Infrastructure</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: ui.subtle, marginBottom: 4 }}>OpenAI API Key</label>
                <input type="password" placeholder="sk-..." value={infraKeys.openai} onChange={e => setInfraKeys(v => ({ ...v, openai: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${ui.controlBorder}`, background: ui.controlBg, color: ui.text, fontSize: 12 }} />
              </div>
              <button onClick={saveInfraSettings} disabled={isInfraSaving} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: ui.accent, color: "#fff", fontWeight: 700 }}>{isInfraSaving ? "Saving..." : "Save Settings"}</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showThemeSettings && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{ position: "absolute", top: 10, right: 0, width: 220, background: ui.panelBg, backdropFilter: "blur(24px)", border: `1px solid ${ui.panelBorder}`, borderRadius: 16, padding: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.4)", zIndex: 200, WebkitBackdropFilter: "blur(24px)" }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: ui.subtle, textTransform: "uppercase", marginBottom: 12 }}>Glass Mode</div>
              <button onClick={() => setIsGlassmorphic(!isGlassmorphic)} style={{ width: "100%", padding: "8px", borderRadius: 8, background: isGlassmorphic ? ui.accent : ui.controlBg, border: "none", color: "#fff", fontWeight: 700 }}>{isGlassmorphic ? "Disable Glass" : "Enable Glass"}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {devErrorText && <div style={{ marginBottom: 10, padding: 10, borderRadius: 12, background: isDark ? "rgba(127,29,29,0.2)" : "#fff1f2", color: "#ef4444", fontSize: 13 }}>{devErrorText}</div>}

      {/* --- CONTENT AREA --- */}
      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 12, flex: 1, overflow: "hidden", paddingBottom: 10 }}>
        {/* Sidebar */}
        <aside style={{ border: `1px solid ${ui.panelBorder}`, borderRadius: 16, background: ui.panelBg, backdropFilter: ui.glassBlur, outline: isGlassmorphic ? `1px solid rgba(255,255,255,0.05)` : "none", transition: "all 0.3s", padding: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: ui.subtle, textTransform: "uppercase" }}>Sessions</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedSessionIds(new Set()); }} style={{ padding: "2px 8px", borderRadius: 6, background: isSelectionMode ? ui.accent : "transparent", color: isSelectionMode ? "#fff" : ui.subtle, border: isSelectionMode ? "none" : `1px solid ${ui.panelBorder}`, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{isSelectionMode ? "Done" : "Manage"}</button>
              <button onClick={handleCreateSession} style={{ padding: "2px 8px", borderRadius: 6, background: ui.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New</button>
            </div>
          </div>
          
          <input type="text" placeholder="Search sessions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 12, background: ui.controlBg, border: `1px solid ${ui.controlBorder}`, color: ui.text, fontSize: 12, marginBottom: 12, outline: "none" }} />

          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 6 }}>
            <AnimatePresence>
              {sessions.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map(session => (
                <SessionItem 
                  key={session.id}
                  session={session}
                  isActive={activeSessionId === session.id}
                  isSelected={selectedSessionIds.has(session.id)}
                  isSelectionMode={isSelectionMode}
                  isDark={isDark}
                  ui={ui}
                  confirmDeleteId={confirmDeleteId}
                  hoveredSessionId={hoveredSessionId}
                  setHoveredSessionId={setHoveredSessionId}
                  onSelect={setActiveSessionId}
                  onToggle={toggleSessionSelection}
                  onDelete={handleDeleteSession}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Files section in sidebar */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${ui.panelBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase" }}>📎 Documents</span>
              <button title="Upload a file for AI context" onClick={() => docInputRef.current?.click()} style={{ fontSize: 10, color: ui.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>+ Upload</button>
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

          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                style={{
                  marginTop: "auto",
                  padding: "12px",
                  borderRadius: 16,
                  background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)",
                  border: `1px solid ${ui.panelBorder}`,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 900, color: ui.subtle, marginBottom: 10, textAlign: "center", textTransform: "uppercase" }}>Selected: {selectedSessionIds.size}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  <button 
                    onClick={() => handleExportChats("markdown")}
                    disabled={selectedSessionIds.size === 0}
                    style={{ width: "100%", padding: "6px", borderRadius: 8, background: ui.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: selectedSessionIds.size === 0 ? 0.4 : 1 }}
                  >
                    Export as MD
                  </button>
                  <button 
                    onClick={() => handleExportChats("json")}
                    disabled={selectedSessionIds.size === 0}
                    style={{ width: "100%", padding: "6px", borderRadius: 8, background: ui.actionBg, color: ui.text, border: `1px solid ${ui.panelBorder}`, fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: selectedSessionIds.size === 0 ? 0.4 : 1 }}
                  >
                    Export as JSON
                  </button>
                   <button 
                    onClick={handleBulkDelete}
                    disabled={selectedSessionIds.size === 0}
                    style={{ 
                      width: "100%", 
                      padding: "6px", 
                      borderRadius: 8, 
                      background: isBulkDeleteConfirming ? "#b91c1c" : "#ef4444", 
                      color: "#fff", 
                      border: "none", 
                      fontSize: 11, 
                      fontWeight: 800, 
                      cursor: "pointer", 
                      opacity: selectedSessionIds.size === 0 ? 0.4 : 1,
                      transition: "all 0.2s",
                      boxShadow: isBulkDeleteConfirming ? "0 0 12px rgba(239, 68, 68, 0.4)" : "none"
                    }}
                  >
                    {isBulkDeleteConfirming ? `CONFIRM DELETE ${selectedSessionIds.size}?` : `Delete Selected (${selectedSessionIds.size})`}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
           {/* System Engine Status (Day 9) */}
           <div style={{ padding: "0 16px 16px 16px" }}>
             <SystemStatus apiBaseUrl={apiBaseUrl} onEvent={(msg, type) => addNotification(msg, type)} />
           </div>
         </aside>

        {/* Main Chat Area */}
        <section style={{ border: `1px solid ${ui.panelBorder}`, borderRadius: 16, background: ui.panelBg, backdropFilter: ui.glassBlur, outline: isGlassmorphic ? `1px solid rgba(255,255,255,0.05)` : "none", transition: "all 0.3s", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {activeSession && (
            <>
              {/* Toolbar */}
              <div style={{ padding: "8px 16px", borderBottom: `1px solid ${ui.panelBorder}`, display: "flex", gap: 12, alignItems: "center", background: isDark ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.02)" }}>
                <select title="Direct = Fast single answer | Multi-step = Deep analysis with research" value={activeSession.workflowMode} onChange={e => updateActiveSessionField("workflowMode", e.target.value as any)} style={{ background: "none", border: "none", color: ui.subtle, fontSize: 11, fontWeight: 700, outline: "none", cursor: "pointer" }}>
                  <option value="direct">DIRECT MODE</option>
                  <option value="multi-step">MULTI-STEP MODE</option>
                </select>
                <span style={{ fontSize: 10, color: ui.subtle, opacity: 0.5, fontWeight: 500 }}>{activeSession.workflowMode === "direct" ? "Fast answer" : "Deep analysis + web research"}</span>
                <div style={{ width: 1, height: 12, background: ui.panelBorder, alignSelf: "center" }} />
                <select 
                  value={activeSession.model} 
                  onChange={e => updateActiveSessionField("model", e.target.value)} 
                  style={{ background: "none", border: "none", color: ui.accent, fontSize: 11, fontWeight: 900, outline: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.02em" }}
                >
                  {models.filter(m => !m.startsWith("gpt-")).length > 0 && (
                    <optgroup label="LOCAL OLLAMA MODELS" style={{ background: ui.panelBg, color: ui.subtle, fontSize: 9 }}>
                      {models.filter(m => !m.startsWith("gpt-")).map(m => (
                        <option key={m} value={m} style={{ background: ui.panelBg, color: ui.text, fontSize: 11 }}>{m.toUpperCase()}</option>
                      ))}
                    </optgroup>
                  )}
                  {models.filter(m => m.startsWith("gpt-")).length > 0 && (
                    <optgroup label="CLOUD MODELS (OPENAI)" style={{ background: ui.panelBg, color: ui.subtle, fontSize: 9 }}>
                      {models.filter(m => m.startsWith("gpt-")).map(m => (
                        <option key={m} value={m} style={{ background: ui.panelBg, color: ui.text, fontSize: 11 }}>{m.toUpperCase()}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Messages Container */}
              <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                <div ref={scrollContainerRef} onScroll={handleScroll} className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px 20px", background: ui.chatCanvas, transition: "background 0.3s" }}>
                  <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
                    {activeSession.messages.length === 0 ? (
                      <div style={{ textAlign: "center", marginTop: 40, paddingBottom: 40 }}>
                        {/* Welcome Header */}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{ marginBottom: 40 }}
                        >
                          <div style={{ 
                            width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg, ${ui.accent}, ${ui.accent}88)`, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: `0 20px 40px ${ui.accent}44`,
                            animation: "float 4s ease-in-out infinite"
                          }}>
                            🚀
                          </div>
                          <h2 style={{ fontSize: 28, fontWeight: 900, color: ui.text, marginBottom: 8, letterSpacing: "-0.02em" }}>EvoFlow Intelligence</h2>
                          <p style={{ fontSize: 15, color: ui.subtle, maxWidth: 450, margin: "0 auto", lineHeight: 1.6, fontWeight: 500 }}>
                            Hybrid local-cloud intelligence. Use <span style={{ color: ui.text, fontWeight: 700 }}>DIRECT</span> for speed or <span style={{ color: ui.text, fontWeight: 700 }}>MULTI-STEP</span> for deep automated research.
                          </p>
                        </motion.div>

                        {/* Quick Action Tiles */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 480, margin: "0 auto 32px" }}>
                          {[
                            { icon: "💬", label: "Ask a question", hint: "Chat with your local AI", action: () => textareaRef.current?.focus() },
                            { icon: "📎", label: "Upload a document", hint: "PDF or text for AI context", action: () => docInputRef.current?.click() },
                            { icon: "⚔️", label: "Compare models", hint: "Battle Mode benchmark", action: () => setIsComparisonMode(true) },
                            { icon: "⚡", label: "Quick templates", hint: "Code review, summarize...", action: () => setShowTemplates(true) },
                          ].map((tile, i) => (
                            <button
                              key={i}
                              onClick={tile.action}
                              style={{
                                padding: "16px",
                                borderRadius: 16,
                                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                                border: `1px solid ${ui.panelBorder}`,
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.2s",
                                color: ui.text,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = ui.accent; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = ui.panelBorder; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"; }}
                            >
                              <div style={{ fontSize: 24, marginBottom: 8 }}>{tile.icon}</div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{tile.label}</div>
                              <div style={{ fontSize: 11, color: ui.subtle, marginTop: 4 }}>{tile.hint}</div>
                            </button>
                          ))}
                        </div>

                        {/* Example Prompts */}
                        <div style={{ maxWidth: 480, margin: "0 auto" }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: ui.subtle, textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.05em" }}>Try an example</div>
                          <div style={{ display: "grid", gap: 8 }}>
                            {[
                              "Explain the difference between REST and GraphQL with pros and cons",
                              "Write a TypeScript function that validates email addresses",
                              "What are the OWASP Top 10 security vulnerabilities?"
                            ].map((prompt, i) => (
                              <button
                                key={i}
                                onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                                style={{
                                  padding: "12px 16px",
                                  borderRadius: 12,
                                  background: "transparent",
                                  border: `1px solid ${ui.panelBorder}`,
                                  color: ui.muted,
                                  fontSize: 13,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 0.2s",
                                  lineHeight: 1.4,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = ui.text; e.currentTarget.style.borderColor = ui.accent; }}
                                onMouseLeave={e => { e.currentTarget.style.color = ui.muted; e.currentTarget.style.borderColor = ui.panelBorder; }}
                              >
                                → {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
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
                              initial={{ opacity: 0, y: 15, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ 
                                duration: 0.4, 
                                ease: [0.23, 1, 0.32, 1],
                                delay: idx === activeSession.messages.length - 1 ? 0 : idx * 0.05
                              }}
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
                                position: "relative",
                                overflowWrap: "break-word",
                                wordBreak: "break-word",
                                minWidth: 0
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
                                
                                {message.role === "assistant" && message.steps && message.steps.length > 0 && (
                                   <ReasoningStepper steps={message.steps} isDark={isDark} activePersonaId={activePersonaId} ui={ui} />
                                )}

                                <RichMessageContent content={message.content} isStreaming={isStreaming} isDark={isDark} ui={ui} fontSize={fontSize} />
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
                       <select 
                        value={comparisonModel} 
                        onChange={e => setComparisonModel(e.target.value)} 
                        style={{ background: "none", border: `1px solid ${ui.accent}`, color: ui.accent, fontSize: 10, fontWeight: 800, outline: "none", cursor: "pointer", borderRadius: 4, padding: "2px 4px" }}
                      >
                        {models.map(m => (
                          <option key={m} value={m} style={{ background: ui.panelBg, color: ui.text }}>{m.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Comparison Persona Selector (Day 10) */}
                    <div style={{ padding: "0 12px 12px 12px", borderBottom: `1px solid ${ui.panelBorder}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(Object.entries(PERSONAS) as [PersonaKey, typeof PERSONAS.general][]).map(([key, p]) => {
                        const bestModelMatch = getOptimalModelForPersona(key as PersonaKey);
                        const isOptimized = comparisonModel === bestModelMatch;
                        
                        return (
                          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <button
                              onClick={() => handleComparisonPersonaChange(key as PersonaKey)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                borderRadius: 100,
                                background: comparisonPersonaId === key ? ui.accent : "transparent",
                                color: comparisonPersonaId === key ? "#fff" : ui.subtle,
                                border: `1px solid ${comparisonPersonaId === key ? ui.accent : ui.panelBorder}`,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s"
                              }}
                            >
                              <span style={{ fontSize: 12 }}>{p.icon}</span>
                              {p.name}
                              {isOptimized && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />}
                            </button>
                            {isOptimized && (
                              <span style={{ fontSize: 8, opacity: 0.5, fontWeight: 700, color: ui.accent }}>
                                (Opt)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gap: 12 }}>
                      {comparisonMessages.map(m => (
                        <div key={m.id} style={{ padding: 10, borderRadius: 12, border: `1px solid ${ui.panelBorder}`, background: ui.panelBg }}>
                          
                          {m.steps && m.steps.length > 0 && (
                             <div style={{ marginBottom: 12 }}>
                                <ReasoningStepper steps={m.steps} isDark={isDark} activePersonaId={comparisonPersonaId} ui={ui} />
                             </div>
                          )}

                          <RichMessageContent content={m.content} isStreaming={isComparisonSending && m.id === comparisonMessages[comparisonMessages.length-1].id} isDark={isDark} ui={ui} fontSize={fontSize - 1} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div style={{ padding: "10px 20px 20px 20px", borderTop: `1px solid ${ui.panelBorder}`, background: ui.panelBg }}>
                 <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    
                    {/* Persona Selector (Day 10 + Day 12 Clarity) */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 4 }}>
                        {(Object.entries(PERSONAS) as [PersonaKey, typeof PERSONAS.general][]).map(([key, p]) => {
                          const bestModelMatch = getOptimalModelForPersona(key as PersonaKey);
                          const isOptimized = activeSession?.model === bestModelMatch;
                          const description = p.prompt.length > 80 ? p.prompt.substring(0, 77) + "..." : p.prompt;
                          
                          return (
                            <button
                              key={key}
                              title={p.prompt}
                              onClick={() => handlePersonaChange(key as PersonaKey)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 14px",
                                borderRadius: 100,
                                background: activePersonaId === key ? ui.accent : "transparent",
                                color: activePersonaId === key ? "#fff" : ui.subtle,
                                border: `1px solid ${activePersonaId === key ? ui.accent : ui.panelBorder}`,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s"
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{p.icon}</span>
                              {p.name}
                              {isOptimized && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} title="Optimized model matched" />}
                            </button>
                          );
                        })}
                      </div>
                      {/* Active Persona Description */}
                      <div style={{ fontSize: 11, color: ui.subtle, opacity: 0.7, marginTop: 6, fontStyle: "italic", display: "flex", gap: 6, alignItems: "center" }}>
                        <span>{PERSONAS[activePersonaId].icon}</span>
                        <span>{PERSONAS[activePersonaId].name} — {PERSONAS[activePersonaId].prompt.length > 90 ? PERSONAS[activePersonaId].prompt.substring(0, 87) + "..." : PERSONAS[activePersonaId].prompt}</span>
                      </div>
                    </div>

                    {/* Attachment Chips */}
                    <AnimatePresence>
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, padding: "8px 0" }}
                        >
                          {activeSession.documents.map(doc => {
                            const isImage = ["png", "jpg", "jpeg", "bmp", "gif", "webp", "image"].includes(doc.type);
                            return (
                              <div key={doc.id} style={{ 
                                position: "relative",
                                display: "flex", 
                                alignItems: "center", 
                                gap: 6, 
                                padding: isImage ? "4px" : "4px 10px", 
                                borderRadius: 12, 
                                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", 
                                border: `1px solid ${ui.panelBorder}`,
                                fontSize: 11, 
                                color: ui.text,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}>
                                {isImage ? (
                                  <div 
                                    onClick={() => setLightboxImage({ 
                                      url: doc.content?.startsWith("data:") ? doc.content : `data:image/${doc.type === 'jpg' ? 'jpeg' : (doc.type || 'png')};base64,${doc.content}`,
                                      name: doc.name 
                                    })}
                                    style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", border: `1px solid ${ui.panelBorder}`, cursor: "pointer", transition: "transform 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                  >
                                    <img 
                                      src={doc.content?.startsWith("data:") ? doc.content : `data:image/${doc.type === 'jpg' ? 'jpeg' : (doc.type || 'png')};base64,${doc.content}`} 
                                      alt={doc.name} 
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <Paperclip size={12} style={{ color: ui.accent }} />
                                    <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{doc.name}</span>
                                  </>
                                )}
                                <button 
                                  onClick={() => handleDeleteDocument(doc.id)} 
                                  style={{ 
                                    position: "absolute", 
                                    top: -6, 
                                    right: -6, 
                                    width: 18, 
                                    height: 18, 
                                    borderRadius: "50%", 
                                    background: "#ef4444", 
                                    color: "#fff", 
                                    border: "none", 
                                    fontSize: 10, 
                                    fontWeight: 900, 
                                    cursor: "pointer", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                  }}
                                >×</button>
                              </div>
                            );
                          })}
                        </motion.div>
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
                            onChange={e => setInput(e.target.value)} onPaste={handlePaste} 
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
                              padding: "14px 44px 14px 16px", 
                              border: "none", 
                              background: "none", 
                              color: ui.text, 
                              fontSize: 15, 
                              lineHeight: 1.5,
                              outline: "none", 
                              resize: "none" 
                            }} 
                          />
                           {/* Quick Prompts (Day 9) */}
                           <div style={{ position: "absolute", right: 8, bottom: 8, display: "flex", gap: 4 }}>
                             <button
                               onClick={() => setShowTemplates(!showTemplates)}
                               style={{
                                 width: 32,
                                 height: 32,
                                 borderRadius: 8,
                                 background: showTemplates ? ui.accent : "transparent",
                                 color: showTemplates ? "#fff" : ui.subtle,
                                 border: "none",
                                 cursor: "pointer",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 transition: "all 0.2s"
                               }}
                               title="Quick Prompts"
                             >
                               <span style={{ fontSize: 14 }}>⚡</span>
                             </button>
                             <AnimatePresence>
                               {showTemplates && (
                                 <motion.div
                                   initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                   style={{
                                     position: "absolute",
                                     bottom: 40,
                                     right: 0,
                                     width: 200,
                                     background: ui.panelBg,
                                     border: `1px solid ${ui.panelBorder}`,
                                     borderRadius: 12,
                                     boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                                     padding: 6,
                                     zIndex: 1000,
                                     display: "grid",
                                     gap: 2
                                   }}
                                 >
                                   <div style={{ fontSize: 9, fontWeight: 900, color: ui.subtle, padding: "4px 8px", textTransform: "uppercase" }}>Templates</div>
                                   {PROMPT_TEMPLATES.map((t, i) => (
                                     <button
                                       key={i}
                                       onClick={() => {
                                         setInput(prev => prev + (prev.endsWith(" ") || !prev ? "" : " ") + t.prompt);
                                         setShowTemplates(false);
                                         textareaRef.current?.focus();
                                       }}
                                       style={{
                                         textAlign: "left",
                                         padding: "8px 10px",
                                         borderRadius: 8,
                                         background: "transparent",
                                         color: ui.text,
                                         border: "none",
                                         fontSize: 12,
                                         cursor: "pointer",
                                         transition: "background 0.2s"
                                       }}
                                       onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                       onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                     >
                                       {t.name}
                                     </button>
                                   ))}
                                 </motion.div>
                               )}
                             </AnimatePresence>
                           </div>
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
      <input ref={docInputRef} type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.bmp,.gif,.webp" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocumentUpload(f); }} />

      {/* Modern Toast Notifications */}
      <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column-reverse", gap: 8, zIndex: 9999 }}>
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id} 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 10, scale: 0.95 }} 
              style={{ padding: "10px 18px", borderRadius: 20, background: ui.panelBg, backdropFilter: ui.glassBlur || "blur(12px)", border: `1px solid ${n.type === "error" ? "#ef4444" : (n.type === "success" ? "#10b981" : ui.panelBorder)}`, color: ui.text, fontSize: 13, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.type === "error" ? "#ef4444" : (n.type === "success" ? "#10b981" : ui.accent) }} />
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDocId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
             <div style={{ width: "90%", maxWidth: 1000, maxHeight: "90%", background: ui.panelBg, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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

      {/* --- LIGHTBOX (Day 21) --- */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.92)",
              backdropFilter: "blur(12px)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              cursor: "zoom-out"
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: "relative",
                maxWidth: "100%",
                maxHeight: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                cursor: "default"
              }}
            >
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.name}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  borderRadius: 16,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}
              />
              
              <div style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(255,255,255,0.1)", padding: "12px 24px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{lightboxImage.name}</span>
                <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)" }} />
                <a 
                  href={lightboxImage.url} 
                  download={lightboxImage.name}
                  onClick={e => e.stopPropagation()}
                  style={{ color: ui.accent, fontSize: 12, fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
                >
                  Download Image
                </a>
                <button 
                  onClick={() => setLightboxImage(null)}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 800, paddingLeft: 8 }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}
