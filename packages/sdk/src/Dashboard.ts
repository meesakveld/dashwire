import { io, type Socket } from "socket.io-client";
import {
  buildPath,
  slugify,
  type Capability,
  type DashboardStructure,
  type LogLevel,
  type SdkToServerEvents,
  type ServerToSdkEvents,
  type Section,
} from "@dashwire/core";
import { CapabilityHandle } from "./CapabilityHandle.js";
import { TerminalHandle } from "./TerminalHandle.js";

export interface DashwireConfig {
  id: string;
  name: string;
  serverUrl?: string;
  token?: string;
  serverJWT?: string;
  server?: {
    url?: string;
    token?: string;
  };
}

interface ToggleOptions { label: string; value: boolean; onChange?: (value: boolean) => void; }
interface ColorOptions { label: string; value: string; onChange?: (value: string) => void; }
interface NumberOptions { label: string; value: number; min?: number; max?: number; step?: number; unit?: string; onChange?: (value: number) => void; }
interface SliderOptions { label: string; value: number; min: number; max: number; step?: number; onChange?: (value: number) => void; }
interface SelectOptions { label: string; value: string; options: { label: string; value: string }[]; onChange?: (value: string) => void; }
interface ActionOptions { label: string; confirm?: boolean; onExecute?: () => void; }
interface StatusOptions { label: string; value: string; tone?: string; }
interface TerminalOptions { label: string; writable?: boolean; onCommand?: (command: string) => void; }

type OnChangeHandler = (value: unknown) => void;

export class SectionBuilder {
  constructor(
    private readonly dashboard: Dashboard,
    private readonly sectionSlug: string
  ) {}

  toggle(key: string, opts: ToggleOptions): CapabilityHandle<boolean> {
    return this.dashboard.registerIn<boolean>(this.sectionSlug, { key, type: "toggle", label: opts.label, value: opts.value, writable: true }, opts.onChange as OnChangeHandler);
  }

  color(key: string, opts: ColorOptions): CapabilityHandle<string> {
    return this.dashboard.registerIn<string>(this.sectionSlug, { key, type: "color", label: opts.label, value: opts.value, writable: true }, opts.onChange as OnChangeHandler);
  }

  number(key: string, opts: NumberOptions): CapabilityHandle<number> {
    return this.dashboard.registerIn<number>(this.sectionSlug, { key, type: "number", label: opts.label, value: opts.value, min: opts.min, max: opts.max, step: opts.step, unit: opts.unit, writable: true }, opts.onChange as OnChangeHandler);
  }

  slider(key: string, opts: SliderOptions): CapabilityHandle<number> {
    return this.dashboard.registerIn<number>(this.sectionSlug, { key, type: "slider", label: opts.label, value: opts.value, min: opts.min, max: opts.max, step: opts.step, writable: true }, opts.onChange as OnChangeHandler);
  }

  select(key: string, opts: SelectOptions): CapabilityHandle<string> {
    return this.dashboard.registerIn<string>(this.sectionSlug, { key, type: "select", label: opts.label, value: opts.value, options: opts.options, writable: true }, opts.onChange as OnChangeHandler);
  }

  action(key: string, opts: ActionOptions): CapabilityHandle<undefined> {
    return this.dashboard.registerIn<undefined>(this.sectionSlug, { key, type: "action", label: opts.label, confirm: opts.confirm, writable: true }, opts.onExecute as OnChangeHandler);
  }

  status(key: string, opts: StatusOptions): CapabilityHandle<string> {
    return this.dashboard.registerIn<string>(this.sectionSlug, { key, type: "status", label: opts.label, value: opts.value, tone: opts.tone, writable: false });
  }

  terminal(key: string, opts: TerminalOptions): TerminalHandle {
    const handle = this.dashboard.registerIn<string>(this.sectionSlug, {
      key,
      type: "logs",
      label: opts.label,
      writable: opts.writable ?? false,
    }, opts.onCommand as OnChangeHandler);

    return new TerminalHandle(
      handle.definition,
      (path: string, val: string) => this.dashboard.applyCommand(path, val),
      (level: LogLevel, message: string, source: string, metadata?: Record<string, unknown>) => this.dashboard.emitLog(level, message, source, metadata)
    );
  }
}

export class Dashboard {
  private readonly config: Required<DashwireConfig>;
  private sections: Section[] = [];
  private handlers = new Map<string, OnChangeHandler>();
  private handles = new Map<string, CapabilityHandle<unknown>>();
  private socket: Socket<ServerToSdkEvents, SdkToServerEvents> | null = null;
  
  private connected = false;
  private listeners = new Set<() => void>();
  private stateListeners = new Set<() => void>();

  constructor(config: DashwireConfig) {
    const resolvedUrl =
      config.server?.url ??
      config.serverUrl ??
      (typeof process !== "undefined" ? process.env?.DASHWIRE_SERVER_URL : undefined) ??
      "http://localhost:4000";

    const resolvedToken =
      config.server?.token ??
      config.token ??
      config.serverJWT ??
      (typeof process !== "undefined" ? process.env?.DASHWIRE_TOKEN ?? process.env?.SERVER_JWT ?? process.env?.token : undefined) ??
      "";

    this.config = {
      serverUrl: resolvedUrl,
      token: resolvedToken,
      serverJWT: resolvedToken,
      server: { url: resolvedUrl, token: resolvedToken },
      id: config.id,
      name: config.name,
    };
  }

