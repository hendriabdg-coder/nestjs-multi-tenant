import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantAwareRequest } from '../types';

/**
 * Exported separately from the decorator itself so it's directly unit
 * testable — `createParamDecorator`'s return value can't be invoked as a
 * plain function.
 */
export function extractCurrentTenant(
  _data: unknown,
  context: ExecutionContext,
): string | undefined {
  const request = context.switchToHttp().getRequest<TenantAwareRequest>();
  return request.user?.tenantId;
}

/**
 * Controller param decorator that pulls the current tenant id straight off
 * the request, e.g. `findAll(@CurrentTenant() tenantId: string)` instead of
 * `findAll(@Request() req: any) { req.user.tenantId }`.
 */
export const CurrentTenant = createParamDecorator(extractCurrentTenant);
