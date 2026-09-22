import type { Server as SocketServer, Socket } from "socket.io";
import {
  verifyProjectToken,
  setProjectStatus,
  upsertCapabilityState,
} from "../projects.service.js";

export function attachSdkNamespace(io: SocketServer): void {
  const sdkNsp = io.of("/sdk");

  sdkNsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) return next(new Error("Token required"));
    if (!verifyProjectToken(token)) return next(new Error("Invalid token"));

    next();
  });

  sdkNsp.on("connection", (socket: Socket) => {
    const projectId =
      (socket.handshake.query.projectId as string) ||
      (socket.handshake.auth?.projectId as string);

    if (projectId) {
      socket.data.projectId = projectId;
      socket.join(projectId);
      setProjectStatus(projectId, "online");

      io.of("/dashboard").to(projectId).emit("project:online", {
        projectId,
      });
    }

    socket.on("state:sync", ({ state }) => {
      const pid = socket.data.projectId || projectId;
      if (!pid) return;

      setProjectStatus(pid, "online");

      io.of("/dashboard").to(pid).emit("project:online", {
        projectId: pid,
      });

      for (const [path, value] of Object.entries(state)) {
        upsertCapabilityState(pid, path, value, false);
      }
    });

    socket.on("state:update", ({ path, value }) => {
      const pid = socket.data.projectId || projectId;
      if (!pid) return;

      upsertCapabilityState(pid, path, value, true);

      io.of("/dashboard").to(pid).emit("state:update", {
        projectId: pid,
        path,
        value,
      });
    });

    socket.on("log:new", ({ level, message, source, metadata, timestamp }) => {
      const pid = socket.data.projectId || projectId;
      if (!pid) return;

      io.of("/dashboard").to(pid).emit("log:new", {
        projectId: pid,
        level,
        message,
        source,
        metadata,
        timestamp,
      });
    });

    socket.on("disconnect", () => {
      const pid = socket.data.projectId || projectId;
      if (!pid) return;

      setProjectStatus(pid, "offline");

      io.of("/dashboard").to(pid).emit("project:offline", {
        projectId: pid,
      });
    });
  });
}