import { Global, Module } from '@nestjs/common';
import { Config, loadConfig } from './app-config';

@Global()
@Module({
  providers: [{ provide: Config, useFactory: () => loadConfig() }],
  exports: [Config],
})
export class ConfigModule {}
