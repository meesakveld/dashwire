import { useState, useEffect } from "react";
import type { ToggleCapability } from "@dashwire/core";

export function ToggleControl({ capability, onCommand }: { capability: ToggleCapability; onCommand: (v: boolean) => void }) {
  const [checked, setChecked] = useState<boolean>(() => Boolean(capability.value ?? false));

  useEffect(() => {
    setChecked(Boolean(capability.value ?? false));
  }, [capability.value]);

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={!capability.writable}
      onChange={(e) => {
        const newVal = e.target.checked;
        setChecked(newVal);
        onCommand(newVal);
      }}
      style={{ cursor: capability.writable ? "pointer" : "not-allowed", opacity: capability.writable ? 1 : 0.5 }}
    />
  );
}
