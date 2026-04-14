'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Settings, Target, Power, Zap, Play } from 'lucide-react';
import { ThemeName, THEMES, UIColors } from '../lib/themes';

interface PremiumHeaderProps {
  activeThemeName: ThemeName;
  onThemeChange: (name: ThemeName) => void;
  ui: UIColors;
  isDark: boolean;
  activePath: string;
}

export function PremiumHeader({ activeThemeName, onThemeChange, ui, isDark, activePath }: PremiumHeaderProps) {
  const [isSystemActive, setIsSystemActive] = React.useState(true);

  React.useEffect(() => {
    const saved = localStorage.getItem("evoflow_system_active");
    if (saved === "false") setIsSystemActive(false);
    
    const handleStorage = () => {
      const current = localStorage.getItem("evoflow_system_active");
      setIsSystemActive(current !== "false");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleSystem = (val: boolean) => {
    localStorage.setItem("evoflow_system_active", val ? "true" : "false");
    setIsSystemActive(val);
    window.dispatchEvent(new Event("storage"));
  };

  return (
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
        <div className="theme-transition">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, color: "#fff", fontSize: 13
              }}>E</div>
              <h1 className="hide-mobile" style={{ fontSize: 18, fontWeight: 800, margin: 0, color: ui.text }}>EvoFlow</h1>
            </div>
            <nav className="hide-mobile" style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 600 }}>
              <Link href="/" style={{ 
                color: activePath === '/' ? ui.text : ui.muted, 
                textDecoration: "none", 
                opacity: activePath === '/' ? 1 : 0.65,
                fontWeight: activePath === '/' ? 800 : 600
              }}>Dashboard</Link>
              <Link href="/chat" style={{ 
                color: activePath.startsWith('/chat') ? ui.text : ui.muted, 
                textDecoration: "none",
                opacity: activePath.startsWith('/chat') ? 1 : 0.65,
                fontWeight: activePath.startsWith('/chat') ? 800 : 600
              }}>Chat</Link>
              <Link href="/workflows" style={{ 
                color: activePath.startsWith('/workflows') ? ui.text : ui.muted, 
                textDecoration: "none",
                opacity: activePath.startsWith('/workflows') ? 1 : 0.65,
                fontWeight: activePath.startsWith('/workflows') ? 800 : 600
              }}>Workflows</Link>
              <Link href="/dev" style={{ 
                color: activePath.startsWith('/dev') ? ui.text : ui.muted, 
                textDecoration: "none",
                opacity: activePath.startsWith('/dev') ? 1 : 0.65,
                fontWeight: activePath.startsWith('/dev') ? 800 : 600
              }}>Dev</Link>
            </nav>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ 
            display: "flex", 
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", 
            padding: "4px 8px", 
            borderRadius: 12, 
            border: `1px solid ${ui.panelBorder}` 
          }}>
            {(Object.keys(THEMES) as ThemeName[]).map(tName => (
              <button
                key={tName}
                onClick={() => onThemeChange(tName)}
                title={THEMES[tName].name}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 7,
                  border: activeThemeName === tName ? `2px solid ${ui.accent}` : "none",
                  background: THEMES[tName].accent,
                  cursor: "pointer",
                  margin: "0 2px",
                  transition: "transform 0.2s",
                  boxShadow: activeThemeName === tName ? `0 0 8px ${ui.accent}` : "none",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              />
            ))}
          </div>
          
          {/* System Control & Launch */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isSystemActive ? (
              <button
                onClick={() => toggleSystem(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)",
                  border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"}`,
                  color: "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                title="Stop System Engine"
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)"}
              >
                <Power size={16} />
              </button>
            ) : (
              <div 
                style={{ 
                  width: 10, height: 10, borderRadius: "50%", background: "#ef4444", 
                  boxShadow: "0 0 8px #ef4444", marginRight: 4 
                }} 
                title="System Dormant" 
              />
            )}

            <Link
              href="/chat"
              onClick={() => toggleSystem(true)}
              className="theme-transition"
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "6px 14px",
                borderRadius: 10,
                background: isSystemActive ? ui.accent : ui.controlBg,
                color: isSystemActive ? "#fff" : ui.text,
                textDecoration: "none",
                boxShadow: isSystemActive ? `0 4px 12px ${ui.accent}33` : "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: isSystemActive ? "none" : `1px solid ${ui.panelBorder}`,
                transition: "all 0.2s",
              }}
            >
              {isSystemActive ? (
                 <>
                   <span className="hide-mobile">Launch </span>Chat →
                 </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  Launch Chat
                </>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
