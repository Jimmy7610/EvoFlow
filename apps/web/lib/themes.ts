
export type ThemeName = "midnight" | "obsidian" | "emerald";

export interface UIColors {
  name: string;
  isDark: boolean;
  pageBg: string;
  panelBg: string;
  panelBorder: string;
  chatCanvas: string;
  accent: string;
  text: string;
  muted: string;
  subtle: string;
  controlBg: string;
  controlBorder: string;
  actionBg: string;
  userBubble: string;
  assistantBubble: string;
  assistantBorder: string;
  glassBlur: string;
}

export const THEMES: Record<ThemeName, UIColors> = {
  midnight: {
    name: "Midnight",
    isDark: true,
    pageBg: "radial-gradient(circle at top left, rgba(29, 78, 216, 0.15), transparent 30%), radial-gradient(circle at bottom right, rgba(30, 58, 138, 0.1), transparent 30%), linear-gradient(180deg, #020617 0%, #050a1f 100%)",
    panelBg: "rgba(10, 18, 42, 0.82)",
    panelBorder: "rgba(59, 130, 246, 0.15)",
    chatCanvas: "rgba(2, 6, 23, 0.95)",
    accent: "#3b82f6",
    text: "#f8fafc",
    muted: "#94a3b8",
    subtle: "#64748b",
    controlBg: "rgba(255, 255, 255, 0.04)",
    controlBorder: "rgba(59, 130, 246, 0.1)",
    actionBg: "rgba(59, 130, 246, 0.1)",
    userBubble: "rgba(30, 64, 175, 0.25)",
    assistantBubble: "rgba(15, 23, 42, 0.95)",
    assistantBorder: "rgba(30, 64, 175, 0.15)",
    glassBlur: "blur(18px)",
  },
  obsidian: {
    name: "Obsidian",
    isDark: true,
    pageBg: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
    panelBg: "rgba(2, 6, 23, 0.85)",
    panelBorder: "rgba(255, 255, 255, 0.08)",
    chatCanvas: "#000000",
    accent: "#94a3b8",
    text: "#e2e8f0",
    muted: "#64748b",
    subtle: "#475569",
    controlBg: "rgba(255, 255, 255, 0.03)",
    controlBorder: "rgba(255, 255, 255, 0.05)",
    actionBg: "rgba(255, 255, 255, 0.05)",
    userBubble: "#1e293b",
    assistantBubble: "#0f172a",
    assistantBorder: "rgba(255, 255, 255, 0.1)",
    glassBlur: "blur(24px)",
  },
  emerald: {
    name: "Emerald",
    isDark: true,
    pageBg: "radial-gradient(circle at top left, rgba(16, 185, 129, 0.12), transparent 35%), linear-gradient(180deg, #063e2f 0%, #021a15 100%)",
    panelBg: "rgba(2, 44, 34, 0.82)",
    panelBorder: "rgba(16, 185, 129, 0.15)",
    chatCanvas: "rgba(2, 44, 34, 0.95)",
    accent: "#10b981",
    text: "#ecfdf5",
    muted: "#6ee7b7",
    subtle: "#34d399",
    controlBg: "rgba(255, 255, 255, 0.04)",
    controlBorder: "rgba(16, 185, 129, 0.1)",
    actionBg: "rgba(16, 185, 129, 0.1)",
    userBubble: "rgba(6, 78, 59, 0.4)",
    assistantBubble: "rgba(2, 44, 34, 0.9)",
    assistantBorder: "rgba(16, 185, 129, 0.15)",
    glassBlur: "blur(20px)",
  }
};
