import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "drizzle");

try {
  migrate(db, { migrationsFolder });
  console.log("Database migraties succesvol uitgevoerd!");
} catch (error) {
  console.error("Fout bij uitvoeren migraties:", error);
  process.exit(1);
}