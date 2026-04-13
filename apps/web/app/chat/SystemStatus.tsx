"use client";

import React, { useState, useEffect } from 'react';

interface SystemStatusProps {
  apiBaseUrl: string;
  demoToken?: string;
}

type StatusState = {
  api: { status: 'online' | 'offline' | 'loading', message: string, lastUpdate: string };
  web: { status: 'online' | 'offline' | 'loading', message: string, lastUpdate: string };
  executor: { status: 'online' | 'offline' | 'loading', message: string, lastUpdate: string };
  ollama: { status: 'online' | 'offline' | 'loading', message: string, lastUpdate: string };
};

class SystemMonitor {
  private options: {
    apiBaseUrl: string;
    demoToken?: string;
    onStatusChange: (status: StatusState) => void;
    initialStatus: StatusState;
  };
  private isMonitoring: boolean = false;
  private controller: AbortController;

  constructor(options: {
    apiBaseUrl: string,
    demoToken?: string,
    onStatusChange: (status: StatusState) => void,
    initialStatus: StatusState
  }) {
    this.options = options;
    this.controller = new AbortController();
  }

  public async start() {
    this.isMonitoring = true;
    this.fetchStream();
  }

  private async fetchStream() {
    while (this.isMonitoring) {
      try {
        const response = await fetch(`${this.options.apiBaseUrl}/dev/status`, {
          signal: this.controller.signal,
          headers: this.options.demoToken ? { 'Authorization': `Bearer ${this.options.demoToken}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            this.handleUpdate(data.controls);
          }
        } else {
          this.handleError("API Connection lost");
        }
      } catch (err) {
        if (this.isMonitoring && (err as any).name !== 'AbortError') {
          this.handleError("Failed to reach API");
        }
      }
      await new Promise(r => setTimeout(r, 15000)); // Poll every 15s instead of full stream for simplicity
    }
  }

  private handleUpdate(controls: any) {
    const now = new Date().toISOString();
    const newStatus: StatusState = {
      api: { 
        status: controls.api.running ? 'online' : 'offline', 
        message: controls.api.running ? 'Connected' : 'Disconnected',
        lastUpdate: now 
      },
      web: { 
        status: controls.web.running ? 'online' : 'offline', 
        message: controls.web.running ? 'Active' : 'Inactive',
        lastUpdate: now 
      },
      executor: { 
        status: controls.executor.running ? 'online' : 'offline', 
        message: controls.executor.lastError || (controls.executor.running ? 'Operational' : 'Stopped'),
        lastUpdate: now 
      },
      ollama: {
        status: controls.ollama?.running ? 'online' : 'offline',
        message: controls.ollama?.running ? 'Ready' : 'Not Reachable',
        lastUpdate: now
      }
    };
    this.options.onStatusChange(newStatus);
  }

  private handleError(msg: string) {
    const now = new Date().toISOString();
    this.options.onStatusChange({
      api: { status: 'offline', message: msg, lastUpdate: now },
      web: { status: 'loading', message: 'Unknown', lastUpdate: now },
      executor: { status: 'loading', message: 'Unknown', lastUpdate: now }
    });
  }

  public stop() {
    this.isMonitoring = false;
    this.controller.abort();
  }
}

export default function SystemStatus({ apiBaseUrl, demoToken }: SystemStatusProps) {
  const [status, setStatus] = useState<StatusState>({
    api: { status: 'loading', message: 'Checking...', lastUpdate: new Date().toISOString() },
    web: { status: 'loading', message: 'Checking...', lastUpdate: new Date().toISOString() },
    executor: { status: 'loading', message: 'Checking...', lastUpdate: new Date().toISOString() },
    ollama: { status: 'loading', message: 'Checking...', lastUpdate: new Date().toISOString() }
  });

  useEffect(() => {
    const monitor = new SystemMonitor({
      apiBaseUrl,
      demoToken,
      initialStatus: status,
      onStatusChange: (newStatus) => setStatus(newStatus)
    });

    monitor.start();
    return () => monitor.stop();
  }, [apiBaseUrl, demoToken]);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'online': return '#22c55e';
      case 'offline': return '#ef4444';
      case 'loading': return '#eab308';
      default: return '#64748b';
    }
  };

  return (
    <div style={{
      padding: '12px',
      borderRadius: '12px',
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.05)',
      fontSize: '12px',
      marginTop: '16px'
    }}>
      <div style={{ fontWeight: 700, opacity: 0.8, marginBottom: '12px', letterSpacing: '0.05em' }}>
        SYSTEM ENGINE
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {Object.entries(status).map(([key, info]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                background: getStatusColor(info.status),
                boxShadow: info.status === 'online' ? `0 0 8px ${getStatusColor(info.status)}` : 'none'
              }} />
              <span style={{ textTransform: 'capitalize', color: '#94a3b8', fontWeight: 500 }}>{key}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: getStatusColor(info.status), fontWeight: 600, fontSize: '11px' }}>
                {info.status.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
