import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { TenantAwareRequest } from '../types';

/**
 * Defense-in-depth guard for routes that must never execute without a resolved
 * tenant. Run it after your auth guard (e.g. `@UseGuards(JwtAuthGuard, TenantGuard)`)
 * on any route where a missing tenantId should hard-fail with 403 rather than
 * silently falling through to TenantScopedExtension's runtime error.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();

    if (!request.user?.tenantId) {
      throw new ForbiddenException('No tenant context found on the authenticated user.');
    }

    return true;
  }
}