  section(name: string, define: (section: SectionBuilder) => void): void {
    const slug = slugify(name);
    let section = this.sections.find((s) => s.slug === slug);
    if (!section) {
      section = { name, slug, capabilities: [] };
      this.sections.push(section);
    } else {
      section.capabilities = [];
    }
    const builder = new SectionBuilder(this, slug);
    define(builder);
  }

  getStructure(): DashboardStructure {
    return {
      projectId: this.config.id,
      projectName: this.config.name,
      sections: this.sections,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeState(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  applyCommand(path: string, value: unknown): void {
    this.dispatch(path, value);
    this.socket?.emit("state:update", { path, value });
  }

  /**
   * Registreert het dashboard bij de server en opent de socket-verbinding.
   *
   * In plaats van te stoppen zodra de server (nog) niet bereikbaar is, blijft
   * dit intern proberen met exponentiële backoff (max. 30s tussen pogingen)
   * totdat de registratie lukt. Zodra de socket eenmaal is aangemaakt, regelt
   * socket.io-client zelf het automatisch herverbinden als de verbinding
   * later wegvalt (reconnection: true, reconnectionAttempts: Infinity), dus
   * dat hoeft hier niet apart afgehandeld te worden.
   */
  async connect(): Promise<void> {
    let attempt = 0;
    while (true) {
      try {
        await this.registerAndOpenSocket();
        return;
      } catch (err) {
        attempt += 1;
        const delayMs = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
        console.warn(
          `[dashwire] Could not reach server (attempt ${attempt}): ${
            (err as Error).message
          }. Retrying in ${Math.round(delayMs / 1000)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async registerAndOpenSocket(): Promise<void> {
    const res = await fetch(`${this.config.serverUrl}/api/projects/${this.config.id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.config.token ? { "Authorization": `Bearer ${this.config.token}` } : {}) },
      body: JSON.stringify({
        projectId: this.config.id,
        projectName: this.config.name,
        structure: this.getStructure(),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Dashwire secure registration failed (${res.status}): ${errText}`);
    }
    const body = (await res.json()) as { token?: string };
    const token = this.config.token || body.token || "";
    this.config.token = token;

    // Ruim een socket van een eerdere mislukte poging netjes op voordat we een nieuwe openen.
    this.socket?.removeAllListeners();
    this.socket?.disconnect();

    this.socket = io(`${this.config.serverUrl}/sdk`, {
      auth: { token },
      query: { projectId: this.config.id },
      reconnection: true,
    });

    this.socket.on("connect", () => {
      const wasConnected = this.connected;
      this.connected = true;
      if (!wasConnected) {
        console.log("[dashwire] Connected to server.");
      }
      this.socket!.emit("state:sync", { state: this.currentState() });
    });
    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.warn(`[dashwire] Lost connection to server (${reason}). Attempting to reconnect...`);
      // Geen verdere actie nodig: socket.io-client blijft zelf op de
      // achtergrond herverbinden zodra de server weer bereikbaar is
      // (zie de "reconnect_attempt" / "reconnect" logging hieronder).
    });
    this.socket.on("capability:command", ({ path, value }) => this.dispatch(path, value));
    this.socket.on("action:execute", ({ path }) => this.dispatch(path, undefined));

    // Deze events zitten op de Manager (socket.io), niet op de socket zelf.
    this.socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`[dashwire] Reconnecting to server... (attempt ${attempt})`);
    });
    this.socket.io.on("reconnect", (attempt) => {
      console.log(`[dashwire] Reconnected to server after ${attempt} attempt(s).`);
    });
    this.socket.io.on("reconnect_error", (err) => {
      console.warn(`[dashwire] Reconnect attempt failed: ${(err as Error).message}`);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  registerIn<T>(
    sectionSlug: string,
    partial: { key: string; type: Capability["type"]; label: string; writable: boolean; value?: T; [extra: string]: unknown },
    onChange?: (value: T) => void,
  ): CapabilityHandle<T> {
    const path = buildPath(sectionSlug, partial.key);
    const capability = { ...partial, path } as Capability;
    let section = this.sections.find((s) => s.slug === sectionSlug);
    if (!section) {
      section = { name: sectionSlug, slug: sectionSlug, capabilities: [] };
      this.sections.push(section);
    }
    section.capabilities.push(capability);

    if (onChange) this.handlers.set(path, onChange as OnChangeHandler);

    const handle = new CapabilityHandle<T>(capability, (p, value) => {
      this.socket?.emit("state:update", { path: p, value });
      for (const listener of this.listeners) listener();
      for (const listener of this.stateListeners) listener();
    });
    this.handles.set(path, handle as CapabilityHandle<unknown>);
    return handle;
  }

  emitLog(level: LogLevel, message: string, source?: string, metadata?: Record<string, unknown>): void {
    this.socket?.emit("log:new", { timestamp: new Date().toISOString(), level, message, source, metadata });
  }

  private dispatch(path: string, value: unknown): void {
    const handler = this.handlers.get(path);
    if (handler) handler(value);
    const handle = this.handles.get(path);
    if (handle) {
      (handle.definition as { value?: unknown }).value = value;
      for (const listener of this.listeners) listener();
      for (const listener of this.stateListeners) listener();
    }
  }

  private currentState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const [path, handle] of this.handles) {
      if (handle.value !== undefined) state[path] = handle.value;
    }
    return state;
  }
}