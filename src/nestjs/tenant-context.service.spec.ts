import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(() => {
    service = new TenantContextService();
  });

  it('returns undefined when called outside run()', () => {
    expect(service.getTenantId()).toBeUndefined();
  });

  it('returns the bound tenantId inside run()', () => {
    const result = service.run('tenant-a', () => service.getTenantId());
    expect(result).toBe('tenant-a');
  });

  it('propagates through nested synchronous calls', () => {
    function deep() {
      return service.getTenantId();
    }
    const result = service.run('tenant-b', () => deep());
    expect(result).toBe('tenant-b');
  });

  it('propagates through async/await chains', async () => {
    const result = await service.run('tenant-c', async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 5));
      return service.getTenantId();
    });
    expect(result).toBe('tenant-c');
  });

  it('isolates concurrent requests from each other', async () => {
    const runFor = (tenantId: string, delayMs: number) =>
      service.run(tenantId, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return service.getTenantId();
      });

    const [first, second] = await Promise.all([runFor('tenant-fast', 5), runFor('tenant-slow', 20)]);

    expect(first).toBe('tenant-fast');
    expect(second).toBe('tenant-slow');
  });

  describe('requireTenantId', () => {
    it('returns the tenantId when context is active', () => {
      const result = service.run('tenant-d', () => service.requireTenantId());
      expect(result).toBe('tenant-d');
    });

    it('throws when called outside run()', () => {
      expect(() => service.requireTenantId()).toThrow(/No tenant context is active/);
    });
  });
});
