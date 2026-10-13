"""Python SDK for connecting projects to a Dashwire control plane."""

from importlib.metadata import PackageNotFoundError, version as _version

from .core import build_path, slugify, state_from_structure
from .dashboard import Dashboard, SectionBuilder
from .handles import CapabilityHandle, TerminalHandle

__all__ = [
    "Dashboard",
    "SectionBuilder",
    "CapabilityHandle",
    "TerminalHandle",
    "build_path",
    "slugify",
    "state_from_structure",
]

try:
    __version__ = _version("dashwire")
except PackageNotFoundError:  # pragma: no cover - running from a source checkout
    __version__ = "0.0.0"
