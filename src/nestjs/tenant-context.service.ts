import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

/**
 * Holds the current request's tenant id in an `AsyncLocalStorage` cell so it's
 * reachable from anywhere in the async call chain (services, Prisma
 * extensions) without threading it through every function signature.
 *
 * Deliberately NOT a Nest request-scoped provider: request scope forces Nest
 * to re-instantiate the entire provider graph for every request, which is a
 * well-documented performance cliff. A singleton backed by AsyncLocalStorage
 * gets the same per-request isolation without that cost — see ARCHITECTURE.md.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<string>();

  /** Runs `callback` with `tenantId` bound as the current context for its entire async chain. */
  run<T>(tenantId: string, callback: () => T): T {
    return this.storage.run(tenantId, callback);
  }

  /** Returns the current tenant id, or `undefined` if called outside `run()`. */
  getTenantId(): string | undefined {
    return this.storage.getStore();
  }

  /** Same as {@link getTenantId}, but throws instead of returning `undefined`. */
  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error(
        '[TenantContextService] No tenant context is active. ' +
          'This code path must run inside TenantContextService.run(), ' +
          'which TenantInterceptor sets up automatically for authenticated HTTP requests.',
      );
    }
    return tenantId;
  }
}
