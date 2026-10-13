"""Minimal Dashwire example.

    DASHWIRE_SERVER_URL=http://localhost:4000 DASHWIRE_TOKEN=... python examples/basic.py
"""

import logging
import threading
import time

from dashwire import Dashboard

logging.basicConfig(level=logging.INFO)

dashboard = Dashboard(id="python-worker", name="Python Worker")

with dashboard.section("Runtime") as section:
    health = section.status("health", label="Health", value="Operational", tone="success")

    maintenance = section.toggle("maintenance", label="Maintenance mode", value=False)

    @maintenance.on_change
    def on_maintenance(enabled: bool) -> None:
        print("Maintenance mode:", enabled)
        health.set_value("Maintenance" if enabled else "Operational")

    section.slider("workers", label="Workers", value=4, min=1, max=16, on_change=lambda v: print("Workers:", v))
    section.select("region", label="Region", value="eu", options=[{"label": "Europe", "value": "eu"}, "us"])
    section.action("restart", label="Restart", confirm=True, on_execute=lambda: terminal.log.warn("Restart requested"))

    terminal = section.terminal("logs", label="Logs", writable=True, on_command=lambda cmd: terminal.log.info(f"$ {cmd}"))

with dashboard.section("Metrics") as section:
    uptime = section.number("uptime", label="Uptime", value=0, unit="s")


def tick() -> None:
    start = time.time()
    while True:
        uptime.set_value(round(time.time() - start))
        time.sleep(5)


dashboard.connect()
terminal.log.info("Service started")
threading.Thread(target=tick, daemon=True).start()
dashboard.wait()
