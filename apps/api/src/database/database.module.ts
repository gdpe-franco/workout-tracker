import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common'
import { Pool } from 'pg'
import { APP_ENV, type AppEnv } from '../config/env'

export const PG_POOL = Symbol('PG_POOL')

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async ping(timeoutMs = 3000): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.pool.query('select 1'),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Database probe timed out')), timeoutMs)
        }),
      ])
      return true
    } catch {
      return false
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end().catch(() => undefined)
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (env: AppEnv) =>
        new Pool({
          connectionString: env.databaseUrl,
          max: 5,
          connectionTimeoutMillis: 2000,
          idleTimeoutMillis: 30000,
        }),
      inject: [APP_ENV],
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
