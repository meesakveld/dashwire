import type { StatusCapability } from "@dashwire/core";

export function StatusControl({ capability }: { capability: StatusCapability }) {
  return (
    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#0f172a", background: "#f1f5f9", padding: "0.25rem 0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
      {capability.value}
    </span>
  );
}
