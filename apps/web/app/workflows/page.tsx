'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, ArrowRight, Clock, Box, Zap } from "lucide-react";
import { THEMES, ThemeName } from "../../lib/themes";
import { PremiumHeader } from "../../components/PremiumHeader";
import { usePathname } from "next/navigation";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  mode?: string;
  createdAt?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

export default function WorkflowsPage() {
  const [activeThemeName, setActiveThemeName] = useState<ThemeName>("midnight");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("evoflow_theme") as ThemeName;
    if (saved && THEMES[saved]) setActiveThemeName(saved);

    const fetchWorkflows = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/workflows`);
        if (!response.ok) throw new Error("Failed to fetch workflows");
        const data = await response.json();
        setWorkflows(Array.isArray(data) ? data : (data.items || []));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  const handleThemeChange = (name: ThemeName) => {
    setActiveThemeName(name);
    localStorage.setItem("evoflow_theme", name);
  };

  const ui = THEMES[activeThemeName] || THEMES.midnight;
  const isDark = ui.isDark;

  if (!isClient) return <div style={{ background: "#020617", minHeight: "100vh" }} />;

  return (
    <div style={{
      minHeight: "100vh",
      background: ui.pageBg,
      color: ui.text,
      transition: "background 0.4s ease, color 0.4s ease"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 20px" }}>
        <PremiumHeader 
          activeThemeName={activeThemeName}
          onThemeChange={handleThemeChange}
          ui={ui}
          isDark={isDark}
          activePath={pathname}
        />

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           style={{ padding: "40px 0" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Layers size={32} style={{ color: ui.accent }} />
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>Workflows</h1>
          </div>
          <p style={{ color: ui.muted, fontSize: 16, maxWidth: 600, marginBottom: 32 }}>
            Manage and orchestrate multi-step AI agents. Workflows utilize RAG and local tool execution to solve complex tasks.
          </p>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: ui.muted }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block", marginBottom: 12 }}>
                <Zap size={24} />
              </motion.div>
              <div>Connecting to Intelligence Engine...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 24, borderRadius: 16, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
              {error}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {workflows.map((workflow, i) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <Link
                    href={`/workflows/${workflow.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{
                      padding: 24,
                      borderRadius: 20,
                      background: ui.panelBg,
                      border: `1px solid ${ui.panelBorder}`,
                      backdropFilter: ui.glassBlur,
                      transition: "all 0.3s",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: ui.actionBg, display: "flex", alignItems: "center", justifyContent: "center", color: ui.accent }}>
                          <Box size={20} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: ui.accent, textTransform: "uppercase", background: ui.actionBg, padding: "4px 8px", borderRadius: 6 }}>
                          {workflow.mode || "Standard"}
                        </div>
                      </div>
                      
                      <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px 0" }}>{workflow.name}</h2>
                      <p style={{ color: ui.muted, fontSize: 14, lineHeight: 1.5, margin: "0 0 20px 0", flex: 1 }}>
                        {workflow.description || "Orchestrated intelligent workflow."}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: ui.subtle, paddingTop: 16, borderTop: `1px solid ${ui.panelBorder}` }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                           <Clock size={12} />
                           {workflow.createdAt ? new Date(workflow.createdAt).toLocaleDateString() : "Active"}
                         </div>
                         <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: ui.accent, fontWeight: 800 }}>
                            OPEN <ArrowRight size={12} />
                         </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
