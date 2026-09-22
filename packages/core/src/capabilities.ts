export type CapabilityType =
  | "toggle"
  | "color"
  | "number"
  | "slider"
  | "select"
  | "action"
  | "status"
  | "logs";

export interface CapabilityBase {
  key: string;
  path: string;
  label: string;
  type: CapabilityType;
  writable: boolean;
}

export interface ToggleCapability extends CapabilityBase {
  type: "toggle";
  value: boolean;
}

export interface ColorCapability extends CapabilityBase {
  type: "color";
  value: string;
}

export interface NumberCapability extends CapabilityBase {
  type: "number";
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface SliderCapability extends CapabilityBase {
  type: "slider";
  value: number;
  min: number;
  max: number;
  step?: number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectCapability extends CapabilityBase {
  type: "select";
  value: string;
  options: SelectOption[];
}

export interface ActionCapability extends CapabilityBase {
  type: "action";
  writable: true;
  value?: undefined;
  confirm?: boolean;
}

export interface StatusCapability extends CapabilityBase {
  type: "status";
  writable: false;
  value: string;
  tone?: string;
}

export interface LogsCapability extends CapabilityBase {
  type: "logs";
  writable: false;
  value?: undefined;
}

export type Capability =
  | ToggleCapability
  | ColorCapability
  | NumberCapability
  | SliderCapability
  | SelectCapability
  | ActionCapability
  | StatusCapability
  | LogsCapability;

export interface Section {
  name: string;
  slug: string;
  capabilities: Capability[];
}

export interface DashboardStructure {
  projectId: string;
  projectName: string;
  sections: Section[];
}

export type CapabilityState = Record<string, unknown>;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildPath(sectionSlug: string, key: string): string {
  return `${sectionSlug}.${key}`;
}

export function stateFromStructure(structure: DashboardStructure): CapabilityState {
  const state: CapabilityState = {};
  for (const section of structure.sections) {
    for (const capability of section.capabilities) {
      if ("value" in capability && capability.value !== undefined) {
        state[capability.path] = capability.value;
      }
    }
  }
  return state;
}
