import { useState, useEffect } from "react";
import type { SliderCapability } from "@dashwire/core";

export function SliderControl({ capability, onCommand }: { capability: SliderCapability; onCommand: (v: number) => void }) {
  const parseNum = (val: unknown, fallback: number) => {
    const parsed = Number(val);
    return !isNaN(parsed) ? parsed : fallback;
  };

  console.log("capability", capability)

  const initialValue = parseNum(capability.value, parseNum(capability.min, 0));
  const [val, setVal] = useState<number>(initialValue);

  useEffect(() => {
    setVal(parseNum(capability.value, parseNum(capability.min, 0)));
  }, [capability.value, capability.min]);

  return (
    <div className="dw-control dw-slider" style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%" }}>
      <input
        type="range"
        value={val}
        min={capability.min ?? 0}
        max={capability.max ?? 100}
        step={capability.step ?? 1}
        disabled={!capability.writable}
        onChange={(e) => setVal(Number(e.target.value))}
        onMouseUp={(e) => onCommand(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommand(Number((e.target as HTMLInputElement).value))}
        style={{ width: "150px", cursor: capability.writable ? "pointer" : "not-allowed", opacity: capability.writable ? 1 : 0.5 }}
      />
      <span style={{ fontSize: "0.85rem", fontFamily: "monospace", fontWeight: "600", width: "35px", textAlign: "right" }}>{val}</span>
    </div>
  );
}