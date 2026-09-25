<div align="center">

<img src="./.github/assets/logo.svg" style="max-width: 12rem" />

<hr /><br />

**Connect your projects to a realtime control plane.**

Dashwire is a TypeScript platform and SDK ecosystem for exposing project capabilities through a central dashboard.

<br />

[Installation](#installation) · [Usage](#usage) · [Packages](#npm-packages) · [Contributing](#contributing)

</div>

---

## What is Dashwire?

Dashwire gives applications a consistent way to connect their capabilities, state, actions, and logs to a central realtime dashboard. The repository contains the shared domain model, client SDK, React UI components, self-hosted server, and project generator that make up the platform.

The project is designed for teams that need an operational view across connected applications without building a custom dashboard and realtime integration for every project.

---

## NPM Packages

The following packages are published under the `@dashwire` scope:

| Package | Description | Downloads |
| --- | --- | --- |
| [`@dashwire/core`](https://www.npmjs.com/package/@dashwire/core) | Shared capability, event, and log definitions | [![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Fcore)](https://www.npmjs.com/package/@dashwire/core) |
| [`@dashwire/sdk`](https://www.npmjs.com/package/@dashwire/sdk) | SDK for connecting projects to Dashwire | [![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Fsdk)](https://www.npmjs.com/package/@dashwire/sdk) |
| [`@dashwire/react-ui`](https://www.npmjs.com/package/@dashwire/react-ui) | React dashboard and capability controls | [![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Freact-ui)](https://www.npmjs.com/package/@dashwire/react-ui) |
| [`@dashwire/server`](https://www.npmjs.com/package/@dashwire/server) | Server, realtime transport, persistence, and dashboard | [![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Fserver)](https://www.npmjs.com/package/@dashwire/server) |

The packages are versioned independently and are currently in the `0.x` development phase.

## CLI

The repository includes `create-dashwire`, a starter-project generator for creating a local Dashwire setup. It is currently available from the repository and is not published as an npm package.

```bash
node cli/create-dashwire/bin.js
```

The generated project includes a starter server configuration, environment file, and Docker Compose configuration.

---

## Why Dashwire?

Dashwire centralizes the integration between connected projects and operational tooling. Instead of implementing project-specific controls, status reporting, logs, and realtime communication repeatedly, applications can expose them through a shared platform model.

---

## Features

- Shared capability and event model
- Realtime communication between projects and dashboard clients
- Project state synchronization and status visibility
- Logs and operational events in one dashboard
- React components for common dashboard controls
- Self-hosted server deployment
- SQLite-backed persistence for a lightweight starting point
- TypeScript packages with generated type declarations
- Monorepo development through pnpm workspaces and Turborepo

---

## Installation

### Run the repository locally

#### Prerequisites

- Node.js 18 or newer
- pnpm 9.9.0 or newer

Install dependencies from the repository root:

```bash
pnpm install
```

Run the workspace development tasks:

```bash
pnpm dev
```

Build all packages:

```bash
pnpm build
```

The server can also be developed independently:

```bash
pnpm --filter @dashwire/server dev
```

---

## Usage

The typical Dashwire setup consists of three parts:

1. A project uses `@dashwire/sdk` to connect to a Dashwire server.
2. The project exposes capabilities, state, actions, or logs through the shared model.
3. A dashboard uses the server and `@dashwire/react-ui` to observe and control connected projects.

The exact capability definitions depend on the project being integrated. The package source directories contain the current public APIs and examples of the supported building blocks.

---

## Configuration

Dashwire is intended to be configured per deployment. The starter template provides the baseline environment configuration, including the server port, database location, and authentication secret.

For local development, the server uses port `4000` by default. Deployment-specific values should be supplied through environment variables rather than committed to the repository.

---

## Repository Structure

```text
packages/
	core/       Shared platform model
	sdk/        Client SDK for connected projects
	react-ui/   React dashboard components
	server/     Server, dashboard, and persistence
cli/
	create-dashwire/  Starter-project generator
```

---

## Contributing

1. Install dependencies with `pnpm install`.
2. Make a focused change in the relevant package.
3. Run the relevant package build and root checks.
4. Open a pull request describing the change and its impact on public APIs.

Public SDK contracts and realtime protocol changes should be discussed before implementation.

---

## Project Status

Dashwire is under active development. Package APIs and server contracts may change while the platform matures.

---

## License

Dashwire is licensed under the [ISC License](LICENSE).