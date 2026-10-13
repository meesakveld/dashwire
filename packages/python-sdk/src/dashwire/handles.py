from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable, Dict, Generic, Optional, TypeVar

from .core import Capability, LogLevel

if TYPE_CHECKING:
    from .dashboard import Dashboard

T = TypeVar("T")
Handler = Callable[[Any], None]


class CapabilityHandle(Generic[T]):
    """Reference to a registered capability."""

    def __init__(self, dashboard: "Dashboard", definition: Capability) -> None:
        self._dashboard = dashboard
        self.definition = definition

    @property
    def path(self) -> str:
        return self.definition["path"]

    @property
    def key(self) -> str:
        return self.definition["key"]

    @property
    def value(self) -> Optional[T]:
        return self.definition.get("value")

    def set_value(self, value: T) -> None:
        """Update the value locally and push it to the dashboard."""
        self.definition["value"] = value
        self._dashboard._emit_update(self.path, value)

    def on_change(self, handler: Callable[[T], None]) -> Callable[[T], None]:
        """Register (or replace) the handler for dashboard commands.

        Can be used as a decorator::

            @maintenance.on_change
            def handle(enabled: bool) -> None: ...
        """
        self._dashboard._handlers[self.path] = handler
        return handler


class TerminalLog:
    def __init__(self, handle: "TerminalHandle") -> None:
        self._handle = handle

    def _emit(self, level: LogLevel, message: str, metadata: Optional[Dict[str, Any]]) -> None:
        self._handle._dashboard.emit_log(level, message, self._handle.key, metadata)

    def debug(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        self._emit("debug", message, metadata)

    def info(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        self._emit("info", message, metadata)

    def warn(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        self._emit("warn", message, metadata)

    warning = warn

    def error(self, message: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        self._emit("error", message, metadata)


class TerminalHandle(CapabilityHandle[str]):
    """Handle for a ``terminal`` (logs) capability."""

    def __init__(self, dashboard: "Dashboard", definition: Capability) -> None:
        super().__init__(dashboard, definition)
        self.log = TerminalLog(self)

    def on_command(self, handler: Callable[[str], None]) -> Callable[[str], None]:
        return self.on_change(handler)

    def set_value(self, value: str) -> None:
        # Same as the TS TerminalHandle: runs the local command handler and
        # reports the value to the server.
        self._dashboard.apply_command(self.path, value)
