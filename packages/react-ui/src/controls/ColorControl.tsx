import type { ColorCapability } from "@dashwire/core";

export function ColorControl({ capability, onCommand }: { capability: ColorCapability; onCommand: (v: string) => void }) {
  return (
    <label className="dw-control dw-color">
      <span>{capability.label}</span>
      <input
        type="color"
        value={capability.value}
        disabled={!capability.writable}
        onChange={(e) => onCommand(e.target.value)}
      />
    </label>
  );
}
