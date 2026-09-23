import type { Capability } from "@dashwire/core";

export type UnsubscribeFn = () => void;

export class CapabilityHandle<T = unknown> {
  constructor(
    public readonly definition: Capability,
    private readonly emitUpdate: (path: string, value: T) => void,
  ) {}

  setValue(value: T): void {
    (this.definition as { value?: unknown }).value = value;
    this.emitUpdate(this.definition.path, value);
  }

  get value(): T | undefined {
    return (this.definition as { value?: T }).value;
  }
}