import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Stand-in for a real JWT strategy (compare with CoffeeShopHub's
 * apps/api/src/auth/jwt.strategy.ts, which decodes a signed token instead).
 * Reads a plain `x-tenant-id` header so this example runs with zero auth
 * setup, but populates `req.user` in the exact shape a real
 * `JwtStrategy.validate()` would: `{ id, tenantId }`. That's the only
 * contract TenantInterceptor and TenantGuard actually care about.
 */
@Injectable()
export class FakeTenantAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.header('x-tenant-id');
    if (!tenantId) {
      throw new UnauthorizedException(
        'Missing x-tenant-id header (this example stands in for a real JWT — see the README).',
      );
    }
    (req as Request & { user?: { id: string; tenantId: string } }).user = {
      id: 'demo-user',
      tenantId,
    };
    next();
  }
}
