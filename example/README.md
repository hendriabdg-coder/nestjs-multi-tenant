# example-app

A minimal NestJS API — one module, one controller, one service — that proves
the point of `@endrichtech/nestjs-multi-tenant`: **no controller, service, or
Prisma call in this example ever writes `tenantId` by hand.**

## Run it

From the **repo root** (this is a pnpm workspace member, not a standalone project):

```bash
pnpm install
cd example
pnpm prisma:generate
pnpm prisma:migrate
pnpm start:dev
```

The API listens on `http://localhost:3333`.

## Try tenant isolation

There's no login here — `FakeTenantAuthMiddleware` reads an `x-tenant-id`
header and populates `req.user` the same way a real JWT strategy would (see
`src/auth/fake-tenant-auth.middleware.ts`).

Create an item as **tenant A**:

```bash
curl -X POST http://localhost:3333/items \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-a" \
  -d '{"name":"Espresso","price":25000}'
```

List items as **tenant A** — you'll see it:

```bash
curl http://localhost:3333/items -H "x-tenant-id: tenant-a"
```

List items as **tenant B** — the same table, but empty, with zero query changes:

```bash
curl http://localhost:3333/items -H "x-tenant-id: tenant-b"
```

`ItemsService.findAll()` and `.create()` (`src/items/items.service.ts`) issue
plain `prisma.client.item.findMany()` / `.create()` calls — the tenant
filter/stamp happens inside the Prisma extension configured in
`src/prisma.service.ts`, invisible to application code.
