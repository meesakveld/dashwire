import type { NumberCapability } from "@dashwire/core";

export function NumberControl({ capability, onCommand }: { capability: NumberCapability; onCommand: (v: number) => void }) {
  return (
    <label className="dw-control dw-number">
      <span>{capability.label}{capability.unit ? ` (${capability.unit})` : ""}</span>
      <input
        type="number"
        value={capability.value}
        min={capability.min}
        max={capability.max}
        step={capability.step ?? 1}
        disabled={!capability.writable}
        onChange={(e) => onCommand(Number(e.target.value))}
      />
    </label>
  );
}
