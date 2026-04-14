'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Send, Play, Database, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { THEMES, ThemeName } from '../../lib/themes';
import { PremiumHeader } from '../../components/PremiumHeader';
import { usePathname } from 'next/navigation';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, "");
const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN || '';

const DEFAULT_RAW_JSON = `{
  "message": "Svara bara med ordet BANAN",
  "mode": "direct"
}`;

export default function DevPage() {
  const [activeThemeName, setActiveThemeName] = useState<ThemeName>("midnight");
  const [rawJson, setRawJson] = useState(DEFAULT_RAW_JSON);
  const [responseText, setResponseText] = useState('No response yet');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("evoflow_theme") as ThemeName;
    if (saved && THEMES[saved]) setActiveThemeName(saved);
  }, []);

  const handleThemeChange = (name: ThemeName) => {
    setActiveThemeName(name);
    localStorage.setItem("evoflow_theme", name);
  };

  const ui = THEMES[activeThemeName] || THEMES.midnight;
  const isDark = ui.isDark;

  const parsedPayload = useMemo(() => {
    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  }, [rawJson]);

  async function createRun() {
    setError('');
    setSubmitting(true);
    setResponseText('Waiting for API response...');

    if (!parsedPayload) {
      setError('JSON is invalid. Please fix the syntax.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(DEMO_TOKEN ? { Authorization: `Bearer ${DEMO_TOKEN}` } : {}),
        },
        body: JSON.stringify(parsedPayload),
      });

      const data = await res.json();
      setResponseText(JSON.stringify(data, null, 2));
    } catch (err) {
      setError('API request failed. Ensure the server is running.');
      setResponseText(String(err));
    } finally {
      setSubmitting(false);
    }
  }

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
            <Terminal size={32} style={{ color: ui.accent }} />
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>Dev Controls</h1>
          </div>
          <p style={{ color: ui.muted, fontSize: 16, maxWidth: 600, marginBottom: 32 }}>
            Low-level API interaction and debugging panel. Send raw payloads directly to the intelligence engine.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Editor */}
            <section style={{ 
              padding: 24, 
              borderRadius: 20, 
              background: ui.panelBg, 
              border: `1px solid ${ui.panelBorder}`,
              backdropFilter: ui.glassBlur
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                 <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Request Payload</h2>
                 <div style={{ fontSize: 10, fontWeight: 900, color: ui.accent, background: ui.actionBg, padding: "4px 8px", borderRadius: 6 }}>JSON RAW</div>
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  minHeight: 380,
                  padding: 16,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  borderRadius: 12,
                  border: `1px solid ${ui.panelBorder}`,
                  background: "rgba(0,0,0,0.2)",
                  color: ui.text,
                  outline: "none",
                  resize: "vertical"
                }}
              />
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={createRun}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: '14px',
                    borderRadius: 12,
                    border: 'none',
                    background: ui.accent,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: `0 8px 24px ${ui.accent}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    transition: "all 0.2s"
                  }}
                >
                  {submitting ? 'Executing...' : 'Dispatch Payload'}
                  <Play size={16} fill="currentColor" />
                </button>
              </div>
              
              {error && (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldAlert size={14} />
                  {error}
                </div>
              )}
            </section>

            {/* Preview & Response */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
               <section style={{ 
                flex: 1,
                padding: 24, 
                borderRadius: 20, 
                background: ui.panelBg, 
                border: `1px solid ${ui.panelBorder}`,
                backdropFilter: ui.glassBlur
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px 0" }}>Engine Response</h2>
                <pre style={{
                  margin: 0,
                  padding: 16,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.3)",
                  color: ui.muted,
                  minHeight: 300,
                  maxHeight: 500,
                  overflowY: "auto",
                  border: `1px solid ${ui.panelBorder}`
                }}>
                  {responseText}
                </pre>
              </section>

              <section style={{ 
                padding: 20, 
                borderRadius: 20, 
                background: ui.actionBg, 
                border: `1px solid ${ui.panelBorder}`,
                fontSize: 12,
                color: ui.subtle,
                lineHeight: 1.6
              }}>
                <div style={{ fontWeight: 800, color: ui.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                   <CheckCircle2 size={14} style={{ color: ui.accent }} />
                   API Connectivity
                </div>
                <div><strong>Base URL:</strong> {API_BASE_URL}</div>
                <div><strong>Endpoint:</strong> /api/runs</div>
                <div><strong>Auth:</strong> {DEMO_TOKEN ? 'Bearer present' : 'Public'}</div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
