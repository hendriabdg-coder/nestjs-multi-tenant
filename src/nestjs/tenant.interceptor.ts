import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import type { TenantAwareRequest } from '../types';

/**
 * Establishes the AsyncLocalStorage tenant context for the lifetime of a
 * single request, so every downstream service/Prisma call can read it back
 * via {@link TenantContextService}.
 *
 * Deliberately an interceptor, not middleware: interceptors run *after*
 * guards, and `request.user` is only populated once the auth guard's JWT
 * strategy has run. Middleware executes before guards, so `request.user`
 * wouldn't exist yet — see ARCHITECTURE.md for the full ordering rationale.
 *
 * Requests with no `tenantId` (e.g. public/unauthenticated routes) pass
 * through untouched; the Prisma extension surfaces a clear error only if
 * tenant-scoped code is actually reached without a context.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      this.tenantContext.run(tenantId, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
