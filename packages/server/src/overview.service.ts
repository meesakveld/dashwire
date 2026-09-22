import { db } from "./db/client.js";
import { overviewConfig } from "./db/schema.js";
import { eq } from "drizzle-orm";

export interface OverviewEntryInput {
  projectId: string;
  capabilityPath: string;
  order: number;
}

export function setOverviewConfig(entries: OverviewEntryInput[]): void {
  db.delete(overviewConfig).run();
  for (const entry of entries) {
    db.insert(overviewConfig)
      .values({ 
        projectId: entry.projectId, 
        capabilityPath: entry.capabilityPath 
      })
      .run();
  }
}

export function getOverviewConfig(projectId?: string) {
  if (projectId) {
    return db.select().from(overviewConfig).where(eq(overviewConfig.projectId, projectId)).all();
  }
  return db.select().from(overviewConfig).all();
}