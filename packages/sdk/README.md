<div align="center">

<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;">
  <img src="https://raw.githubusercontent.com/meesakveld/dashwire/2bb06e4446699756ca43480a8787b6abd090b8b9/.github/assets/logo.svg" style="max-width: 12rem" />
  <p style="margin:0;font-size:22;font-weight:700">/ SDK</p>
</div>

<hr /><br />

[![npm version](https://img.shields.io/npm/v/%40dashwire%2Fsdk)](https://www.npmjs.com/package/@dashwire/sdk)
[![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Fsdk)](https://www.npmjs.com/package/@dashwire/sdk)
[![license](https://img.shields.io/npm/l/%40dashwire%2Fsdk)](https://github.com/meesakveld/dashwire/blob/main/LICENSE)

**Connect a project to a Dashwire control plane.**

Register capabilities, synchronize state, receive commands, and publish logs through a typed TypeScript SDK.

[Installation](#installation) · [Usage](#usage) · [Capabilities](#capabilities) · [Repository](#repository)

</div>

---

## Overview

`@dashwire/sdk` connects an application to a [Dashwire server](https://www.npmjs.com/package/@dashwire/server). It builds a dashboard structure from the capabilities you register, registers the project over HTTP, and maintains a realtime Socket.IO connection for state updates, commands, actions, and logs.

The SDK is intended to run inside the project being monitored or controlled. It works with `@dashwire/core` for shared types and uses `socket.io-client` for transport.

## Installation

```bash
npm install @dashwire/sdk
```

```bash
pnpm add @dashwire/sdk
```

## Usage

```ts
import { Dashboard } from "@dashwire/sdk";

const dashboard = new Dashboard({
  id: "warehouse-api",
  name: "Warehouse API",
  server: {
    url: process.env.DASHWIRE_SERVER_URL,
    token: process.env.DASHWIRE_SERVER_TOKEN
  }
});

let terminal;

dashboard.section("Runtime", (section) => {
	section.status("health", {
		label: "Health",
		value: "Operational",
		tone: "success",
	});

	section.toggle("maintenance", {
		label: "Maintenance mode",
		value: false,
		onChange: (enabled) => {
			console.log("Maintenance mode:", enabled);
		},
	});

	terminal = section.terminal("logs", { label: "Logs" });
});

terminal.log.info("Service started");

await dashboard.connect();
```

`connect()` registers the project and keeps trying with backoff until the server is reachable. The underlying Socket.IO client also reconnects when an established connection is interrupted.

## Capabilities

Register capabilities inside a named section with the `Dashboard` section builder:

| Method | Purpose |
| --- | --- |
| `toggle` | Boolean control with an optional change handler |
| `color` | Color value control |
| `number` | Numeric value with optional bounds, step, and unit |
| `slider` | Bounded numeric slider |
| `select` | Select control with labeled options |
| `action` | Trigger an operation, optionally with confirmation |
| `status` | Read-only status value |
| `terminal` | Log output and optional command handling |

Capability handles expose the current definition and can update their value with `setValue(value)`. The dashboard structure is available through `getStructure()`.

## Configuration

```ts
new Dashboard({
  id: "my-project",
  name: "My Project",
  server: {
    url: process.env.DASHWIRE_SERVER_URL,
    token: process.env.DASHWIRE_SERVER_TOKEN
  }
});
```

The server URL and token can also be provided through the nested `server` object or the SDK's supported environment-variable fallbacks. Do not commit production tokens to source control.

## Repository

This package is maintained in the [Dashwire monorepo](https://github.com/meesakveld/dashwire/tree/main/packages/sdk).

## License

Licensed under the [ISC License](https://github.com/meesakveld/dashwire/blob/main/LICENSE).
