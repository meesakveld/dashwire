export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id?: string;
  projectId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}
