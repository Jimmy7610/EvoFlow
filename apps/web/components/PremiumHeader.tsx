'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Settings, Target } from 'lucide-react';
import { ThemeName, THEMES, UIColors } from '../lib/themes';

interface PremiumHeaderProps {
  activeThemeName: ThemeName;
  onThemeChange: (name: ThemeName) => void;
  ui: UIColors;
  isDark: boolean;
  activePath: string;
}

export function PremiumHeader({ activeThemeName, onThemeChange, ui, isDark, activePath }: PremiumHeaderProps) {
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
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, color: "#fff", fontSize: 13
              }}>E</div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: ui.text }}>EvoFlow</h1>
            </div>
            <nav style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 600 }}>
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
            padding: 4, 
            borderRadius: 12, 
            border: `1px solid ${ui.panelBorder}` 
          }}>
            {(Object.keys(THEMES) as ThemeName[]).map(tName => (
              <button
                key={tName}
                onClick={() => onThemeChange(tName)}
                title={THEMES[tName].name}
                style={{
                  width: 22,
                  height: 22,
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
          
          <Link
            href="/chat"
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "6px 16px",
              borderRadius: 10,
              background: ui.accent,
              color: "#fff",
              textDecoration: "none",
              boxShadow: `0 4px 12px ${ui.accent}33`,
              transition: "all 0.2s",
            }}
          >
            Launch Chat →
          </Link>
        </div>
      </div>
    </div>
  );
}
