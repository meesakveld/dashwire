<div align="center">

<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;">
  <img src="https://raw.githubusercontent.com/meesakveld/dashwire/2bb06e4446699756ca43480a8787b6abd090b8b9/.github/assets/logo.svg" style="max-width: 12rem" />
  <p style="margin:0;font-size:22;font-weight:700">/ React-UI</p>
</div>

<hr /><br />

[![npm version](https://img.shields.io/npm/v/%40dashwire%2Freact-ui)](https://www.npmjs.com/package/@dashwire/react-ui)
[![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Freact-ui)](https://www.npmjs.com/package/@dashwire/react-ui)
[![license](https://img.shields.io/npm/l/%40dashwire%2Freact-ui)](https://github.com/meesakveld/dashwire/blob/main/LICENSE)

**React components for rendering Dashwire capabilities.**

Build a dashboard view for project state, controls, actions, status, and logs.

[Installation](#installation) · [Usage](#usage) · [Components](#components) · [Repository](#repository)

</div>

---

## Overview

`@dashwire/react-ui` provides the React presentation layer for Dashwire. It renders a `DashboardStructure` and connects controls to either an SDK `Dashboard` instance or callbacks supplied by the host application.

The package supports React 18 and React 19 and includes the stylesheet used by the components.

## Installation

```bash
npm install @dashwire/react-ui @dashwire/core react
```

```bash
pnpm add @dashwire/react-ui @dashwire/core react
```

Import the package stylesheet once in your application:

```ts
import "@dashwire/react-ui/react-ui.css";
```

## Usage

### Render an SDK dashboard

```tsx
import { Dashboard } from "@dashwire/react-ui";
import "@dashwire/react-ui/react-ui.css";

export function ProjectDashboard({ dashboard }) {
	return <Dashboard dashboard={dashboard} />;
}
```

The `dashboard` prop accepts the live dashboard source exposed by `@dashwire/sdk`, including structure subscriptions and command handling.

### Render from explicit data

```tsx
import { Dashboard } from "@dashwire/react-ui";
import type { DashboardStructure } from "@dashwire/core";

export function ProjectView({ structure, state, logs }) {
	return (
		<Dashboard
			structure={structure as DashboardStructure}
			state={state}
			logs={logs}
			status="online"
			onCommand={(path, value) => console.log(path, value)}
			onExecute={(path) => console.log("Execute", path)}
		/>
	);
}
```

## Components

The package exports:

- `Dashboard` for project-level structure, state, status, and log rendering
- `CapabilityRenderer` for selecting a control from a capability definition
- `ToggleControl`, `ColorControl`, `NumberControl`, `SliderControl`, and `SelectControl`
- `ActionControl` and `StatusControl`
- `TerminalControl` for terminal and log capabilities

The controls use the capability definitions from `@dashwire/core`, so applications can keep their domain model and UI contract aligned.

## Props

`Dashboard` supports either a live `dashboard` source or explicit data:

| Prop | Purpose |
| --- | --- |
| `dashboard` | Live source with structure, subscriptions, and command application |
| `structure` | Static `DashboardStructure` to render |
| `state` | Current values keyed by capability path |
| `status` | `online` or `offline` display state |
| `logs` | Log entries for log capabilities |
| `onCommand` | Callback for writable capability changes |
| `onExecute` | Callback for action execution |

## Repository

This package is maintained in the [Dashwire monorepo](https://github.com/meesakveld/dashwire/tree/main/packages/react-ui).

## License

Licensed under the [ISC License](https://github.com/meesakveld/dashwire/blob/main/LICENSE).
