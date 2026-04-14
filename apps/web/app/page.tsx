'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Layers, FileText, Swords, ArrowRight, Zap, Terminal, Brain, Globe } from 'lucide-react';
import { THEMES, ThemeName } from '../lib/themes';
import { PremiumHeader } from '../components/PremiumHeader';
import { usePathname } from 'next/navigation';

const FEATURES = [
  {
    icon: <Shield size={28} />,
    title: "100% Private",
    description: "All AI processing happens locally on your machine. No data ever leaves your network.",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  {
    icon: <Layers size={28} />,
    title: "Multi-Model Engine",
    description: "Orchestrate multiple Ollama models with intelligent auto-selection based on your task.",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    glow: "rgba(59, 130, 246, 0.15)",
  },
  {
    icon: <FileText size={28} />,
    title: "RAG Documents",
    description: "Upload PDFs and text files. The AI reads and reasons over your documents in real-time.",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    icon: <Swords size={28} />,
    title: "Battle Mode",
    description: "Compare two models side-by-side on the same prompt. See which one performs best.",
    gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    glow: "rgba(236, 72, 153, 0.15)",
  },
];

const CAPABILITIES = [
  { icon: <Zap size={16} />, label: "Streaming Responses" },
  { icon: <Brain size={16} />, label: "Reasoning Visualizer" },
  { icon: <Globe size={16} />, label: "Live Web Search" },
  { icon: <Terminal size={16} />, label: "Multi-Step Workflows" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function HomePage() {
  const [activeThemeName, setActiveThemeName] = useState<ThemeName>("midnight");
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

  if (!isClient) return <div style={{ background: "#020617", minHeight: "100vh" }} />;

  return (
    <div className="full-page-dashboard" style={{
      background: ui.pageBg,
      color: ui.text,
      transition: "background 0.4s ease, color 0.4s ease"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "8px 20px" }}>
        <PremiumHeader 
          activeThemeName={activeThemeName}
          onThemeChange={handleThemeChange}
          ui={ui}
          isDark={isDark}
          activePath={pathname}
        />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", justifyContent: "center" }}>
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            textAlign: "center",
            padding: "20px 40px",
            maxWidth: 900,
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* Floating accent orbs (Reduced count/opacity for clean 1-page) */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "20%",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 100,
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.15)",
              marginBottom: 16,
              fontSize: 12,
              fontWeight: 600,
              color: "#60a5fa",
            }}
          >
            <Zap size={12} />
            Local-First AI Operations
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 900,
              lineHeight: 1.1,
              margin: "0 0 12px 0",
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Private Multi-Model
            <br />
            Intelligence
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              fontSize: 16,
              lineHeight: 1.5,
              color: ui.muted,
              maxWidth: 540,
              margin: "0 auto 24px",
            }}
          >
            Orchestrate local AI models with a professional command center. RAG document analysis, model comparison, and real-time reasoning.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link
              href="/chat"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: 12,
                background: ui.accent,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: `0 4px 16px ${ui.accent}44`,
                transition: "all 0.3s",
              }}
            >
              Launch Chat
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/workflows"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: 12,
                background: ui.controlBg,
                color: ui.text,
                fontWeight: 600,
                fontSize: 14,
                border: `1px solid ${ui.panelBorder}`,
                transition: "all 0.3s",
              }}
            >
              Workflows
            </Link>
          </motion.div>
        </motion.section>

        {/* Feature Grid - Condensed */}
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            maxWidth: 1000,
            margin: "0 auto",
            padding: "10px 40px 40px",
            width: "100%",
          }}
        >
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              variants={item}
              style={{
                padding: 20,
                borderRadius: 16,
                background: ui.panelBg,
                border: `1px solid ${ui.panelBorder}`,
                backdropFilter: ui.glassBlur,
                transition: "all 0.3s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: feature.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                marginBottom: 12,
                boxShadow: `0 4px 12px ${feature.glow}`,
              }}>
                {feature.icon && React.cloneElement(feature.icon as React.ReactElement, { size: 18 })}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px 0" }}>{feature.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: ui.muted, margin: 0 }}>{feature.description}</p>
            </motion.div>
          ))}
        </motion.section>
      </div>

      <footer style={{
        textAlign: "center",
        padding: "16px 40px",
        borderTop: "1px solid rgba(255, 255, 255, 0.04)",
      }}>
        <div style={{ fontSize: 11, color: ui.subtle, fontWeight: 600 }}>
          Powered by <span style={{ color: ui.muted }}>Ollama</span> · <span style={{ color: ui.muted }}>Next.js</span> · <span style={{ color: ui.muted }}>Prisma</span>
        </div>
      </footer>
    </div>
  );
}
