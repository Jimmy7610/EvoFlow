import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "EvoFlow — Private AI Intelligence",
  description: "Professional-grade local AI operations dashboard. Multi-model orchestration, RAG document analysis, and real-time model comparison — all running privately on your machine.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020617", color: "#f8fafc" }}>
        <main
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 0,
            margin: 0,
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
