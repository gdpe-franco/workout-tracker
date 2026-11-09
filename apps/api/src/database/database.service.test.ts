import type { Pool } from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DatabaseService } from './database.module'

function serviceWith(query: () => Promise<unknown>): DatabaseService {
  const pool = { query, end: async () => undefined } as unknown as Pool
  return new DatabaseService(pool)
}

describe('DatabaseService.ping', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when the probe succeeds', async () => {
    const service = serviceWith(async () => ({ rows: [] }))
    await expect(service.ping()).resolves.toBe(true)
  })

  it('returns false when the probe rejects', async () => {
    const service = serviceWith(async () => {
      throw new Error('connection refused')
    })
    await expect(service.ping()).resolves.toBe(false)
  })

  it('returns false within the probe timeout', async () => {
    vi.useFakeTimers()
    const service = serviceWith(() => new Promise(() => undefined))

    const result = service.ping(3000)
    await vi.advanceTimersByTimeAsync(3000)

    await expect(result).resolves.toBe(false)
  })
})
