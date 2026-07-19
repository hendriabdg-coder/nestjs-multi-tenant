import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // No `where: { tenantId }` — TenantScopedExtension injects it, scoped to
  // whichever tenant TenantInterceptor bound for the current request.
  findAll() {
    return this.prisma.client.item.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // No tenantId in this payload either — the extension stamps it onto `data`
  // at runtime before the query reaches the database. Prisma's *generated
  // types* have no way to know that, though, so they still mark `tenantId`
  // as required on `ItemCreateInput` — this cast documents that gap rather
  // than papering over it with `any` everywhere.
  create(name: string, price: number) {
    const data = { name, price } as { name: string; price: number; tenantId: string };
    return this.prisma.client.item.create({ data });
  }
}
