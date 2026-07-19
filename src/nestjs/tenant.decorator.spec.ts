import { ExecutionContext } from '@nestjs/common';
import { extractCurrentTenant } from './tenant.decorator';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('extractCurrentTenant', () => {
  it('returns the tenantId from request.user', () => {
    const context = makeContext({ id: 'u1', tenantId: 'tenant-1' });
    expect(extractCurrentTenant(undefined, context)).toBe('tenant-1');
  });

  it('returns undefined when there is no user', () => {
    const context = makeContext(undefined);
    expect(extractCurrentTenant(undefined, context)).toBeUndefined();
  });

  it('returns undefined when user has no tenantId', () => {
    const context = makeContext({ id: 'u1' });
    expect(extractCurrentTenant(undefined, context)).toBeUndefined();
  });
});
