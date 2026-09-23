import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "./db/client.js";
import { projects, projectTokens, capabilityState, overviewConfig } from "./db/schema.js";
import type { DashboardStructure, Capability } from "@dashwire/core";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dashwire-key";

function allPaths(structure: DashboardStructure): Set<string> {
  const set = new Set<string>();
  for (const section of structure.sections) {
    for (const cap of section.capabilities) set.add(cap.path);
  }
  return set;
}

export interface RegisterResult {
  token: string;
  staleOverviewPaths: string[];
}

export function registerProject(projectId: string, projectName: string, structure: DashboardStructure, authToken?: string): RegisterResult {
  const existing = db.select().from(projects).where(eq(projects.id, projectId)).get();
  const now = new Date().toISOString();
  const structureJsonString = JSON.stringify(structure);

  let activeToken = authToken;

  if (authToken) {
    // Valideer enkel of het token geldig en actief is in de database (geen strenge project-ID match vereist)
    const verified = verifyProjectToken(authToken);
    if (!verified) {
      throw new Error("Unauthorized: Invalid or inactive token.");
    }
    activeToken = authToken;
  } else {
    // Zoek het eerste actieve token in de database dat als universele sleutel kan dienen
    const existingTokenRecord = db.select().from(projectTokens).where(eq(projectTokens.active, true)).get();
    if (existingTokenRecord) {
      activeToken = existingTokenRecord.token;
    } else {
      throw new Error("Unauthorized: No active token found. Please generate a token first via the /security page.");
    }
  }

  if (!existing) {
    db.insert(projects)
      .values({
        id: projectId,
        name: projectName,
        apiKeyHash: "jwt-secured",
        structureJson: structureJsonString,
        status: "offline",
        createdAt: now,
      })
      .run();
  } else {
    db.update(projects)
      .set({
        name: projectName,
        structureJson: structureJsonString,
      })
      .where(eq(projects.id, projectId))
      .run();
  }

  const currentPaths = allPaths(structure);
  const configEntries = db.select().from(overviewConfig).where(eq(overviewConfig.projectId, projectId)).all();
  const staleOverviewPaths: string[] = [];
  for (const entry of configEntries) {
    if (!currentPaths.has(entry.capabilityPath)) {
      staleOverviewPaths.push(entry.capabilityPath);
      db.update(overviewConfig).set({ staleSince: now }).where(eq(overviewConfig.id, entry.id)).run();
    } else if (entry.staleSince) {
      db.update(overviewConfig).set({ staleSince: null }).where(eq(overviewConfig.id, entry.id)).run();
    }
  }

  return { token: activeToken!, staleOverviewPaths };
}

export function verifyProjectToken(token: string): { universal: boolean } | null {
  try {
    jwt.verify(token, JWT_SECRET);
    const record = db.select().from(projectTokens).where(and(eq(projectTokens.token, token), eq(projectTokens.active, true))).get();
    if (!record) return null;
    return { universal: true };
  } catch {
    return null;
  }
}

export function listAllTokens() {
  return db.select().from(projectTokens).all();
}

export function createTokenForProject(label?: string) {
  const tokenName = label || "Universele Sleutel";
  const token = jwt.sign({ name: tokenName, scope: "dashwire-access" }, JWT_SECRET);
  const id = randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  
  db.insert(projectTokens).values({
    id,
    projectId: "universal",
    label: tokenName,
    token,
    active: true,
    createdAt: now,
  }).run();
  
  return token;
}

export function setTokenActiveStatus(tokenId: string, active: boolean) {
  db.update(projectTokens).set({ active }).where(eq(projectTokens.id, tokenId)).run();
}

export function deleteToken(tokenId: string) {
  db.delete(projectTokens).where(eq(projectTokens.id, tokenId)).run();
}

export function setProjectStatus(projectId: string, status: "online" | "offline"): void {
  db.update(projects).set({ status, lastSeenAt: new Date().toISOString() }).where(eq(projects.id, projectId)).run();
}

export function getProject(projectId: string) {
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return null;
  const state = db.select().from(capabilityState).where(eq(capabilityState.projectId, projectId)).all();
  const stateMap: Record<string, unknown> = {};
  for (const row of state) stateMap[row.capabilityPath] = JSON.parse(row.valueJson);

  const tokenRecord = db.select().from(projectTokens).where(eq(projectTokens.active, true)).get();
  const token = tokenRecord ? tokenRecord.token : jwt.sign({ scope: "dashwire-access" }, JWT_SECRET);

  const { apiKeyHash, structureJson, ...safe } = project;
  return {
    ...safe,
    token,
    structure: JSON.parse(structureJson) as DashboardStructure,
    state: stateMap,
  };
}

export function listProjects() {
  return db.select().from(projects).all().map((p) => {
    const tokenRecord = db.select().from(projectTokens).where(eq(projectTokens.active, true)).get();
    const token = tokenRecord ? tokenRecord.token : "";
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      lastSeenAt: p.lastSeenAt,
      token,
    };
  });
}

export function upsertCapabilityState(projectId: string, path: string, value: unknown, overwrite = true): void {
  const now = new Date().toISOString();
  const existing = db.select()
    .from(capabilityState)
    .where(eq(capabilityState.projectId, projectId))
    .all()
    .find((r) => r.capabilityPath === path);
  
  if (existing) {
    if (overwrite) {
      db.update(capabilityState)
        .set({ valueJson: JSON.stringify(value), updatedAt: now })
        .where(
          and(
            eq(capabilityState.projectId, projectId),
            eq(capabilityState.capabilityPath, path)
          )
        )
        .run();
    }
  } else {
    db.insert(capabilityState)
      .values({ 
        projectId, 
        capabilityPath: path, 
        valueJson: JSON.stringify(value), 
        updatedAt: now 
      })
      .run();
  }
}

export function bulkSyncState(projectId: string, state: Record<string, unknown>): void {
  for (const [path, value] of Object.entries(state)) {
    upsertCapabilityState(projectId, path, value, false);
  }
}

export function findCapability(structure: DashboardStructure, path: string): Capability | undefined {
  for (const section of structure.sections) {
    const found = section.capabilities.find((c) => c.path === path);
    if (found) return found;
  }
  return undefined;
}