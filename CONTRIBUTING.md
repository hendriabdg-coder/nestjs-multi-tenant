# Contributing

## Setup

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

## Project layout

- `src/prisma/` — the Prisma Client Extension. No `@nestjs/*` imports allowed here.
- `src/nestjs/` — the NestJS integration layer (context service, interceptor, guard, decorator, module).
- `example/` — a runnable NestJS app that consumes the package via the pnpm workspace (`workspace:*`), for manual/end-to-end verification.

## Before opening a PR

- Add or update tests for any behavior change — `pnpm test:cov` should stay green.
- Run `pnpm lint` and `pnpm build` locally; CI runs both on Node 18.x and 20.x.
- If you change anything in `src/nestjs/`, sanity-check it against `example/` (`pnpm --filter example-app start:dev`).
- Keep `src/prisma/` free of any `@nestjs/*` import — that boundary is intentional (see `ARCHITECTURE.md`).

## Commit style

Short, imperative subject lines (`Add TenantGuard`, `Fix createMany scoping`) are preferred over long prose commits.
