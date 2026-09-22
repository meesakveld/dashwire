import type { CapabilityState, DashboardStructure } from "./capabilities.js";
import type { LogEntry } from "./logs.js";

export interface SdkAuthPayload {
  projectId: string;
  apiKey: string;
}

export interface SdkToServerEvents {
  "state:sync": (payload: { state: CapabilityState }) => void;
  "state:update": (payload: { path: string; value: unknown }) => void;
  "log:new": (payload: Omit<LogEntry, "projectId" | "id">) => void;
}

export interface ServerToSdkEvents {
  "capability:command": (payload: { path: string; value: unknown }) => void;
  "action:execute": (payload: { path: string }) => void;
}

export interface DashboardAuthPayload {
  sessionToken: string;
}

export interface DashboardToServerEvents {
  "subscribe:project": (payload: { projectId: string }) => void;
  "unsubscribe:project": (payload: { projectId: string }) => void;
  "capability:command": (payload: { projectId: string; path: string; value: unknown }) => void;
  "action:execute": (payload: { projectId: string; path: string }) => void;
}

export interface ServerToDashboardEvents {
  "project:online": (payload: { projectId: string }) => void;
  "project:offline": (payload: { projectId: string }) => void;
  "state:update": (payload: { projectId: string; path: string; value: unknown }) => void;
  "structure:updated": (payload: DashboardStructure) => void;
  "log:new": (payload: LogEntry) => void;
}

export interface RegisterProjectRequest {
  projectId: string;
  projectName: string;
  structure: DashboardStructure;
}

export interface RegisterProjectResponse {
  apiKey: string;
  staleOverviewPaths: string[];
}

export interface OverviewConfigEntry {
  projectId: string;
  capabilityPath: string;
  order: number;
  stale: boolean;
}
