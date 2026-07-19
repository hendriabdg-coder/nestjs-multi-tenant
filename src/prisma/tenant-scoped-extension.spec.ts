import { scopeArgsForOperation, MissingTenantContextError } from './tenant-scoped-extension';

describe('scopeArgsForOperation', () => {
  const field = 'tenantId';
  const tenantId = 'tenant-123';

  it.each(['findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'findMany', 'count'])(
    'merges tenantId into where for %s',
    (operation) => {
      const result = scopeArgsForOperation(
        operation,
        { where: { isActive: true } },
        field,
        tenantId,
      );
      expect(result).toEqual({ where: { isActive: true, tenantId } });
    },
  );

  it('adds a where clause when none was passed', () => {
    const result = scopeArgsForOperation('findMany', undefined, field, tenantId);
    expect(result).toEqual({ where: { tenantId } });
  });

  it.each(['updateMany', 'deleteMany', 'update', 'delete', 'upsert'])(
    'merges tenantId into where for %s',
    (operation) => {
      const result = scopeArgsForOperation(
        operation,
        { where: { id: 'abc' }, data: { name: 'x' } },
        field,
        tenantId,
      );
      expect(result).toEqual({ where: { id: 'abc', tenantId }, data: { name: 'x' } });
    },
  );

  it('injects tenantId into data for create', () => {
    const result = scopeArgsForOperation('create', { data: { name: 'Espresso' } }, field, tenantId);
    expect(result).toEqual({ data: { name: 'Espresso', tenantId } });
  });

  it('injects tenantId into every row for createMany', () => {
    const result = scopeArgsForOperation(
      'createMany',
      { data: [{ name: 'Espresso' }, { name: 'Latte' }] },
      field,
      tenantId,
    );
    expect(result).toEqual({
      data: [
        { name: 'Espresso', tenantId },
        { name: 'Latte', tenantId },
      ],
    });
  });

  it('leaves createMany args untouched if data is not an array', () => {
    const args = { data: undefined };
    const result = scopeArgsForOperation('createMany', args, field, tenantId);
    expect(result).toBe(args);
  });

  it('does not exist as a no-op passthrough for unrecognized operations', () => {
    const args = { foo: 'bar' };
    const result = scopeArgsForOperation('$queryRaw', args, field, tenantId);
    expect(result).toEqual(args);
  });

  it('respects a custom tenant field name', () => {
    const result = scopeArgsForOperation('findMany', {}, 'orgId', tenantId);
    expect(result).toEqual({ where: { orgId: tenantId } });
  });
});

describe('MissingTenantContextError', () => {
  it('names the offending model and operation', () => {
    const error = new MissingTenantContextError('Order', 'findMany');
    expect(error.name).toBe('MissingTenantContextError');
    expect(error.message).toContain('Order.findMany');
    expect(error.message).toContain('TenantContextService.run()');
  });
});
