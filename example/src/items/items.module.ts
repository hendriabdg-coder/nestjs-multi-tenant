import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  controllers: [ItemsController],
  providers: [PrismaService, ItemsService],
})
export class ItemsModule {}
