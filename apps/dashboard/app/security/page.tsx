"use client";

import { useEffect, useState } from "react";

interface ProjectTokenRecord {
  id: string;
  projectId: string;
  token: string;
  active: boolean;
  createdAt: string;
}

export default function GlobalSecurityPage() {
  const [tokens, setTokens] = useState<ProjectTokenRecord[]>([]);
  const [tokenLabel, setTokenLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTokens = () => {
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    fetch(`${serverUrl}/api/projects/tokens/all`)
      .then((res) => res.json())
      .then((tokenData) => {
        setTokens(tokenData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleToggleActive = (tokenId: string, currentActive: boolean) => {
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    fetch(`${serverUrl}/api/projects/tokens/${tokenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    }).then(() => fetchTokens());
  };

  const handleDelete = (tokenId: string) => {
    if (!confirm("Weet je zeker dat je dit token wilt intrekken?")) return;
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    fetch(`${serverUrl}/api/projects/tokens/${tokenId}`, {
      method: "DELETE",
    }).then(() => fetchTokens());
  };

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    fetch(`${serverUrl}/api/projects/tokens/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: tokenLabel.trim() || "Universele Sleutel" }),
    })
      .then((res) => res.json())
      .then(() => {
        setTokenLabel("");
        fetchTokens();
      });
  };

  const handleCopy = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Securiteitsgegevens laden...</div>;
  }

  return (
    <div className="dw-security-container">
      <a href="/" className="dw-back-link">
        &larr; Terug naar Overzicht
      </a>

      <div style={{ marginTop: "1rem", marginBottom: "2rem" }}>
        <h1 className="dw-overview-title">Centraal Token Beheer</h1>
        <p className="dw-overview-subtitle">Genereer universele JWT-tokens die je voor al je projecten kunt gebruiken.</p>
      </div>

      {/* Nieuw token aanmaken */}
      <div className="dw-security-card">
        <h3 className="dw-security-title">Nieuw Universeel Token Aanmaken</h3>
        <form onSubmit={handleCreateToken} className="dw-security-form">
          <input
            type="text"
            placeholder="Label / Naam voor deze sleutel (optioneel)"
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
            className="dw-security-select"
          />
          <button type="submit" className="dw-action-btn">
            Genereer Token +
          </button>
        </form>
      </div>

      {/* Overzicht van alle tokens */}
      <div className="dw-security-card">
        <h3 className="dw-security-title">Actieve en Inactieve Tokens</h3>
        {tokens.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>Geen tokens gevonden.</p>
        ) : (
          <div>
            {tokens.map((t) => (
              <div key={t.id} className="dw-token-row">
                <div style={{ flex: 1, marginRight: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#0f172a" }}>Token ID: {t.id}</span>
                    <span className={`dw-badge ${t.active ? "dw-badge--active" : "dw-badge--inactive"}`}>
                      {t.active ? "Actief" : "Inactief"}
                    </span>
                  </div>
                  <input type="text" readOnly value={t.token} className="dw-token-input" />
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleCopy(t.token, t.id)}
                    className="dw-btn-security dw-btn-copy"
                  >
                    {copiedId === t.id ? "Gekopieerd!" : "Kopieer"}
                  </button>
                  <button
                    onClick={() => handleToggleActive(t.id, t.active)}
                    className={`dw-btn-security ${t.active ? "dw-btn-toggle-active" : "dw-btn-toggle-inactive"}`}
                  >
                    {t.active ? "Deactiveer" : "Activeer"}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="dw-btn-security dw-btn-delete"
                  >
                    Verwijder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}