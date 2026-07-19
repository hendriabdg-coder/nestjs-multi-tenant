// A shareable Prisma Client Extension must not import from '@prisma/client'
// directly — that subpath only resolves after `prisma generate` has run
// against a real schema, which this library (intentionally) has none of.
// '@prisma/client/extension' is Prisma's dedicated entry point for authoring
// extensions independent of any generated client — see:
// https://www.prisma.io/docs/orm/prisma-client/client-extensions/shared-extensions
import { Prisma } from '@prisma/client/extension';

export interface TenantScopedExtensionOptions {
  /**
   * Called on every query to resolve the tenant id for the current execution
   * context. Typically `() => tenantContextService.getTenantId()` when paired
   * with the NestJS integration (`@endrichtech/nestjs-multi-tenant/nestjs`),
   * but deliberately has no dependency on it — plug in anything (a plain
   * module-level variable, `AsyncLocalStorage`, CLS, etc).
   */
  getTenantId: () => string | undefined;
  /** Column that stores the tenant id. Defaults to `tenantId`. */
  tenantField?: string;
  /**
   * Restrict scoping to these Prisma model names only. When omitted, every
   * model is scoped except those listed in `exemptModels`.
   */
  models?: string[];
  /**
   * Model names to always leave unscoped (e.g. `Tenant` itself, or global
   * lookup tables that intentionally have no `tenantId` column).
   */
  exemptModels?: string[];
}

const READ_AND_FILTER_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
  'update',
  'delete',
  'upsert',
]);

const CREATE_OPERATIONS = new Set(['create']);
const CREATE_MANY_OPERATIONS = new Set(['createMany']);

/**
 * Pure, dependency-free transform: given a Prisma query's `operation` name and
 * `args`, returns new args with the tenant id injected into `where` (for reads
 * and filtered writes) or `data` (for creates). Exported separately from
 * {@link tenantScoped} so it can be unit tested without a real Prisma client.
 */
export function scopeArgsForOperation(
  operation: string,
  args: Record<string, unknown> | undefined,
  tenantField: string,
  tenantId: string,
): Record<string, unknown> {
  const safeArgs = args ?? {};

  if (READ_AND_FILTER_OPERATIONS.has(operation)) {
    const where = (safeArgs.where as Record<string, unknown> | undefined) ?? {};
    return { ...safeArgs, where: { ...where, [tenantField]: tenantId } };
  }

  if (CREATE_OPERATIONS.has(operation)) {
    const data = (safeArgs.data as Record<string, unknown> | undefined) ?? {};
    return { ...safeArgs, data: { ...data, [tenantField]: tenantId } };
  }

  if (CREATE_MANY_OPERATIONS.has(operation)) {
    const data = safeArgs.data;
    if (!Array.isArray(data)) return safeArgs;
    return {
      ...safeArgs,
      data: data.map((row: Record<string, unknown>) => ({ ...row, [tenantField]: tenantId })),
    };
  }

  return safeArgs;
}

export class MissingTenantContextError extends Error {
  constructor(model: string, operation: string) {
    super(
      `[tenant-scoped] No tenant context available for ${model}.${operation}. ` +
        'Make sure this query runs inside TenantContextService.run() ' +
        '(the NestJS TenantInterceptor does this automatically for authenticated requests), ' +
        'or pass a getTenantId() that always resolves to a value.',
    );
    this.name = 'MissingTenantContextError';
  }
}

/**
 * Prisma Client Extension that auto-injects the current tenant id into every
 * query for every model (unless exempted), so callers never have to write
 * `where: { tenantId }` / `data: { tenantId }` by hand.
 *
 * @example
 * ```ts
 * const prisma = new PrismaClient().$extends(
 *   tenantScoped({ getTenantId: () => tenantContext.getTenantId() }),
 * );
 * // now this is automatically scoped to the current tenant:
 * await prisma.order.findMany();
 * ```
 */
export function tenantScoped(options: TenantScopedExtensionOptions) {
  const tenantField = options.tenantField ?? 'tenantId';
  const exemptModels = new Set(options.exemptModels ?? []);
  const allowedModels = options.models ? new Set(options.models) : undefined;

  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'tenant-scoped',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (exemptModels.has(model)) return query(args);
            if (allowedModels && !allowedModels.has(model)) return query(args);

            const tenantId = options.getTenantId();
            if (!tenantId) {
              throw new MissingTenantContextError(model, operation);
            }

            const scopedArgs = scopeArgsForOperation(operation, args, tenantField, tenantId);
            // scopeArgsForOperation is intentionally typed against a plain
            // Record (see its own doc comment) so it stays unit-testable
            // without Prisma's generated JsArgs types; cast back here at the
            // one call site that actually needs to satisfy them.
            return query(scopedArgs as typeof args);
          },
        },
      },
    }),
  );
}
