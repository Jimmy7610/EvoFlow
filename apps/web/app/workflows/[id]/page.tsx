
import Link from "next/link";
import WorkflowRunner from "./WorkflowRunner";

type Workflow = {
  id: string;
  name: string;
  description?: string;
  mode?: string;
  createdAt?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

async function getWorkflows(): Promise<Workflow[]> {
  const candidates = ["/workflows", "/api/workflows"];

  for (const path of candidates) {
    const url = `${API_BASE_URL}${path}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEMO_TOKEN ?? ""}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        return data as Workflow[];
      }

      if (data && typeof data === "object") {
        if (Array.isArray((data as { items?: unknown[] }).items)) {
          return (data as { items: Workflow[] }).items;
        }

        if (Array.isArray((data as { workflows?: unknown[] }).workflows)) {
          return (data as { workflows: Workflow[] }).workflows;
        }

        if (
          (data as { data?: { items?: unknown[] } }).data &&
          Array.isArray((data as { data: { items?: unknown[] } }).data.items)
        ) {
          return (data as { data: { items: Workflow[] } }).data.items;
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return [];
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const workflows = await getWorkflows();
  const workflow = workflows.find((item) => item.id === params.id);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/workflows" style={{ color: "#0a66c2", textDecoration: "none" }}>
          ← Back to workflows
        </Link>
      </div>

      <h1 style={{ fontSize: 40, marginBottom: 8 }}>
        {workflow?.name || "Workflow detail"}
      </h1>

      <p style={{ color: "#666", marginBottom: 24 }}>
        API base URL: {API_BASE_URL}
      </p>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          background: "#fff",
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Workflow info</h2>
        <div><strong>ID:</strong> {workflow?.id || params.id}</div>
        <div><strong>Name:</strong> {workflow?.name || "-"}</div>
        <div><strong>Mode:</strong> {workflow?.mode || "-"}</div>
        <div><strong>Description:</strong> {workflow?.description || "-"}</div>
        <div><strong>Created:</strong> {workflow?.createdAt || "-"}</div>
      </section>

      <WorkflowRunner
        workflowId={workflow?.id || params.id}
        workflowName={workflow?.name || "Workflow"}
        workflowMode={workflow?.mode || "multi-step"}
        apiBaseUrl={API_BASE_URL}
        demoToken={process.env.NEXT_PUBLIC_DEMO_TOKEN ?? ""}
      />
    </main>
  );
}
