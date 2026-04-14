'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Layers, FileText, Swords, ArrowRight, Zap, Terminal, Brain, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
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
    <div style={{
      minHeight: "100vh",
      background: ui.pageBg,
      color: ui.text,
      overflow: "auto",
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
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          textAlign: "center",
          padding: "80px 40px 60px",
          maxWidth: 900,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Floating accent orbs */}
        <div style={{
          position: "absolute",
          top: 20,
          left: "10%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)",
          filter: "blur(40px)",
          animation: "subtle-float 8s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: 0,
          right: "5%",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)",
          filter: "blur(40px)",
          animation: "subtle-float 10s ease-in-out infinite 2s",
          pointerEvents: "none",
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 100,
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.15)",
            marginBottom: 32,
            fontSize: 13,
            fontWeight: 600,
            color: "#60a5fa",
          }}
        >
          <Zap size={14} />
          Local-First AI Operations
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 900,
            lineHeight: 1.1,
            margin: "0 0 24px 0",
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: ui.muted,
            maxWidth: 600,
            margin: "0 auto 40px",
          }}
        >
          Orchestrate local AI models with a professional command center.
          RAG document analysis, model comparison, and real-time reasoning — all running on your hardware.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
          style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link
            href="/chat"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              borderRadius: 14,
              background: ui.accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              boxShadow: `0 8px 32px ${ui.accent}55, inset 0 1px 0 rgba(255,255,255,0.1)`,
              transition: "all 0.3s",
              textDecoration: "none",
            }}
          >
            Launch Chat
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/workflows"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              borderRadius: 14,
              background: ui.controlBg,
              color: ui.text,
              fontWeight: 600,
              fontSize: 16,
              border: `1px solid ${ui.panelBorder}`,
              transition: "all 0.3s",
              textDecoration: "none",
              backdropFilter: ui.glassBlur,
            }}
          >
            View Workflows
          </Link>
        </motion.div>
      </motion.section>

      {/* Capabilities Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 32,
          padding: "24px 40px",
          flexWrap: "wrap",
        }}
      >
        {CAPABILITIES.map((cap, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: ui.muted,
          }}>
            <span style={{ color: ui.accent }}>{cap.icon}</span>
            {cap.label}
          </div>
        ))}
      </motion.div>

      {/* Feature Grid */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          maxWidth: 1100,
          margin: "40px auto 0",
          padding: "0 40px 80px",
        }}
      >
        {FEATURES.map((feature, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            style={{
              padding: 28,
              borderRadius: 20,
              background: ui.panelBg,
              border: `1px solid ${ui.panelBorder}`,
              backdropFilter: ui.glassBlur,
              cursor: "default",
              transition: "all 0.3s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = ui.accent;
              e.currentTarget.style.boxShadow = `0 20px 60px ${feature.glow}`;
              e.currentTarget.style.transform = "translateY(-6px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = ui.panelBorder;
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* Background glow */}
            <div style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: feature.glow,
              filter: "blur(40px)",
              pointerEvents: "none",
            }} />

            <div style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: feature.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              marginBottom: 20,
              boxShadow: `0 8px 24px ${feature.glow}`,
            }}>
              {feature.icon}
            </div>
            <h3 style={{
              fontSize: 18,
              fontWeight: 800,
              margin: "0 0 10px 0",
              letterSpacing: "-0.01em",
            }}>
              {feature.title}
            </h3>
            <p style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: ui.muted,
              margin: 0,
            }}>
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.section>

      {/* Tech Footer */}
      <footer style={{
        textAlign: "center",
        padding: "40px 40px 60px",
        borderTop: "1px solid rgba(255, 255, 255, 0.04)",
      }}>
        <div style={{
          fontSize: 12,
          color: ui.subtle,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}>
          Powered by <span style={{ color: ui.muted }}>Ollama</span> · <span style={{ color: ui.muted }}>Next.js</span> · <span style={{ color: ui.muted }}>Prisma</span> · <span style={{ color: ui.muted }}>Express</span>
        </div>
        <div style={{
          fontSize: 11,
          color: "#334155",
          marginTop: 8,
        }}>
          EvoFlow AI Ops — Built for professionals who value privacy.
        </div>
      </footer>
    </div>
  );
}
