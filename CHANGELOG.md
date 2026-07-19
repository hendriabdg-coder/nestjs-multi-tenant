# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-20

Initial release.

### Added

- **`/prisma` — `tenantScoped()`**: a Prisma Client Extension that injects
  `tenantId` into every query for every model, unless exempted:
  - into `where` for reads, `update`, `delete`, `updateMany`, `deleteMany`,
    and `upsert`;
  - into `data` for `create` and `createMany`.
  - Framework-agnostic — driven only by a
    `getTenantId(): string | undefined` callback.
- **`scopeArgsForOperation()`**: the pure argument-rewriting function the
  extension is built on, exported for direct unit testing.
- **`MissingTenantContextError`**: thrown when a scoped query runs with no
  tenant context resolved, so an unscoped query fails loudly instead of
  silently returning all rows.
- **`/nestjs` integration layer**:
  - `TenantModule.forRoot(options?)` — wires up context and, by default, the
    global interceptor.
  - `TenantContextService` — `AsyncLocalStorage`-backed singleton with
    `run()`, `getTenantId()`, and `requireTenantId()`.
  - `TenantInterceptor` — binds `request.user.tenantId` into the async context
    for the lifetime of each request.
  - `TenantGuard` — throws `ForbiddenException` when `request.user.tenantId`
    is missing.
  - `@CurrentTenant()` — param decorator that reads `tenantId` from the request.
- Runnable `example/` NestJS app demonstrating end-to-end tenant isolation.
- Unit tests, ESLint + Prettier config, and CI on Node 18.x and 20.x.

[Unreleased]: https://github.com/hendriabdg-coder/nestjs-multi-tenant/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/hendriabdg-coder/nestjs-multi-tenant/releases/tag/v0.1.0
