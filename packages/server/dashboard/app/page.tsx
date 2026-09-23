"use client";

import { useEffect, useState } from "react";
import { getDashboardSocket } from "../lib/dashwireSocket";

interface ProjectSummary {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeenAt: string;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function OverviewPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    (socket as any).on("project:deleted", ({ projectId }: { projectId: string }) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    });

    return () => {
      socket.off("project:online");
      socket.off("project:offline");
      (socket as any).off("project:deleted");
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Weet je zeker dat je "${projectName}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
      return;
    }

    const serverUrl =
      process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    const token = localStorage.getItem("dashwire_auth_token");

    setDeletingId(projectId);
    try {
      const res = await fetch(`${serverUrl}/api/projects/${projectId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Verwijderen mislukt");
      }
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Verwijderen mislukt");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="dw-loading-screen">Projecten laden...</div>;
  }

  return (
    <div>
      <div className="dw-overview-header">
        <div>
          <h1 className="dw-overview-title">Projecten Overzicht</h1>
          <p className="dw-overview-subtitle">
            Beheer en monitor al je verbonden installaties en applicaties in
            real-time.
          </p>
        </div>

        {isAdmin && (
          <div className="dw-overview-actions">
            <div className="dw-action-group">
              <button
                type="button"
                className={`dw-btn ${editMode ? "dw-btn--outline-active" : "dw-btn--outline"}`}
                onClick={() => setEditMode((v) => !v)}
              >
                <PencilIcon />
                {editMode ? "Klaar" : "Bewerken"}
              </button>
            </div>

            <div className="dw-action-divider" />

            <div className="dw-action-group">
              <a href="/users" className="dw-btn dw-btn--neutral">
                Gebruikers Beheer
              </a>
              <a href="/security" className="dw-btn dw-btn--accent">
                JWT & Security Beheer
              </a>
            </div>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="dw-empty-state">
          <p className="dw-empty-state-title">Nog geen projecten geregistreerd.</p>
          <p className="dw-empty-state-subtitle">
            Start je SDK-script met een geldig token om te verbinden.
          </p>
        </div>
      ) : (
        <div className="dw-project-grid">
          {projects.map((p) => (
            <a key={p.id} href={`/projects?id=${p.id}`} className="dw-project-card">
              {editMode && isAdmin && (
                <button
                  type="button"
                  className="dw-icon-btn dw-icon-btn--danger dw-card-delete"
                  onClick={(e) => handleDelete(e, p.id, p.name)}
                  disabled={deletingId === p.id}
                  title="Project verwijderen"
                >
                  <TrashIcon />
                </button>
              )}

              <div className="dw-card-header">
                <div className="dw-status-badge">
                  <span className={`dw-status-dot dw-status-dot--${p.status}`} />
                  <span className={`dw-status-text--${p.status}`}>{p.status}</span>
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