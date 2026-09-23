import { useState, useEffect } from "react";
import type { NumberCapability } from "@dashwire/core";

export function NumberControl({ capability, onCommand }: { capability: NumberCapability; onCommand: (v: number) => void }) {
  const parseNum = (val: unknown, fallback: number) => {
    const parsed = Number(val);
    return !isNaN(parsed) ? parsed : fallback;
  };

  const initialValue = parseNum(capability.value, parseNum(capability.min, 0));
  const [val, setVal] = useState<number>(initialValue);

  useEffect(() => {
    setVal(parseNum(capability.value, parseNum(capability.min, 0)));
  }, [capability.value, capability.min]);

  return (
    <div className="dw-control dw-number">
      {capability.writable ? (
        <input
          type="number"
          value={val}
          min={capability.min}
          max={capability.max}
          step={capability.step ?? 1}
          onChange={(e) => setVal(Number(e.target.value))}
          onBlur={(e) => onCommand(Number(e.target.value))}
        />
      ) : (
        <span className="number">{val}</span>
      )}
      {capability.unit && <span>{capability.unit}</span>}
    </div>
  );
}
