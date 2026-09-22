import type { SelectCapability } from "@dashwire/core";

export function SelectControl({ capability, onCommand }: { capability: SelectCapability; onCommand: (v: string) => void }) {
  return (
    <label className="dw-control dw-select">
      <span>{capability.label}</span>
      <select value={capability.value} disabled={!capability.writable} onChange={(e) => onCommand(e.target.value)}>
        {capability.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
