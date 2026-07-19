import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantModule } from '@endrichtech/nestjs-multi-tenant/nestjs';
import { ItemsModule } from './items/items.module';
import { FakeTenantAuthMiddleware } from './auth/fake-tenant-auth.middleware';

@Module({
  imports: [TenantModule.forRoot(), ItemsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Runs before guards/interceptors, populating req.user — same position
    // a real JWT auth guard would occupy. TenantInterceptor (registered by
    // TenantModule.forRoot()) picks up req.user.tenantId right after this.
    consumer.apply(FakeTenantAuthMiddleware).forRoutes('*');
  }
}
