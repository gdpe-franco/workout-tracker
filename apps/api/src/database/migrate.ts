import 'reflect-metadata'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { parseEnv } from '../config/env'

async function main(): Promise<void> {
  const env = parseEnv(process.env)
  const pool = new Pool({ connectionString: env.databaseUrl })

  try {
    await migrate(drizzle(pool), { migrationsFolder: join(__dirname, '../../drizzle') })
    console.log('Database migrations applied.')
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
