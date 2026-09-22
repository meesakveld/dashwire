import { db } from "./db/client.js";
import { logs } from "./db/schema.js";

export function insertLog(projectId: string, level: string, message: string, source?: string, metadata?: Record<string, unknown>): number {
  const timestamp = new Date().toISOString();
  const res = db.insert(logs).values({
    projectId,
    level,
    message,
    source: source ?? null,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
    timestamp,
  }).run();
  return Number(res.lastInsertRowid);
}