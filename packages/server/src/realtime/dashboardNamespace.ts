import type { Server as SocketServer, Socket } from "socket.io";

export function attachDashboardNamespace(io: SocketServer): void {
  const dashNsp = io.of("/dashboard");
  const sdkNsp = io.of("/sdk");

  dashNsp.on("connection", (socket: Socket) => {
    socket.on("subscribe:project", ({ projectId }: { projectId: string }) => {
      if (!projectId) return;
      socket.join(projectId);
    });

    socket.on("unsubscribe:project", ({ projectId }: { projectId: string }) => {
      if (!projectId) return;
      socket.leave(projectId);
    });

    socket.on(
      "capability:command",
      ({ projectId, path, value }: { projectId: string; path: string; value: unknown }) => {
        if (!projectId || !path) return;

        sdkNsp.to(projectId).emit("capability:command", { path, value });
      }
    );

    socket.on(
      "action:execute",
      ({ projectId, path }: { projectId: string; path: string }) => {
        if (!projectId || !path) return;

        sdkNsp.to(projectId).emit("action:execute", { path });
      }
    );
  });
}