import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { registerProject, listProjects, getProject, listAllTokens, createTokenForProject, setTokenActiveStatus, deleteToken } from "../projects.service.js";
import type { DashboardStructure } from "@dashwire/core";
import { capabilityState, logs, overviewConfig, projects, projectTokens } from "../db/schema.js";
import { desc } from "drizzle-orm/sql/expressions/select";
import { eq } from "drizzle-orm/sql/expressions/conditions";
import { db } from "../db/client.js";
import { verifyAuthToken } from "../auth.service.js";

export function projectRoutes(app: FastifyInstance, io: SocketServer) {
  app.post<{ Params: { id: string }; Body: { projectName: string; structure: DashboardStructure } }>(
    "/api/projects/:id/register",
    async (req, reply) => {
      const { id: projectId } = req.params;
      const authHeader = req.headers.authorization;
      const authToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
      const { projectName, structure } = req.body;

      try {
        const result = registerProject(projectId, projectName, structure, authToken);
        return reply.send(result);
      } catch (err: any) {
        return reply.code(401).send({ error: err.message });
      }
    }
  );

  app.get("/api/projects", async (_req, reply) => {
    return reply.send(listProjects());
  });

  app.get("/api/projects/tokens/all", async (_req, reply) => {
    return reply.send(listAllTokens());
  });

  app.post<{ Body: { label?: string } }>(
    "/api/projects/tokens/new",
    async (req, reply) => {
      const body = req.body as { label?: string };
      try {
        const token = createTokenForProject(body?.label);
        return reply.send({ token });
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    }
  );

  app.patch<{ Params: { tokenId: string }; Body: { active: boolean } }>(
    "/api/projects/tokens/:tokenId",
    async (req, reply) => {
      const { tokenId } = req.params;
      const { active } = req.body;
      setTokenActiveStatus(tokenId, active);
      return reply.send({ success: true });
    }
  );

  app.delete<{ Params: { tokenId: string } }>(
    "/api/projects/tokens/:tokenId",
    async (req, reply) => {
      const { tokenId } = req.params;
      deleteToken(tokenId);
      return reply.send({ success: true });
    }
  );

  app.get<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const { id: projectId } = req.params;
    const project = getProject(projectId);
    if (!project) {
      return reply.code(404).send({ error: "Project niet gevonden" });
    }
    return reply.send(project);
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/projects/:id/logs",
    async (req, reply) => {
      const { id: projectId } = req.params;
      const limit = Number(req.query.limit ?? 50);
      
      const projectLogs = db.select()
        .from(logs)
        .where(eq(logs.projectId, projectId))
        .orderBy(desc(logs.id))
        .limit(limit)
        .all();

      return reply.send(projectLogs.reverse());
    }
  );

  app.delete<{ Params: { id: string } }>("/api/projects/:id", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const verified = verifyAuthToken(token);
    if (!verified || verified.role !== "admin") {
      return reply.code(403).send({ error: "Toegang geweigerd. Alleen voor admins." });
    }

    const { id: projectId } = req.params;
    const existing = getProject(projectId);
    if (!existing) {
      return reply.code(404).send({ error: "Project niet gevonden" });
    }

    db.delete(capabilityState).where(eq(capabilityState.projectId, projectId)).run();
    db.delete(overviewConfig).where(eq(overviewConfig.projectId, projectId)).run();
    db.delete(logs).where(eq(logs.projectId, projectId)).run();
    db.delete(projectTokens).where(eq(projectTokens.projectId, projectId)).run();
    db.delete(projects).where(eq(projects.id, projectId)).run();

    io.of("/dashboard").emit("project:deleted", { projectId });

    return reply.send({ success: true });
  });
}