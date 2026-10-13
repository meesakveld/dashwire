from __future__ import annotations

import logging
import os
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterator, List, Optional, Sequence, Set, Union

import requests
import socketio

from .core import Capability, DashboardStructure, LogLevel, Section, build_path, slugify
from .handles import CapabilityHandle, Handler, TerminalHandle

logger = logging.getLogger("dashwire")

NAMESPACE = "/sdk"
DEFAULT_SERVER_URL = "http://localhost:4000"

SelectOption = Union[Dict[str, str], str]


def _compact(values: Dict[str, Any]) -> Dict[str, Any]:
    # JSON.stringify in the TS SDK drops undefined fields; mirror that for None.
    return {k: v for k, v in values.items() if v is not None}


def _first_env(*names: str) -> Optional[str]:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return None


class SectionBuilder:
    """Registers capabilities inside one dashboard section."""

    def __init__(self, dashboard: "Dashboard", section_slug: str) -> None:
        self._dashboard = dashboard
        self._slug = section_slug

    def _register(self, key: str, type_: str, on_change: Optional[Handler] = None, **fields: Any) -> Capability:
        return self._dashboard._register_in(self._slug, {"key": key, "type": type_, **fields}, on_change)

    def toggle(self, key: str, *, label: str, value: bool, on_change: Optional[Callable[[bool], None]] = None) -> CapabilityHandle[bool]:
        return CapabilityHandle(self._dashboard, self._register(key, "toggle", on_change, label=label, value=value, writable=True))

    def color(self, key: str, *, label: str, value: str, on_change: Optional[Callable[[str], None]] = None) -> CapabilityHandle[str]:
        return CapabilityHandle(self._dashboard, self._register(key, "color", on_change, label=label, value=value, writable=True))

    def number(
        self,
        key: str,
        *,
        label: str,
        value: float,
        min: Optional[float] = None,
        max: Optional[float] = None,
        step: Optional[float] = None,
        unit: Optional[str] = None,
        writable: Optional[bool] = None,
        on_change: Optional[Callable[[float], None]] = None,
    ) -> CapabilityHandle[float]:
        is_writable = writable if writable is not None else on_change is not None
        definition = self._register(
            key, "number", on_change,
            label=label, value=value, min=min, max=max, step=step, unit=unit, writable=is_writable,
        )
        return CapabilityHandle(self._dashboard, definition)

    def slider(
        self,
        key: str,
        *,
        label: str,
        value: float,
        min: float,
        max: float,
        step: Optional[float] = None,
        on_change: Optional[Callable[[float], None]] = None,
    ) -> CapabilityHandle[float]:
        definition = self._register(
            key, "slider", on_change, label=label, value=value, min=min, max=max, step=step, writable=True
        )
        return CapabilityHandle(self._dashboard, definition)

    def select(
        self,
        key: str,
        *,
        label: str,
        value: str,
        options: Sequence[SelectOption],
        on_change: Optional[Callable[[str], None]] = None,
    ) -> CapabilityHandle[str]:
        normalized = [{"label": o, "value": o} if isinstance(o, str) else dict(o) for o in options]
        definition = self._register(key, "select", on_change, label=label, value=value, options=normalized, writable=True)
        return CapabilityHandle(self._dashboard, definition)

    def action(
        self,
        key: str,
        *,
        label: str,
        confirm: Optional[bool] = None,
        on_execute: Optional[Callable[[], None]] = None,
    ) -> CapabilityHandle[None]:
        handler = (lambda _value: on_execute()) if on_execute else None
        definition = self._register(key, "action", handler, label=label, confirm=confirm, writable=True)
        return CapabilityHandle(self._dashboard, definition)

    def status(self, key: str, *, label: str, value: str, tone: Optional[str] = None) -> CapabilityHandle[str]:
        return CapabilityHandle(self._dashboard, self._register(key, "status", label=label, value=value, tone=tone, writable=False))

    def terminal(
        self,
        key: str,
        *,
        label: str,
        writable: bool = False,
        on_command: Optional[Callable[[str], None]] = None,
    ) -> TerminalHandle:
        return TerminalHandle(self._dashboard, self._register(key, "logs", on_command, label=label, writable=writable))


