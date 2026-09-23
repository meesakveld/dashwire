"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// @ts-ignore
import "./globals.css";
// @ts-ignore
import "@dashwire/react-ui/src/react-ui.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";

    fetch(`${serverUrl}/api/auth/status`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.hasAdmin) {
          if (pathname !== "/setup") {
            router.push("/setup");
          }
        } else {
          const token = localStorage.getItem("dashwire_auth_token");
          if (!token && pathname !== "/login" && pathname !== "/setup") {
            router.push("/login");
          }
        }
        setChecking(false);
      })
      .catch(() => {
        setChecking(false);
      });
  }, [pathname, router]);

  if (checking) {
    return (
      <html lang="en">
        <body>
          <main className="dw-main dw-loading-screen">
            Laden...
          </main>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <header className="dw-header">
          <div className="dw-header-wrapper">
            <a href="/" className="dw-logo">Dash<span className="dw-logo-purple">wire</span></a>
            {localStorage.getItem("dashwire_auth_token") && (
              <button
                onClick={() => {
                  localStorage.removeItem("dashwire_auth_token");
                  router.push("/login");
                }}
                className="dw-logout-btn"
              >
                Uitloggen
              </button>
            )}
          </div>
        </header>
        <main className="dw-main">{children}</main>
      </body>
    </html>
  );
}
