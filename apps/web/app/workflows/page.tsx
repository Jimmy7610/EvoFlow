
import Link from "next/link";

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
  const attempts: string[] = [];

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
        const body = await response.text();
        attempts.push(`${url} -> ${response.status} ${response.statusText} ${body}`);
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

      attempts.push(`${url} -> 200 OK but response shape was not recognized`);
    } catch (error) {
      attempts.push(`${url} -> ERROR ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`API request failed for all workflow endpoints:\n${attempts.join("\n")}`);
}

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <nav style={{ display: 'flex', gap: 20, marginBottom: 32, fontSize: 14 }}>
        <Link href="/">Dashboard</Link>
        <Link href="/workflows" style={{ fontWeight: 'bold' }}>Workflows</Link>
        <Link href="/chat">Chat</Link>
      </nav>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>Workflows</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        API base URL: {API_BASE_URL}
      </p>

      {workflows.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          No workflows returned from the API.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {workflows.map((workflow) => (
            <Link
              key={workflow.id}
              href={`/workflows/${workflow.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <section
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <h2 style={{ margin: "0 0 8px 0", fontSize: 24 }}>{workflow.name}</h2>
                <p style={{ margin: "0 0 8px 0" }}>
                  {workflow.description || "No description"}
                </p>
                <div style={{ fontSize: 14, color: "#555" }}>
                  <div><strong>ID:</strong> {workflow.id}</div>
                  <div><strong>Mode:</strong> {workflow.mode || "unknown"}</div>
                  <div><strong>Created:</strong> {workflow.createdAt || "-"}</div>
                </div>
                <div style={{ marginTop: 12, color: "#0a66c2", fontSize: 14 }}>
                  Open workflow →
                </div>
              </section>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
