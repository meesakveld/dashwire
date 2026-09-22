import type { Capability } from "@dashwire/core";
import { ToggleControl } from "./controls/ToggleControl.js";
import { ColorControl } from "./controls/ColorControl.js";
import { NumberControl } from "./controls/NumberControl.js";
import { SliderControl } from "./controls/SliderControl.js";
import { SelectControl } from "./controls/SelectControl.js";
import { ActionControl } from "./controls/ActionControl.js";
import { StatusControl } from "./controls/StatusControl.js";
import { TerminalControl } from "./controls/TerminalControl.js";

export interface CapabilityRendererProps {
  capability: Capability;
  onCommand: (path: string, value: unknown) => void;
  onExecute: (path: string) => void;
}

export function CapabilityRenderer({ capability, onCommand, onExecute }: CapabilityRendererProps) {
  switch (capability.type) {
    case "toggle":
      return <ToggleControl capability={capability} onCommand={(v) => onCommand(capability.path, v)} />;
    case "color":
      return <ColorControl capability={capability} onCommand={(v) => onCommand(capability.path, v)} />;
    case "number":
      return <NumberControl capability={capability} onCommand={(v) => onCommand(capability.path, v)} />;
    case "slider":
      return <SliderControl capability={capability} onCommand={(v) => onCommand(capability.path, v)} />;
    case "select":
      return <SelectControl capability={capability} onCommand={(v) => onCommand(capability.path, v)} />;
    case "action":
      return <ActionControl capability={capability} onExecute={() => onExecute(capability.path)} />;
    case "status":
      return <StatusControl capability={capability} />;
    case "logs":
      return <TerminalControl capability={capability} onCommand={(v) => onCommand(capability.path, v)} />;
    default:
      return null;
  }
}
