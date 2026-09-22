import { useEffect, useState } from "react";
import type { DashboardStructure } from "@dashwire/core";
import { CapabilityRenderer } from "./CapabilityRenderer.js";

interface LogEntry {
  id?: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source?: string;
}

export interface LiveDashboardSource {
  getStructure(): DashboardStructure;
  subscribe(listener: () => void): () => void;
  subscribeState?(listener: () => void): () => void;
  applyCommand(path: string, value: unknown): void;
}

export interface DashboardProps {
  // Ondersteunt zowel de SDK source als directe Remote/Socket props
  dashboard?: LiveDashboardSource;
  structure?: DashboardStructure;
  state?: Record<string, unknown>;
  status?: "online" | "offline";
  logs?: LogEntry[];
  onCommand?: (path: string, value: unknown) => void;
  onExecute?: (path: string) => void;
}

export function Dashboard({ 
  dashboard, 
  structure: propStructure,
  state = {},
  status = "online", 
  logs = [],
  onCommand,
  onExecute
}: DashboardProps) {
  const [internalStructure, setInternalStructure] = useState<DashboardStructure>(() => 
    dashboard ? dashboard.getStructure() : propStructure || { projectId: "", projectName: "", sections: [] }
  );

  useEffect(() => {
    if (!dashboard) return;
    const update = () => setInternalStructure({ ...dashboard.getStructure() });
    
    const unsubStructure = dashboard.subscribe(update);
    const unsubState = dashboard.subscribeState?.(update);

    return () => {
      unsubStructure();
      if (unsubState) unsubState();
    };
  }, [dashboard]);

  const currentStructure = propStructure || internalStructure;
  const isOffline = status === "offline";

  const handleCommand = (path: string, value: unknown) => {
    if (dashboard) {
      dashboard.applyCommand(path, value);
    } else if (onCommand) {
      onCommand(path, value);
    }
  };

  const handleExecute = (path: string) => {
    if (dashboard) {
      dashboard.applyCommand(path, undefined);
    } else if (onExecute) {
      onExecute(path);
    }
  };

  return (
    <div className="dw-dashboard-container">
      <div className="dw-detail-header">
        <div>
          <h1 className="dw-detail-title">{currentStructure.projectName || currentStructure.projectId}</h1>
          {currentStructure.projectId && <p className="dw-detail-subtitle">ID: {currentStructure.projectId}</p>}
        </div>
        <span className={`dw-badge dw-badge--${status}`}>
          {status}
        </span>
      </div>

      {isOffline && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.85rem", fontWeight: 500 }}>
          ⚠️ Dit project is momenteel offline. Besturingselementen zijn tijdelijk uitgeschakeld.
        </div>
      )}

      <div>
        {currentStructure.sections.map((section) => (
          <div key={section.slug} className="dw-section-box">
            <h3 className="dw-section-title">{section.name}</h3>
            <div>
              {section.capabilities.map((cap) => {
                const resolvedCapability = {
                  ...cap,
                  writable: isOffline ? false : cap.writable,
                  value: state[cap.path] ?? ("value" in cap ? cap.value : undefined),
                  ...(cap.type === "logs" ? { logs } : {}),
                };

                return (
                  <div key={cap.path} className="dw-control-row" style={{ opacity: isOffline ? 0.6 : 1, flexDirection: cap.type === "logs" ? "column" : "row", alignItems: cap.type === "logs" ? "stretch" : "center" }}>
                    {cap.type !== "logs" && (
                      <div>
                        <span className="dw-control-label">{cap.label}</span>
                        <span className="dw-control-path">{cap.path}</span>
                      </div>
                    )}

                    <div style={{ width: cap.type === "logs" ? "100%" : "auto" }}>
                      <CapabilityRenderer
                        capability={resolvedCapability as any}
                        onCommand={(path, value) => handleCommand(path, value)}
                        onExecute={(path) => handleExecute(path)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}