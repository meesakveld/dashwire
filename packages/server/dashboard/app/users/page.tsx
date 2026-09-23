"use client";

import { useEffect, useState } from "react";

interface UserRecord {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = () => {
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    const token = localStorage.getItem("dashwire_auth_token") ?? "";

    fetch(`${serverUrl}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Geen toegang of fout bij ophalen.");
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    const token = localStorage.getItem("dashwire_auth_token") ?? "";

    fetch(`${serverUrl}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, password, role }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
        return data;
      })
      .then(() => {
        setUsername("");
        setPassword("");
        setRole("user");
        fetchUsers();
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Weet je zeker dat je deze gebruiker wilt verwijderen?")) return;
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    const token = localStorage.getItem("dashwire_auth_token") ?? "";

    fetch(`${serverUrl}/api/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Verwijderen mislukt");
        fetchUsers();
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  if (loading) {
    return <div className="dw-loading-screen">Gebruikers laden...</div>;
  }

  const token = localStorage.getItem("dashwire_auth_token") ?? "";
  let currentUserId = "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    currentUserId = payload.id;
  } catch {}

  return (
    <div className="dw-security-container">
      <a href="/" className="dw-back-link">
        &larr; Terug naar Overzicht
      </a>

      <div style={{ marginBottom: "2rem" }}>
        <h1 className="dw-overview-title">Gebruikersbeheer</h1>
        <p className="dw-overview-subtitle">Beheer accounts en rolrechten binnen het dashwire-systeem.</p>
      </div>

      {error && <div className="dw-auth-error">{error}</div>}

      {/* Nieuwe gebruiker aanmaken */}
      <div className="dw-security-card">
        <h3 className="dw-security-title">Nieuwe Gebruiker Toevoegen</h3>
        <form onSubmit={handleCreateUser} className="dw-security-form-grid">
          <input
            type="text"
            placeholder="Gebruikersnaam"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="dw-security-select"
            required
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="dw-security-select"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "user")}
            className="dw-select-control"
          >
            <option value="user">User (Alleen dashboards)</option>
            <option value="admin">Admin (Volledige toegang)</option>
          </select>
          <button type="submit" className="dw-action-btn" style={{ whiteSpace: "nowrap", height: "100%" }}>
            Toevoegen +
          </button>
        </form>
      </div>

      {/* Overzicht van bestaande gebruikers */}
      <div className="dw-security-card">
        <h3 className="dw-security-title">Bestaande Gebruikers</h3>
        {users.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>Geen gebruikers gevonden.</p>
        ) : (
          <div>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;

              return (
                <div key={u.id} className="dw-token-row">
                  <div style={{ flex: 1, marginRight: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span style={{ fontWeight: "bold", fontSize: "0.95rem", color: "#0f172a" }}>{u.username}</span>
                      <span className={`dw-badge ${u.role === "admin" ? "dw-badge--active" : "dw-badge--inactive"}`}>
                        {u.role.toUpperCase()}
                      </span>
                      {isSelf && <span style={{ fontSize: "0.75rem", color: "#4f46e5", fontWeight: "600" }}>(Jij)</span>}
                    </div>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#94a3b8" }}>
                      Aangemaakt op: {new Date(u.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    {!isSelf && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="dw-btn-security dw-btn-delete"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
