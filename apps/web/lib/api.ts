
export type Workflow = {
  id: string;
  name: string;
  description?: string;
  mode?: "direct" | "multi-step" | string;
  createdAt?: string;
};

export type RunRecord = {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status?: string;
  node?: string;
  input?: unknown;
  finalOutput?: string;
  memoryRunCount?: number;
  memorySummary?: string;
  createdAt?: string;
  updatedAt?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

async function fetchJsonWithFallback<T>(paths: string[]): Promise<T> {
  const attempts: Array<{ url: string; status?: number; statusText?: string; body?: string }> = [];

  for (const path of paths) {
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
        attempts.push({
          url,
          status: response.status,
          statusText: response.statusText,
          body,
        });
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      attempts.push({
        url,
        body: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const details = attempts
    .map((a) => `${a.url} -> ${a.status ?? "ERR"} ${a.statusText ?? ""} ${a.body ?? ""}`)
    .join("\n");

  throw new Error(`API request failed for all candidates:\n${details}`);
}

function unwrapItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return obj.items as T[];
    }
    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }
    if (obj.success === true && Array.isArray(obj.workflows)) {
      return obj.workflows as T[];
    }
    if (obj.success === true && obj.data && typeof obj.data === "object") {
      const inner = obj.data as Record<string, unknown>;
      if (Array.isArray(inner.items)) {
        return inner.items as T[];
      }
    }
  }

  return [];
}

export async function getWorkflows(): Promise<Workflow[]> {
  const data = await fetchJsonWithFallback<unknown>([
    "/workflows",
    "/api/workflows",
  ]);

  return unwrapItems<Workflow>(data);
}

export async function getRuns(): Promise<RunRecord[]> {
  const data = await fetchJsonWithFallback<unknown>([
    "/runs",
    "/api/runs",
  ]);

  return unwrapItems<RunRecord>(data);
}

export { API_BASE_URL };
