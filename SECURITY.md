# Security Policy

## Why this matters here

This library enforces **row-level tenant isolation** — its whole job is to
make sure one tenant's queries can never read or mutate another tenant's data.
A bug that lets `tenantId` scoping be bypassed, skipped, or forged is therefore
a **security vulnerability**, not just a functional bug. Please treat it as one
and report it privately.

Examples of what counts as a security issue:

- An operation that reaches the database **without** the `tenantId` filter
  being applied (a read, `update`/`delete`, `updateMany`/`deleteMany`,
  `upsert`, or `create`/`createMany`).
- A way to make a scoped query run against a **different** tenant than the one
  in the current context.
- A missing-tenant-context situation that **silently returns/mutates all rows**
  instead of failing with `MissingTenantContextError`.

Note the documented, intentional non-goals in the README (this does not
authenticate anyone, does not validate that a tenant exists, and does not
protect `$queryRaw`). Reports about those are handled as normal issues/feature
requests, not security reports.

## Supported versions

This project is pre-1.0. Security fixes are applied to the **latest published
`0.x` release** only. Please make sure you can reproduce on the latest version
before reporting.

| Version | Supported          |
| ------- | ------------------ |
| `0.x` (latest) | :white_check_mark: |
| older `0.x`    | :x:                |

## Reporting a vulnerability

**Do not open a public GitHub issue for a security bug.**

Preferred: use GitHub's private reporting —
**Security → Report a vulnerability** on the repository
(<https://github.com/hendriabdg-coder/nestjs-multi-tenant/security/advisories/new>).

Alternatively, email **hendriabdg@gmail.com** with:

- a description of the isolation guarantee that breaks,
- a minimal reproduction (ideally against `example/`, or a failing test),
- affected version(s) and environment (Node, Prisma, NestJS versions).

## What to expect

- Acknowledgement of your report within **7 days**.
- An initial assessment (confirmed / needs-info / not-a-vuln) within **14 days**.
- For confirmed issues: a fix and a published patch release, followed by a
  public advisory crediting you (unless you prefer to stay anonymous).

Thank you for helping keep tenant data isolated.
