import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  structureJson: text("structure_json").notNull(),
  status: text("status", { enum: ["online", "offline"] }).notNull().default("offline"),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at"),
});

export const projectTokens = sqliteTable("project_tokens", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  token: text("token").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const capabilityState = sqliteTable("capability_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  capabilityPath: text("capability_path").notNull(),
  valueJson: text("value_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const overviewConfig = sqliteTable("overview_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  capabilityPath: text("capability_path").notNull(),
  staleSince: text("stale_since"),
});

export const logs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  metadataJson: text("metadata_json"),
  timestamp: text("timestamp").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").notNull(),
});