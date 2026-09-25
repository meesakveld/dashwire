<div align="center">

<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;">
  <img src="https://raw.githubusercontent.com/meesakveld/dashwire/2bb06e4446699756ca43480a8787b6abd090b8b9/.github/assets/logo.svg" style="max-width: 12rem" />
  <p style="margin:0;font-size:22;font-weight:700">/ Core</p>
</div>

<hr /><br />

[![npm version](https://img.shields.io/npm/v/%40dashwire%2Fcore)](https://www.npmjs.com/package/@dashwire/core)
[![npm downloads](https://img.shields.io/npm/dm/%40dashwire%2Fcore)](https://www.npmjs.com/package/@dashwire/core)
[![license](https://img.shields.io/npm/l/%40dashwire%2Fcore)](https://github.com/meesakveld/dashwire/blob/main/LICENSE)

**Shared types and utilities for the Dashwire platform.**

Standardize capabilities, dashboard structure, state, events, and logs across connected projects.

[Installation](#installation) · [Usage](#usage) · [API](#api) · [Repository](#repository)

</div>

---

## Overview

`@dashwire/core` is the shared, dependency-light domain package for Dashwire. Use it when an SDK, server, dashboard, or integration needs to exchange the same capability definitions and realtime event payloads.

The package contains TypeScript types and small helpers for:

- Toggle, color, number, slider, select, action, status, and logs capabilities
- Dashboard sections and project structures
- Capability state derived from a dashboard structure
- SDK and dashboard Socket.IO event contracts
- Structured log entries and log levels

## Installation

```bash
npm install @dashwire/core
```

```bash
pnpm add @dashwire/core
```

## API

The package exports the public definitions from:

- `capabilities`: capability types, dashboard structures, `slugify`, `buildPath`, and `stateFromStructure`
- `events`: typed SDK, server, and dashboard event payloads
- `logs`: `LogEntry` and `LogLevel`

The generated declarations are included in the published package, so the same contracts are available to TypeScript consumers and package integrations.

## Repository

This package is maintained in the [Dashwire monorepo](https://github.com/meesakveld/dashwire/tree/main/packages/core).

## License

Licensed under the [ISC License](https://github.com/meesakveld/dashwire/blob/main/LICENSE).
