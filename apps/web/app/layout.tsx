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
      <body style={{ margin: 0, overflow: "hidden", background: "#eef2f6", color: "#0f172a" }}>
        <main
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 0,
            margin: 0,
            overflow: "hidden",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
