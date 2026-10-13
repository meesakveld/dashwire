<div align="center">

<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;">
  <img src="https://raw.githubusercontent.com/meesakveld/dashwire/2bb06e4446699756ca43480a8787b6abd090b8b9/.github/assets/logo.svg" style="max-width: 12rem" />
  <p style="margin:0;font-size:22;font-weight:700">/ Python SDK</p>
</div>

<hr /><br />

[![PyPI version](https://img.shields.io/pypi/v/dashwire)](https://pypi.org/project/dashwire/)
[![PyPI downloads](https://img.shields.io/pypi/dm/dashwire)](https://pypi.org/project/dashwire/)
[![license](https://img.shields.io/badge/license-ISC-blue)](https://github.com/meesakveld/dashwire/blob/main/LICENSE)

**Connect a Python project to a Dashwire control plane.**

Register capabilities, synchronize state, receive commands, and publish logs from Python.

[Installation](#installation) · [Usage](#usage) · [Capabilities](#capabilities) · [Repository](#repository)

</div>

---

## Overview

`dashwire` is the Python counterpart of [`@dashwire/sdk`](https://www.npmjs.com/package/@dashwire/sdk). It builds the same dashboard structure from the capabilities you register, registers the project over HTTP (`POST /api/projects/:id/register`), and keeps a realtime Socket.IO connection to the server's `/sdk` namespace for state updates, commands, actions, and logs.

The connection runs on background threads, so it works in plain scripts, workers, and web apps alike. Handlers are called from the socket thread.

## Installation

Requires Python 3.9 or newer.

```bash
pip install dashwire
```

From a local checkout:

```bash
pip install -e packages/python-sdk
```

## Usage

```python
import os
from dashwire import Dashboard

dashboard = Dashboard(
    id="warehouse-worker",
    name="Warehouse Worker",
    server_url=os.environ.get("DASHWIRE_SERVER_URL"),
    token=os.environ.get("DASHWIRE_TOKEN"),
)

with dashboard.section("Runtime") as section:
    section.status("health", label="Health", value="Operational", tone="success")

    maintenance = section.toggle("maintenance", label="Maintenance mode", value=False)

    @maintenance.on_change
    def on_maintenance(enabled: bool) -> None:
        print("Maintenance mode:", enabled)

    terminal = section.terminal("logs", label="Logs")

dashboard.connect()
terminal.log.info("Service started")
dashboard.wait()  # or dashboard.run_forever() instead of connect() + wait()
```

`connect()` blocks until the project is registered, retrying with exponential backoff (max. 30s) while the server is unreachable. Once connected, the Socket.IO client reconnects automatically and re-sends the current state after every reconnect.

`Dashboard` can also be used as a context manager: `with Dashboard(...) as dashboard:` connects on enter and disconnects on exit.

A complete example lives in [`examples/basic.py`](examples/basic.py).

## Capabilities

Register capabilities inside a section with `with dashboard.section(name) as section:`. All options are keyword arguments.

| Method | Purpose | Handler |
| --- | --- | --- |
| `toggle(key, label, value)` | Boolean control | `on_change(value: bool)` |
| `color(key, label, value)` | Color value control | `on_change(value: str)` |
| `number(key, label, value, min, max, step, unit, writable)` | Numeric value; writable when a handler is given | `on_change(value)` |
| `slider(key, label, value, min, max, step)` | Bounded numeric slider | `on_change(value)` |
| `select(key, label, value, options)` | Select control; options are `{"label", "value"}` dicts or plain strings | `on_change(value: str)` |
| `action(key, label, confirm)` | Trigger an operation | `on_execute()` |
| `status(key, label, value, tone)` | Read-only status value | — |
| `terminal(key, label, writable)` | Log output and optional commands | `on_command(command: str)` |

Every method returns a handle:

- `handle.value` – current value
- `handle.set_value(value)` – update locally and push to the dashboard
- `@handle.on_change` – register a handler as a decorator (alternative to the keyword argument)
- `terminal.log.debug/info/warn/error(message, metadata=None)` – publish a log line

Other `Dashboard` methods: `get_structure()`, `subscribe(listener)`, `emit_log(level, message, source, metadata)`, `is_connected()`, `disconnect()`.

## Configuration

| Argument | Environment fallback | Default |
| --- | --- | --- |
| `server_url` | `DASHWIRE_SERVER_URL` | `http://localhost:4000` |
| `token` | `DASHWIRE_TOKEN`, `DASHWIRE_SERVER_TOKEN`, `SERVER_JWT` | none |

Tokens are created on the server's `/security` page. Do not commit production tokens to source control.

Log output uses the standard `logging` module under the `dashwire` logger.

## Development

```bash
cd packages/python-sdk
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

The package also has a `package.json`, so the same tasks run through pnpm from the monorepo:

```bash
pnpm --filter @dashwire/python-sdk test      # run the tests
pnpm --filter @dashwire/python-sdk dist      # build and check the wheel + sdist
```

## Releasing

The version lives in `package.json`, just like the npm packages in this repo. `pyproject.toml` reads it from there and `dashwire.__version__` reports the installed version.

To release, bump `"version"` in `package.json` and push to `main`. The [publish workflow](../../.github/workflows/publish-python-sdk.yml) sees that the version is not on PyPI yet, then tests, builds, publishes and tags it as `python-sdk-v<version>`.

## Repository

This package is maintained in the [Dashwire monorepo](https://github.com/meesakveld/dashwire/tree/main/packages/python-sdk).

## License

Licensed under the [ISC License](https://github.com/meesakveld/dashwire/blob/main/LICENSE).
