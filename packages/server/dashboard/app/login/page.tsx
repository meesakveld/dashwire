"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";

    try {
      const res = await fetch(`${serverUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inloggen mislukt");

      // Sla de token-string correct op (controleer of data.token een string is)
      const tokenString = typeof data === "string" ? data : data.token;
      if (!tokenString) throw new Error("Geven token ontvangen van server.");

      localStorage.setItem("dashwire_auth_token", tokenString);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="dw-auth-container">
      <div className="dw-auth-card">
        <h1 className="dw-auth-title">Dashboard Inloggen</h1>
        <p className="dw-auth-subtitle">Voer je admin-gegevens in om door te gaan.</p>

        {error && <div className="dw-auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="dw-auth-form">
          <input
            type="text"
            placeholder="Gebruikersnaam"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="dw-auth-input"
            required
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="dw-auth-input"
            required
          />
          <button type="submit" className="dw-auth-btn">
            Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}
