import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantScoped } from '@endrichtech/nestjs-multi-tenant/prisma';
import { TenantContextService } from '@endrichtech/nestjs-multi-tenant/nestjs';

function buildExtendedClient(tenantContext: TenantContextService) {
  return new PrismaClient().$extends(
    tenantScoped({
      getTenantId: () => tenantContext.getTenantId(),
    }),
  );
}

export type ExtendedPrismaClient = ReturnType<typeof buildExtendedClient>;

/**
 * Same role as CoffeeShopHub's real PrismaService (apps/api/src/prisma/prisma.service.ts):
 * a global, injectable wrapper around PrismaClient with connect/disconnect lifecycle hooks.
 * The only difference is `client` is the tenant-scoped extended client, not a bare PrismaClient —
 * every query issued through it is automatically filtered/stamped with the current tenantId.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: ExtendedPrismaClient;

  constructor(private readonly tenantContext: TenantContextService) {
    this.client = buildExtendedClient(tenantContext);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
