import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHealthStore } from './health'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('health store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports readiness', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ status: 'ok', database: 'up' }))
    const store = useHealthStore()

    await store.check(fetcher as unknown as typeof fetch)

    expect(store.state).toBe('ok')
    expect(store.message).toBe('API and database are ready.')
  })

  it('reports an unavailable database', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ status: 'unavailable', database: 'down' }, 503),
    )
    const store = useHealthStore()

    await store.check(fetcher as unknown as typeof fetch)

    expect(store.state).toBe('error')
    expect(store.message).toContain('database is unavailable')
  })

  it('reports an unexpected response', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ hello: 'world' }))
    const store = useHealthStore()

    await store.check(fetcher as unknown as typeof fetch)

    expect(store.state).toBe('error')
    expect(store.message).toContain('unexpected response')
  })

  it('fails after the request timeout', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const store = useHealthStore()

    const pending = store.check(fetcher as unknown as typeof fetch, 5000)
    await vi.advanceTimersByTimeAsync(5000)
    await pending

    expect(store.state).toBe('error')
    expect(store.message).toContain('Could not reach the API')
  })
})