class Dashboard:
    """Connects a Python project to a Dashwire server.

    Mirrors ``Dashboard`` from ``@dashwire/sdk``. The connection runs on
    background threads, so handlers are called from a socket thread.
    """

    def __init__(
        self,
        id: str,
        name: str,
        *,
        server_url: Optional[str] = None,
        token: Optional[str] = None,
        request_timeout: float = 10.0,
    ) -> None:
        self.id = id
        self.name = name
        self.server_url = (
            server_url or _first_env("DASHWIRE_SERVER_URL") or DEFAULT_SERVER_URL
        ).rstrip("/")
        self.token = token or _first_env("DASHWIRE_TOKEN", "DASHWIRE_SERVER_TOKEN", "SERVER_JWT", "token") or ""
        self.request_timeout = request_timeout

        self._sections: List[Section] = []
        self._handlers: Dict[str, Handler] = {}
        self._definitions: Dict[str, Capability] = {}
        self._listeners: Set[Callable[[], None]] = set()
        self._sio: Optional[socketio.Client] = None
        self._connected = False
        self._closing = False
        self._lock = threading.RLock()

    # ------------------------------------------------------------------ structure

    @contextmanager
    def section(self, name: str) -> Iterator[SectionBuilder]:
        """Define a section. Use as a context manager::

            with dashboard.section("Runtime") as section:
                section.toggle("maintenance", label="Maintenance", value=False)

        Re-defining a section with the same name replaces its capabilities.
        """
        slug = slugify(name)
        with self._lock:
            section = next((s for s in self._sections if s["slug"] == slug), None)
            if section is None:
                self._sections.append({"name": name, "slug": slug, "capabilities": []})
            else:
                for capability in section["capabilities"]:
                    self._definitions.pop(capability["path"], None)
                    self._handlers.pop(capability["path"], None)
                section["capabilities"] = []
        yield SectionBuilder(self, slug)

    def get_structure(self) -> DashboardStructure:
        return {"projectId": self.id, "projectName": self.name, "sections": self._sections}

    def _register_in(self, section_slug: str, partial: Dict[str, Any], on_change: Optional[Handler]) -> Capability:
        path = build_path(section_slug, partial["key"])
        capability = _compact({**partial, "path": path})
        with self._lock:
            section = next((s for s in self._sections if s["slug"] == section_slug), None)
            if section is None:
                section = {"name": section_slug, "slug": section_slug, "capabilities": []}
                self._sections.append(section)
            section["capabilities"].append(capability)
            self._definitions[path] = capability
            if on_change is not None:
                self._handlers[path] = on_change
        return capability

    # ------------------------------------------------------------------ state

    def subscribe(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Call ``listener`` whenever a capability value changes. Returns an unsubscribe function."""
        self._listeners.add(listener)
        return lambda: self._listeners.discard(listener)

    def apply_command(self, path: str, value: Any) -> None:
        """Run the local handler for ``path`` and report the new value to the server."""
        self._dispatch(path, value)
        self._emit("state:update", {"path": path, "value": value})

    def emit_log(
        self,
        level: LogLevel,
        message: str,
        source: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        timestamp = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        self._emit("log:new", _compact({
            "timestamp": timestamp,
            "level": level,
            "message": message,
            "source": source,
            "metadata": metadata,
        }))

    def _emit_update(self, path: str, value: Any) -> None:
        self._emit("state:update", {"path": path, "value": value})
        self._notify()

    def _dispatch(self, path: str, value: Any) -> None:
        handler = self._handlers.get(path)
        if handler is not None:
            try:
                handler(value)
            except Exception:
                logger.exception("[dashwire] Handler for %s raised an exception.", path)
        definition = self._definitions.get(path)
        if definition is not None:
            if value is None:
                definition.pop("value", None)
            else:
                definition["value"] = value
            self._notify()

    def _notify(self) -> None:
        for listener in list(self._listeners):
            listener()

    def _current_state(self) -> Dict[str, Any]:
        return {path: d["value"] for path, d in self._definitions.items() if d.get("value") is not None}

    # ------------------------------------------------------------------ transport

    def is_connected(self) -> bool:
        return self._connected

    def connect(self) -> None:
        """Register the project and open the realtime connection.

        Blocks until registration succeeds, retrying with exponential backoff
        (max. 30s between attempts) while the server is unreachable. Once the
        socket is established, python-socketio reconnects automatically.
        """
        attempt = 0
        while True:
            try:
                self._register_and_open_socket()
                return
            except Exception as err:
                attempt += 1
                delay = min(30, 2 ** min(attempt, 5))
                logger.warning(
                    "[dashwire] Could not reach server (attempt %d): %s. Retrying in %ds...",
                    attempt, err, delay,
                )
                time.sleep(delay)

    def wait(self) -> None:
        """Block the current thread until the connection is closed."""
        if self._sio is not None:
            self._sio.wait()

    def run_forever(self) -> None:
        """Connect and block until the process is stopped."""
        self.connect()
        try:
            self.wait()
        except KeyboardInterrupt:
            self.disconnect()

    def disconnect(self) -> None:
        self._closing = True
        try:
            if self._sio is not None:
                self._sio.disconnect()
                self._sio = None
        finally:
            self._connected = False
            self._closing = False

    def __enter__(self) -> "Dashboard":
        self.connect()
        return self

    def __exit__(self, *exc: object) -> None:
        self.disconnect()

    def _register_and_open_socket(self) -> None:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        res = requests.post(
            f"{self.server_url}/api/projects/{self.id}/register",
            json={"projectId": self.id, "projectName": self.name, "structure": self.get_structure()},
            headers=headers,
            timeout=self.request_timeout,
        )
        if not res.ok:
            raise RuntimeError(f"Dashwire secure registration failed ({res.status_code}): {res.text}")

        body = res.json() if res.content else {}
        self.token = self.token or body.get("token") or ""

        if self._sio is not None:
            self.disconnect()

        sio = socketio.Client(reconnection=True, logger=False, engineio_logger=False)
        self._attach_handlers(sio)
        sio.connect(
            f"{self.server_url}?projectId={requests.utils.quote(self.id)}",
            auth={"token": self.token},
            namespaces=[NAMESPACE],
            socketio_path="socket.io",
            wait_timeout=self.request_timeout,
        )
        self._sio = sio

    def _attach_handlers(self, sio: socketio.Client) -> None:
        @sio.on("connect", namespace=NAMESPACE)
        def on_connect() -> None:
            if not self._connected:
                logger.info("[dashwire] Connected to server.")
            self._connected = True
            sio.emit("state:sync", {"state": self._current_state()}, namespace=NAMESPACE)

        @sio.on("disconnect", namespace=NAMESPACE)
        def on_disconnect(*args: Any) -> None:
            self._connected = False
            if self._closing:
                return
            reason = args[0] if args else "unknown"
            logger.warning("[dashwire] Lost connection to server (%s). Attempting to reconnect...", reason)

        @sio.on("capability:command", namespace=NAMESPACE)
        def on_command(payload: Dict[str, Any]) -> None:
            self._dispatch(payload["path"], payload.get("value"))

        @sio.on("action:execute", namespace=NAMESPACE)
        def on_action(payload: Dict[str, Any]) -> None:
            self._dispatch(payload["path"], None)

    def _emit(self, event: str, payload: Dict[str, Any]) -> None:
        sio = self._sio
        if sio is None or not self._connected:
            return
        try:
            sio.emit(event, payload, namespace=NAMESPACE)
        except socketio.exceptions.SocketIOError as err:
            logger.debug("[dashwire] Could not emit %s: %s", event, err)
