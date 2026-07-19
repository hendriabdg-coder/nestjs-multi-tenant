# @endrichtech/nestjs-multi-tenant

[![CI](https://github.com/hendriabdg-coder/nestjs-multi-tenant/actions/workflows/ci.yml/badge.svg)](https://github.com/hendriabdg-coder/nestjs-multi-tenant/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@endrichtech/nestjs-multi-tenant.svg)](https://www.npmjs.com/package/@endrichtech/nestjs-multi-tenant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Row-level multi-tenant isolation for **NestJS + Prisma**, without repeating
`where: { tenantId }` in every service method.

```ts
// Before
findAll(tenantId: string) {
  return this.prisma.order.findMany({ where: { tenantId } });
}
create(tenantId: string, dto: CreateOrderDto) {
  return this.prisma.order.create({ data: { ...dto, tenantId } });
}

// After
findAll() {
  return this.prisma.client.order.findMany();
}
create(dto: CreateOrderDto) {
  return this.prisma.client.order.create({ data: dto });
}
```

## Why

Every model in a multi-tenant schema is scoped to a `tenantId`, and every
query has to filter (or stamp) it — that's correct, but it's also
easy to get wrong once: one forgotten `where: { tenantId }` in one service
method is a cross-tenant data leak. This library centralizes that filter into
a single Prisma Client Extension, so it's structurally impossible to forget.

It's two independent, composable pieces:

- **`@endrichtech/nestjs-multi-tenant/prisma`** — a [Prisma Client
  Extension](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
  that injects `tenantId` into every query's `where` (reads, `updateMany`,
  `deleteMany`, `update`, `delete`, `upsert`) or `data` (`create`,
  `createMany`) for every model, unless exempted. Framework-agnostic — it
  only needs a `getTenantId(): string | undefined` callback.
- **`@endrichtech/nestjs-multi-tenant/nestjs`** — the piece that resolves
  *which* tenant is "current" for that callback: an `AsyncLocalStorage`-backed
  `TenantContextService`, a `TenantInterceptor` that binds it from
  `request.user.tenantId` for the lifetime of each request, a `TenantGuard`
  for routes that must hard-fail without a tenant, and a `@CurrentTenant()`
  param decorator.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the reasoning behind the
AsyncLocalStorage choice and the interceptor-vs-middleware ordering.

## Install

```bash
pnpm add @endrichtech/nestjs-multi-tenant
```

`@nestjs/common`, `@nestjs/core`, `@prisma/client`, and `rxjs` are peer
dependencies — install whichever subpath you use.

## Quick start

**1. Register the NestJS module** at your app root:

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { TenantModule } from '@endrichtech/nestjs-multi-tenant/nestjs';

@Module({
  imports: [TenantModule.forRoot()],
})
export class AppModule {}
```

`forRoot()` registers `TenantContextService` (global) and, by default, a
global `TenantInterceptor` that reads `request.user.tenantId` — populated by
your existing auth guard — and binds it for the request's async lifetime.

**2. Extend your Prisma client:**

```ts
// prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantScoped } from '@endrichtech/nestjs-multi-tenant/prisma';
import { TenantContextService } from '@endrichtech/nestjs-multi-tenant/nestjs';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client;

  constructor(tenantContext: TenantContextService) {
    this.client = new PrismaClient().$extends(
      tenantScoped({
        getTenantId: () => tenantContext.getTenantId(),
        exemptModels: ['Tenant'], // whatever model has no tenantId column
      }),
    );
  }

  onModuleInit() {
    return this.client.$connect();
  }
  onModuleDestroy() {
    return this.client.$disconnect();
  }
}
```

**3. Write services with zero tenant plumbing:**

```ts
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.order.findMany(); // scoped automatically
  }
}
```

**4. Need the tenant id directly in a controller?**

```ts
import { CurrentTenant } from '@endrichtech/nestjs-multi-tenant/nestjs';

@Get()
findAll(@CurrentTenant() tenantId: string) {
  return { tenantId };
}
```

A full runnable app is in [`example/`](./example) — clone, `pnpm install`,
`pnpm start:dev`, and hit it with `curl` using different `x-tenant-id`
headers to see the isolation live.

## API reference

| Export | Subpath | What it does |
|---|---|---|
| `tenantScoped(options)` | `/prisma` | Prisma Client Extension factory. |
| `scopeArgsForOperation(...)` | `/prisma` | Pure function the extension is built on — exported for direct testing. |
| `MissingTenantContextError` | `/prisma` | Thrown when a scoped query runs with no tenant context resolved. |
| `TenantModule.forRoot(options?)` | `/nestjs` | Wires up context + (optionally) the global interceptor. |
| `TenantContextService` | `/nestjs` | `run()`, `getTenantId()`, `requireTenantId()`. |
| `TenantInterceptor` | `/nestjs` | Binds `request.user.tenantId` into the async context per request. |
| `TenantGuard` | `/nestjs` | Throws `ForbiddenException` if `request.user.tenantId` is missing. |
| `@CurrentTenant()` | `/nestjs` | Param decorator, pulls tenantId straight from the request. |

## What this library does *not* do

- It does not authenticate anyone — it trusts `request.user.tenantId`,
  which your own auth guard/strategy must populate.
- It does not validate that the tenant id actually exists — pair it with
  your own foreign key constraints / lookups if that matters.
- It is not a replacement for Postgres Row-Level Security if you need
  isolation that holds even against a raw `$queryRaw` or a bug in this
  library — this scopes the Prisma Client API surface, not the database
  connection itself.
- It does not change Prisma's *generated types* — `tenantId` still shows up
  as a required field on `create`/`createMany` input types, even though the
  extension fills it in at runtime. Callers of `.create()` need a small,
  documented cast (see `example/src/items/items.service.ts`) until/unless
  Prisma ships a supported way for extensions to reshape input types.

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

## License

MIT © [Hendri](https://github.com/hendriabdg-coder) / Endrich Tech
