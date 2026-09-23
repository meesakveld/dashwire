import { CapabilityHandle } from "./CapabilityHandle.js";
import type { Capability, LogLevel } from "@dashwire/core";

export class TerminalHandle extends CapabilityHandle<string> {
  constructor(
    definition: Capability,
    emitUpdate: (path: string, value: string) => void,
    private readonly emitLog: (level: LogLevel, message: string, source: string, metadata?: Record<string, unknown>) => void
  ) {
    super(definition, emitUpdate);
  }

  readonly log = {
    debug: (message: string, metadata?: Record<string, unknown>) => 
      this.emitLog("debug", message, this.definition.key, metadata),
    info: (message: string, metadata?: Record<string, unknown>) => 
      this.infoLog(message, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) => 
      this.emitLog("warn", message, this.definition.key, metadata),
    error: (message: string, metadata?: Record<string, unknown>) => 
      this.emitLog("error", message, this.definition.key, metadata),
  };

  private infoLog(message: string, metadata?: Record<string, unknown>) {
    this.emitLog("info", message, this.definition.key, metadata);
  }
}