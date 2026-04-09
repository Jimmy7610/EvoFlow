import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "EvoFlow AI Ops",
  description: "Operations dashboard for workflows and runs"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflowX: "hidden", background: "#eef2f6", color: "#0f172a" }}>
        <header
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "28px 12px",
            borderBottom: "1px solid #d7deea",
            background: "#f3f5f9",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              boxSizing: "border-box",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>EvoFlow AI Ops</h1>

            <nav style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/">Dashboard</Link>
              <Link href="/workflows">Workflows</Link>
              <Link href="/chat">Chat</Link>
            </nav>
          </div>
        </header>

        <main
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0 8px",
            margin: 0,
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
