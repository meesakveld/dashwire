import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const dbPath = process.env.DASHWIRE_DB_PATH ?? "./dashwire.db";
const sqlite: Database.Database = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export { sqlite };
export const db = drizzle(sqlite, { schema });