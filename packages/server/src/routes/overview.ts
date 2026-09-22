import type { FastifyInstance } from "fastify";
import { getOverviewConfig, setOverviewConfig } from "../overview.service.js";

function requireAdmin(req: any, reply: any): boolean {
  const token = req.headers["x-admin-token"];
  const expected = process.env.DASHWIRE_ADMIN_TOKEN;
  if (!expected || token !== expected) {
    reply.status(401).send({ error: "unauthorized" });
    return false;
  }
  return true;
}

export function overviewRoutes(app: FastifyInstance) {
  app.get("/api/overview-config", async () => {
    return getOverviewConfig();
  });

  app.put<{ Body: { entries: { projectId: string; capabilityPath: string; order: number }[] } }>(
    "/api/overview-config",
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      setOverviewConfig(req.body.entries);
      return reply.send({ ok: true });
    },
  );
}
