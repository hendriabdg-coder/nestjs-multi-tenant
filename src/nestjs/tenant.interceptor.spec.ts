import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantContextService } from './tenant-context.service';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(returnValue: () => unknown): CallHandler {
  return {
    handle: () => of(returnValue()),
  };
}

describe('TenantInterceptor', () => {
  let tenantContext: TenantContextService;
  let interceptor: TenantInterceptor;

  beforeEach(() => {
    tenantContext = new TenantContextService();
    interceptor = new TenantInterceptor(tenantContext);
  });

  it('runs the handler inside the tenant context when tenantId is present', async () => {
    const context = makeContext({ id: 'u1', tenantId: 'tenant-1' });
    const handler = makeHandler(() => tenantContext.getTenantId());

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toBe('tenant-1');
  });

  it('passes requests through untouched when there is no tenantId', async () => {
    const context = makeContext(undefined);
    const handler = makeHandler(() => 'unscoped-result');

    const result = await lastValueFrom(interceptor.intercept(context, handler));

    expect(result).toBe('unscoped-result');
    expect(tenantContext.getTenantId()).toBeUndefined();
  });

  it('isolates context between two requests handled concurrently', async () => {
    const contextA = makeContext({ tenantId: 'tenant-a' });
    const contextB = makeContext({ tenantId: 'tenant-b' });

    const handlerA = makeHandler(() => tenantContext.getTenantId());
    const handlerB = makeHandler(() => tenantContext.getTenantId());

    const [resultA, resultB] = await Promise.all([
      lastValueFrom(interceptor.intercept(contextA, handlerA)),
      lastValueFrom(interceptor.intercept(contextB, handlerB)),
    ]);

    expect(resultA).toBe('tenant-a');
    expect(resultB).toBe('tenant-b');
  });
});
