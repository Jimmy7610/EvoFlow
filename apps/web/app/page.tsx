'use client';

import { useMemo, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN || '';

const DEFAULT_RAW_JSON = `{
  "message": "Svara bara med ordet BANAN",
  "mode": "direct"
}`;

const MEMORY_TEST_1 = `{
  "message": "Write a simple TypeScript function that validates email addresses.",
  "mode": "multi-step"
}`;

const MEMORY_TEST_2 = `{
  "message": "Improve the previous email validator and make it more robust.",
  "mode": "multi-step"
}`;

const MEMORY_TEST_3 = `{
  "message": "Explain the improvements you made to the previous validator in simple terms.",
  "mode": "multi-step"
}`;

export default function Page() {
  const [rawJson, setRawJson] = useState(DEFAULT_RAW_JSON);
  const [responseText, setResponseText] = useState('No response yet');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastUrl, setLastUrl] = useState('');

  const parsedPayload = useMemo(() => {
    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  }, [rawJson]);

  async function tryEndpoints(payload: unknown) {
    const endpoints = [`${API_BASE_URL}/runs`, `${API_BASE_URL}/api/runs`];
    const attempts: unknown[] = [];

    for (const endpoint of endpoints) {
      setLastUrl(endpoint);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(DEMO_TOKEN ? { Authorization: `Bearer ${DEMO_TOKEN}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let json: unknown = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }

        attempts.push({
          endpoint,
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          body: json ?? text,
        });

        if (res.ok && json) {
          return {
            success: true,
            endpoint,
            data: json,
            attempts,
          };
        }
      } catch (error) {
        attempts.push({
          endpoint,
          ok: false,
          status: 'FETCH_ERROR',
          statusText: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: false,
      attempts,
    };
  }

  async function createRun() {
    setError('');
    setSubmitting(true);
    setResponseText('Waiting for API response...');

    if (!parsedPayload) {
      setError('JSON is invalid. Fix the textarea content first.');
      setSubmitting(false);
      return;
    }

    const result = await tryEndpoints(parsedPayload);

    if (result.success) {
      setResponseText(JSON.stringify(result, null, 2));
    } else {
      setError('Ingen fungerande create-run endpoint svarade med giltig JSON. Kolla API response för detaljer.');
      setResponseText(JSON.stringify({ postedPayload: parsedPayload, ...result }, null, 2));
    }

    setSubmitting(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>EvoFlow Testpanel V4</h1>
      <p style={{ marginTop: 0, color: '#666' }}>
        Textarea JSON is the source of truth. What you see here is exactly what gets posted.
      </p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <section>
          <h2>Textarea JSON</h2>
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 320,
              padding: 12,
              fontFamily: 'monospace',
              fontSize: 14,
              borderRadius: 8,
              border: '1px solid #ccc',
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={createRun}
              disabled={submitting}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #111',
                background: '#111',
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Sending...' : 'Create run'}
            </button>
            <button onClick={() => setRawJson(DEFAULT_RAW_JSON)} style={secondaryButtonStyle}>Load BANAN test</button>
            <button onClick={() => setRawJson(MEMORY_TEST_1)} style={secondaryButtonStyle}>Memory test 1</button>
            <button onClick={() => setRawJson(MEMORY_TEST_2)} style={secondaryButtonStyle}>Memory test 2</button>
            <button onClick={() => setRawJson(MEMORY_TEST_3)} style={secondaryButtonStyle}>Memory test 3</button>
          </div>
        </section>

        <section>
          <h2>Payload preview</h2>
          <pre style={preStyle}>{parsedPayload ? JSON.stringify(parsedPayload, null, 2) : 'Invalid JSON'}</pre>
        </section>
      </div>

      <div style={{ marginTop: 16, lineHeight: 1.7 }}>
        <div><strong>API base URL:</strong> {API_BASE_URL}</div>
        <div><strong>Endpoint candidates:</strong> {API_BASE_URL}/runs | {API_BASE_URL}/api/runs</div>
        <div><strong>Last endpoint tried:</strong> {lastUrl || '(none yet)'}</div>
        <div><strong>Auth header:</strong> {DEMO_TOKEN ? 'Bearer token will be sent' : 'No token configured'}</div>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <section style={{ marginTop: 24 }}>
        <h2>API response</h2>
        <pre style={preStyle}>{responseText}</pre>
      </section>
    </main>
  );
}

const secondaryButtonStyle = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
} as const;

const preStyle = {
  minHeight: 320,
  margin: 0,
  padding: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  border: '1px solid #ccc',
  borderRadius: 8,
  background: '#fafafa',
} as const;

const errorStyle = {
  marginTop: 16,
  padding: 12,
  borderRadius: 8,
  background: '#ffe6e6',
  border: '1px solid #ffb3b3',
  color: '#8a1f1f',
} as const;
