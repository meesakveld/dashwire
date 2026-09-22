import Fastify from "fastify";
import { Server as SocketServer } from "socket.io";
import { projectRoutes } from "./routes/projects.js";
import { overviewRoutes } from "./routes/overview.js";
import { authRoutes } from "./routes/auth.js";
import { attachSdkNamespace } from "./realtime/sdkNamespace.js";
import { attachDashboardNamespace } from "./realtime/dashboardNamespace.js";

export async function startDashwire(userConfig: any = {}) {
  const PORT = Number(userConfig?.server?.port ?? process.env.PORT ?? 4000);
  const HOST = userConfig?.server?.host ?? "0.0.0.0";
  
  const app = Fastify({ logger: true });

  app.addHook("onRequest", async (req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-admin-token");
    
    if (req.method === "OPTIONS") {
      return reply.code(200).send();
    }
  });

  app.get("/health", async () => ({ ok: true }));

  const io = new SocketServer(app.server, {
    cors: { origin: "*" },
  });

  projectRoutes(app, io);
  overviewRoutes(app);
  authRoutes(app);
  attachSdkNamespace(io);
  attachDashboardNamespace(io);

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`⚡ Dashwire server running on http://${HOST}:${PORT}`);
  return app;
}

if (process.argv[1] && process.argv[1].endsWith("index.ts")) {
  startDashwire();
}
