"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDashboardSocket } from "../../../lib/dashwireSocket";
import type { DashboardStructure } from "@dashwire/core";
import { Dashboard } from "@dashwire/react-ui";

interface ProjectDetail {
  id: string;
  name: string;
  status: "online" | "offline";
  structure: DashboardStructure;
  state: Record<string, unknown>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";

    fetch(`${serverUrl}/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Project niet gevonden");
        return res.json();
      })
      .then((data) => {
        setProject(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    fetch(`${serverUrl}/api/projects/${projectId}/logs?limit=50`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLogs(data))
      .catch(() => {});

    const socket = getDashboardSocket();
    socket.emit("subscribe:project", { projectId });

    socket.on("state:update", (payload) => {
      if (payload.projectId !== projectId) return;
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          state: {
            ...prev.state,
            [payload.path]: payload.value,
          },
        };
      });
    });

    socket.on("project:online", ({ projectId: pId }) => {
      if (pId === projectId) {
        setProject((prev) => (prev ? { ...prev, status: "online" } : prev));
      }
    });

    socket.on("project:offline", ({ projectId: pId }) => {
      if (pId === projectId) {
        setProject((prev) => (prev ? { ...prev, status: "offline" } : prev));
      }
    });

    socket.on("structure:updated", (newStructure) => {
      setProject((prev) => (prev ? { ...prev, structure: newStructure } : prev));
    });

    socket.on("log:new", (log) => {
      if (log.projectId !== projectId) return;
      // @ts-ignore
      setLogs((prev) => [log, ...prev.slice(0, 49)]);
    });

    return () => {
      socket.emit("unsubscribe:project", { projectId });
      socket.off("state:update");
      socket.off("project:online");
      socket.off("project:offline");
      socket.off("structure:updated");
      socket.off("log:new");
    };
  }, [projectId]);

  const handleCommand = (path: string, value: unknown) => {
    if (project?.status === "offline") return;
    const socket = getDashboardSocket();
    socket.emit("capability:command", { projectId, path, value });
  };

  const handleExecute = (path: string) => {
    if (project?.status === "offline") return;
    const socket = getDashboardSocket();
    socket.emit("action:execute", { projectId, path });
  };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Details laden...</div>;
  if (!project) return <div style={{ textAlign: "center", padding: "3rem", color: "#ef4444" }}>Project niet gevonden.</div>;

  return (
    <div>
      <a href="/" className="dw-back-link">&larr; Terug naar Overzicht</a>
      <Dashboard 
        structure={project.structure}
        state={project.state}
        status={project.status}
        logs={logs}
        onCommand={handleCommand}
        onExecute={handleExecute}
      />
    </div>
  );
}