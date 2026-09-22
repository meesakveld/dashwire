"use client";

import { useEffect, useState } from "react";
import { getDashboardSocket } from "../lib/dashwireSocket";

interface ProjectSummary {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeenAt: string;
}

export default function OverviewPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("dashwire_auth_token");
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const parsed = JSON.parse(jsonPayload);
        if (parsed.role === "admin") {
          setIsAdmin(true);
        }
      } catch {
        setIsAdmin(false);
      }
    }

    const serverUrl =
      process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";

    const socket = getDashboardSocket();

    fetch(`${serverUrl}/api/projects`)
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);

        for (const project of data) {
          socket.emit("subscribe:project", { projectId: project.id });
        }
      })
      .catch((err) => {
        console.error("Fout bij ophalen projecten:", err);
        setLoading(false);
      });

    socket.on("project:online", ({ projectId }) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: "online" } : p
        )
      );
    });

    socket.on("project:offline", ({ projectId }) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: "offline" } : p
        )
      );
    });

    return () => {
      socket.off("project:online");
      socket.off("project:offline");
    };
  }, []);

  if (loading) {
    return (
      <div className="dw-loading-screen">
        Projecten laden...
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 className="dw-overview-title">Projecten Overzicht</h1>
          <p className="dw-overview-subtitle">
            Beheer en monitor al je verbonden installaties en applicaties in
            real-time.
          </p>
        </div>

        {isAdmin && (
          <div className="dw-overview-actions">
            <a href="/users" className="dw-header-btn">
              Gebruikers Beheer
            </a>
            <a href="/security" className="dw-header-btn dw-header-btn--secondary">
              JWT & Security Beheer
            </a>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "2.5rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#64748b",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Nog geen projecten geregistreerd.
          </p>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.85rem",
              marginTop: "0.5rem",
            }}
          >
            Start je SDK-script met een geldig token om te verbinden.
          </p>
        </div>
      ) : (
        <div className="dw-project-grid">
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/projects/${p.id}`}
              className="dw-project-card"
            >
              <div className="dw-card-header">
                <div className="dw-status-badge">
                  <span
                    className={`dw-status-dot dw-status-dot--${p.status}`}
                  />
                  <span
                    style={{
                      color: p.status === "online" ? "#16a34a" : "#64748b",
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>

              <h3 className="dw-card-title">{p.name}</h3>
              <p className="dw-card-id">{p.id}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
