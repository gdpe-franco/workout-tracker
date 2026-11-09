import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const schema = 'migration_probe'

describe('migration runner', () => {
  let pool: Pool
  let folder: string

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)

    folder = await mkdtemp(join(tmpdir(), 'workout-migrations-'))
    await mkdir(join(folder, 'meta'))
    await writeFile(
      join(folder, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'postgresql',
        entries: [
          {
            idx: 0,
            version: '7',
            when: 1700000000000,
            tag: '0000_probe',
            breakpoints: true,
          },
        ],
      }),
    )
    await writeFile(
      join(folder, '0000_probe.sql'),
      [
        `CREATE SCHEMA IF NOT EXISTS ${schema};`,
        `CREATE TABLE ${schema}.probe (id integer PRIMARY KEY);`,
      ].join('\n--> statement-breakpoint\n'),
    )
  })

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await pool.end()
    await rm(folder, { recursive: true, force: true })
  })

  it('applies a migration once and skips it on rerun', async () => {
    const db = drizzle(pool)
    const config = { migrationsFolder: folder, migrationsSchema: schema }

    await migrate(db, config)
    await migrate(db, config)

    const tables = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'probe'`,
      [schema],
    )
    expect(tables.rows[0]?.count).toBe(1)

    const applied = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ${schema}.__drizzle_migrations`,
    )
    expect(applied.rows[0]?.count).toBe(1)

    const inPublic = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'probe'`,
    )
    expect(inPublic.rows[0]?.count).toBe(0)
  })
})
