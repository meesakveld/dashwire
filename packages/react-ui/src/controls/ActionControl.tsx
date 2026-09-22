import type { ActionCapability } from "@dashwire/core";

export function ActionControl({ capability, onExecute }: { capability: ActionCapability; onExecute: () => void }) {
  const handleClick = () => {
    if (capability.confirm && !window.confirm(`${capability.label}?`)) return;
    onExecute();
  };

  return (
    <button className="dw-control dw-action-btn" onClick={handleClick}>
      {capability.label}
    </button>
  );
}