import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('allows the request through when tenantId is present', () => {
    const context = makeContext({ id: 'u1', tenantId: 'tenant-1' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when user is missing', () => {
    const context = makeContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when tenantId is missing', () => {
    const context = makeContext({ id: 'u1' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
