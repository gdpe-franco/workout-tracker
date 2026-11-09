import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { EnvModule } from './config/env.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [EnvModule, DatabaseModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
