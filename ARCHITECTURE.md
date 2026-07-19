# Architecture

## The problem this solves

In a multi-tenant schema, every row belongs to a tenant, and every query must
be filtered (reads) or stamped (writes) with that tenant's id. That logic is
simple but repeats hundreds of times across a real codebase, and it fails
silently: a missing `where: { tenantId }` doesn't throw, it just returns (or
mutates) another tenant's data. There is no test that catches "you forgot
one" as a category — only one that happens to exercise that exact method with
two tenants' data present.

The fix is to make the filter structural: inject it once, at the Prisma
client boundary, so every query gets it whether or not the person writing the
service method remembered to.

## Why a Prisma Client Extension, not `$use` middleware

Prisma's older `$use` middleware API is deprecated as of Prisma 5 in favor of
[Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions).
Extensions are also strictly more capable here: `$allOperations` gives typed
access to `model`, `operation`, and `args` together, whereas `$use` middleware
has to pattern-match on `params.action` and `params.model` separately with
weaker typing.

## Why `AsyncLocalStorage`, not a request-scoped provider

NestJS has a built-in way to get per-request state: `@Injectable({ scope:
Scope.REQUEST })`. It was deliberately not used here. Request-scoped
providers force Nest to re-instantiate that provider's entire dependency
subtree on every single request — every controller, every service, every
provider that (transitively) depends on it. On a busy API this is a
measurable throughput cost, and it's a well-known enough footgun that it's
called out directly in [NestJS's own docs](https://docs.nestjs.com/fundamentals/injection-scopes#performance).

`TenantContextService` is a plain singleton. The per-request isolation comes
from `node:async_hooks`' `AsyncLocalStorage` instead: `.run(tenantId, fn)`
binds `tenantId` to everything reachable from `fn`'s async call graph —
awaited promises, nested service calls, the eventual Prisma query — without
re-instantiating anything. This is the same mechanism libraries like
`nestjs-cls` build on.

## Why the binding happens in an interceptor, not middleware

NestJS's request pipeline runs, in order: **middleware → guards → interceptors
(pre) → pipes → route handler → interceptors (post)**.

`request.user` doesn't exist until the auth guard's strategy
(`JwtAuthGuard` → `JwtStrategy.validate()` in a typical setup) has run and
attached it. Middleware runs *before* guards — so if `TenantContextService.run()`
were called from middleware, `request.user.tenantId` wouldn't be populated
yet, and there'd be nothing to bind.

Interceptors run *after* guards, so `TenantInterceptor` reads
`request.user.tenantId` at a point where it's guaranteed to be resolved (if
the request survived the guard at all), then wraps `next.handle()` — which is
what actually invokes the controller method and everything it calls — inside
`tenantContext.run()`:

```ts
return new Observable((subscriber) => {
  this.tenantContext.run(tenantId, () => {
    next.handle().subscribe(subscriber);
  });
});
```

Everything downstream of that `subscribe()` call — the controller method, the
service, the Prisma extension's `getTenantId()` callback — executes inside
the same async context, because Node's `AsyncLocalStorage` propagates through
promise chains and (as used here) through the synchronous `subscribe()` call
that kicks the observable's async work off.

Requests with no `request.user.tenantId` (public/unauthenticated routes) skip
the wrapping entirely and pass through unscoped — the Prisma extension is
what enforces that unscoped tenant-model queries fail loudly
(`MissingTenantContextError`) rather than silently returning everything.

## Why `/prisma` has zero dependency on `@nestjs/*`

`tenantScoped()` takes a plain `getTenantId: () => string | undefined`
callback and nothing else. It doesn't import `@nestjs/common`, doesn't know
what an `ExecutionContext` is, and works identically in a plain Node script,
a different framework, or a test file that just does
`{ getTenantId: () => 'tenant-a' }`. The NestJS pieces
(`TenantContextService`, `TenantInterceptor`, etc.) are one *implementation*
of "resolve the current tenant id" — not the only possible one — which is why
the package ships them as a separate `/nestjs` subpath instead of coupling
the two.

## Why `scopeArgsForOperation` is a separate exported function

The actual Prisma extension (`tenantScoped()`) can only be meaningfully
exercised against a real `PrismaClient` + generated schema, which is
integration-test territory. The argument-rewriting logic itself — "given this
operation name and these args, where does `tenantId` go" — has no such
dependency, so it's factored out as a pure function and unit tested directly
(see `src/prisma/tenant-scoped-extension.spec.ts`). This is the same reason
`extractCurrentTenant` is exported separately from the `@CurrentTenant()`
decorator it backs: `createParamDecorator`'s return value isn't callable, but
the factory function passed into it is.
