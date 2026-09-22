import type { FastifyInstance } from "fastify";
import { hasAnyAdmin, createAdminUser, authenticateUser, createUserRecord, verifyAuthToken, listUsers, deleteUser } from "../auth.service.js";

export function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/status", async (_req, reply) => {
    return reply.send({ hasAdmin: hasAnyAdmin() });
  });

  app.post<{ Body: { username?: string; password?: string } }>(
    "/api/auth/setup",
    async (req, reply) => {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return reply.code(400).send({ error: "Gebruikersnaam en wachtwoord zijn verplicht." });
      }
      try {
        if (hasAnyAdmin()) {
          return reply.code(400).send({ error: "Setup is al voltooid." });
        }
        const token = createAdminUser(username, password);
        return reply.send({ token });
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    }
  );

  app.post<{ Body: { username?: string; password?: string } }>(
    "/api/auth/login",
    async (req, reply) => {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return reply.code(400).send({ error: "Vul alle velden in." });
      }
      try {
        const token = authenticateUser(username, password);
        return reply.send({ token });
      } catch (err: any) {
        return reply.code(401).send({ error: err.message });
      }
    }
  );

  app.get("/api/users", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const verified = verifyAuthToken(token);
    if (!verified || verified.role !== "admin") {
      return reply.code(403).send({ error: "Toegang geweigerd. Alleen voor admins." });
    }
    return reply.send(listUsers());
  });

  app.post<{ Body: { username: string; password: string; role?: "admin" | "user" } }>(
    "/api/users",
    async (req, reply) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "";
      const verified = verifyAuthToken(token);
      if (!verified || verified.role !== "admin") {
        return reply.code(403).send({ error: "Toegang geweigerd. Alleen voor admins." });
      }
      try {
        const { username, password, role } = req.body;
        const newUser = createUserRecord(username, password, role || "user");
        return reply.send(newUser);
      } catch (err: any) {
        return reply.code(400).send({ error: err.message });
      }
    }
  );

  // --- AANPASSING IN: de DELETE /api/users/:userId route ---
  app.delete<{ Params: { userId: string } }>("/api/users/:userId", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const verified = verifyAuthToken(token);
    
    if (!verified || verified.role !== "admin") {
      return reply.code(403).send({ error: "Toegang geweigerd." });
    }

    try {
      deleteUser(req.params.userId, verified.id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });
}
