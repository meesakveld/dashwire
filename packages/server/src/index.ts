import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { Server as SocketServer } from "socket.io";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { db } from "./db/client.js";
import { sqlite } from "./db/client.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { overviewRoutes } from "./routes/overview.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);

const migrationsFolder = join(__dirname, "db/drizzle");
migrate(db, { migrationsFolder });

const app = Fastify({ logger: true });

app.addHook("onRequest", async (req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-admin-token");
  if (req.method === "OPTIONS") return reply.code(200).send();
});

app.get("/health", async () => ({ ok: true }));

const io = new SocketServer(app.server, { cors: { origin: "*" } });

authRoutes(app);
projectRoutes(app, io);
overviewRoutes(app);

app.register(fastifyStatic, {
  root: join(__dirname, "../public"),
  prefix: "/",
});

app.setNotFoundHandler((req, reply) => {
  if (req.url?.startsWith("/api") || req.url?.startsWith("/sdk")) {
    return reply.code(404).send({ error: "Not found" });
  }
  return (reply as any).sendFile("index.html");
});

const sdkNsp = io.of("/sdk");
sdkNsp.on("connection", (socket) => {
  const projectId =
    (socket.handshake.query.projectId as string) ||
    (socket.handshake.auth?.projectId as string);

  if (!projectId) return socket.disconnect();

  socket.data.projectId = projectId;
  socket.join(`project:${projectId}`);
  sqlite.prepare("UPDATE projects SET status = 'online', last_seen_at = ? WHERE id = ?").run(new Date().toISOString(), projectId);
  io.of("/dashboard").to(`project:${projectId}`).emit("project:online", { projectId });

  socket.on("state:sync", ({ state }) => {
    const stmt = sqlite.prepare(`INSERT INTO capability_state (project_id, capability_path, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, capability_path) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`);
    const now = new Date().toISOString();
    for (const [path, val] of Object.entries(state || {})) {
      stmt.run(projectId, path, JSON.stringify(val), now);
      io.of("/dashboard").to(`project:${projectId}`).emit("state:update", { projectId, path, value: val });
    }
  });

  socket.on("state:update", ({ path, value }) => {
    sqlite.prepare(
      `INSERT INTO capability_state (project_id, capability_path, value_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, capability_path) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    ).run(projectId, path, JSON.stringify(value), new Date().toISOString());
    io.of("/dashboard").to(`project:${projectId}`).emit("state:update", { projectId, path, value });
  });

  socket.on("log:new", ({ timestamp, level, message, source, metadata }) => {
    sqlite.prepare(`INSERT INTO logs (project_id, level, message, source, metadata_json, timestamp) VALUES (?, ?, ?, ?, ?, ?)`).run(projectId, level, message, source ?? null, metadata ? JSON.stringify(metadata) : null, timestamp);
    io.of("/dashboard").to(`project:${projectId}`).emit("log:new", { projectId, timestamp, level, message, source, metadata });
  });

  socket.on("disconnect", () => {
    sqlite.prepare("UPDATE projects SET status = 'offline', last_seen_at = ? WHERE id = ?").run(new Date().toISOString(), projectId);
    io.of("/dashboard").to(`project:${projectId}`).emit("project:offline", { projectId });
  });
});

const dashNsp = io.of("/dashboard");
dashNsp.on("connection", (socket) => {
  socket.on("subscribe:project", ({ projectId }) => socket.join(`project:${projectId}`));
  socket.on("unsubscribe:project", ({ projectId }) => socket.leave(`project:${projectId}`));
  socket.on("capability:command", ({ projectId, path, value }) => {
    io.of("/sdk").to(`project:${projectId}`).emit("capability:command", { path, value });
  });
  socket.on("action:execute", ({ projectId, path }) => {
    io.of("/sdk").to(`project:${projectId}`).emit("action:execute", { path });
  });
});

export function startDashwire(userConfig?: any) {
  app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
    console.log(`⚡ Dashwire server & dashboard running on http://0.0.0.0:${PORT}`);
  });
}
