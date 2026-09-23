"use client";

import { io, type Socket } from "socket.io-client";
import type { ServerToDashboardEvents, DashboardToServerEvents } from "@dashwire/core";

let socket: Socket<ServerToDashboardEvents, DashboardToServerEvents> | null = null;

export function getDashboardSocket(): Socket<ServerToDashboardEvents, DashboardToServerEvents> {
  if (!socket) {
    const serverUrl = process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
    socket = io(`${serverUrl}/dashboard`, { autoConnect: true });
  }
  return socket;
}

export function serverUrl(): string {
  return process.env.NEXT_PUBLIC_DASHWIRE_SERVER_URL ?? "http://localhost:4000";
}
