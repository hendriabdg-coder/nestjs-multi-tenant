import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { TenantInterceptor } from './tenant.interceptor';

export interface TenantModuleOptions {
  /**
   * Auto-register {@link TenantInterceptor} as a global `APP_INTERCEPTOR`.
   * Defaults to `true`. Set to `false` to apply it manually (e.g. only to
   * specific controllers via `@UseInterceptors(TenantInterceptor)`).
   */
  registerGlobalInterceptor?: boolean;
}

/**
 * `TenantModule.forRoot()` wires up {@link TenantContextService} (and, by
 * default, the global {@link TenantInterceptor}) once at the application
 * root. Marked `@Global()` so any feature module can inject
 * `TenantContextService` without re-importing it.
 */
@Global()
@Module({})
export class TenantModule {
  static forRoot(options: TenantModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [TenantContextService];

    if (options.registerGlobalInterceptor !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: TenantInterceptor,
      });
    }

    return {
      module: TenantModule,
      providers,
      exports: [TenantContextService],
    };
  }
}
