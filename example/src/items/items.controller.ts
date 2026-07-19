import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentTenant } from '@endrichtech/nestjs-multi-tenant/nestjs';
import { ItemsService } from './items.service';

interface CreateItemBody {
  name: string;
  price: number;
}

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll(@CurrentTenant() tenantId: string | undefined) {
    // tenantId is only read here for the response payload, to make the demo
    // visible over curl — ItemsService.findAll() never touches it.
    const items = await this.itemsService.findAll();
    return { tenantId, count: items.length, items };
  }

  @Post()
  create(@Body() body: CreateItemBody) {
    return this.itemsService.create(body.name, body.price);
  }
}
