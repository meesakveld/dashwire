from __future__ import annotations

import re
from typing import Any, Dict, List, Literal

CapabilityType = Literal[
    "toggle", "color", "number", "slider", "select", "action", "status", "logs"
]
LogLevel = Literal["debug", "info", "warn", "error"]

Capability = Dict[str, Any]
Section = Dict[str, Any]
DashboardStructure = Dict[str, Any]


def slugify(value: str) -> str:
    """Same behaviour as ``slugify`` in ``@dashwire/core``."""
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return re.sub(r"(^-|-$)", "", slug)


def build_path(section_slug: str, key: str) -> str:
    return f"{section_slug}.{key}"


def state_from_structure(structure: DashboardStructure) -> Dict[str, Any]:
    state: Dict[str, Any] = {}
    sections: List[Section] = structure.get("sections", [])
    for section in sections:
        for capability in section.get("capabilities", []):
            if capability.get("value") is not None:
                state[capability["path"]] = capability["value"]
    return state
