import { useState, type KeyboardEvent } from "react";
import type { LogsCapability } from "@dashwire/core";

interface LogEntry {
  id?: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source?: string;
}

export function TerminalControl({ 
  capability, 
  onCommand,
  logs = [] 
}: { 
  capability: LogsCapability & { logs?: LogEntry[] }; 
  onCommand?: (val: string) => void;
  logs?: LogEntry[];
}) {
  const [inputVal, setInputVal] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputVal.trim() && onCommand) {
      onCommand(inputVal);
      setInputVal("");
    }
  };

  const activeLogs = capability.logs || logs;

  return (
    <div className="dw-terminal-container" style={{ width: "100%" }}>
      <div className="dw-terminal-header">
        <span className="dw-control-label">{capability.label}</span>
        <span className="dw-control-path">{capability.path}</span>
      </div>

      <div style={{ 
        background: "#0f172a", 
        color: "#e2e8f0", 
        padding: "1rem", 
        fontFamily: "monospace", 
        fontSize: "0.8rem", 
        maxHeight: "250px", 
        overflowY: "auto",
        display: "flex",
        flexDirection: "column-reverse", // Nieuwste logs komen automatisch onderaan, oudste schuiven naar boven
        gap: "0.35rem"
      }}>
        {activeLogs.length === 0 ? (
          <div style={{ color: "#64748b" }}>Geen logberichten ontvangen...</div>
        ) : (
          activeLogs.map((log, index) => (
            <div key={log.id || index} style={{ display: "flex", gap: "0.75rem" }}>
              <span style={{ color: "#64748b" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span style={{ 
                fontWeight: "bold", 
                textTransform: "uppercase", 
                width: "50px",
                color: log.level === "error" ? "#ef4444" : log.level === "warn" ? "#f59e0b" : log.level === "info" ? "#3b82f6" : "#94a3b8" 
              }}>
                {log.level}
              </span>
              <span style={{ color: "#f8fafc" }}>{log.message}</span>
            </div>
          ))
        )}
      </div>

      {capability.writable && (
        <div className="dw-terminal-input-bar">
          <span className="dw-terminal-prompt">&gt;</span>
          <input
            type="text"
            className="dw-terminal-input"
            placeholder="Typ een commando en druk op Enter..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}
    </div>
  );
}