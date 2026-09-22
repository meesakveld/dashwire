// --- START FILE: apps/dashboard/app/setup/page.tsx ---
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    
    try {
      const res = await fetch(`${serverUrl}/api/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup mislukt");

      localStorage.setItem("dashwire_auth_token", data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="dw-auth-container">
      <div className="dw-auth-card">
        <h1 className="dw-auth-title">Eerste Opstart Setup</h1>
        <p className="dw-auth-subtitle">Maak het eerste admin-account aan om toegang te krijgen tot het dashboard.</p>
        
        {error && <div className="dw-auth-error">{error}</div>}
        
        <form onSubmit={handleSetup} className="dw-auth-form">
          <input
            type="text"
            placeholder="Admin gebruikersnaam"
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
            Account Aanmaken & Doorgaan
          </button>
        </form>
      </div>
    </div>
  );
}
// --- END FILE: apps/dashboard/app/setup/page.tsx ---