import { defineStore } from 'pinia'
import { ref } from 'vue'

export type HealthState = 'idle' | 'loading' | 'ok' | 'error'

function isHealthy(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false
  const value = body as Record<string, unknown>
  return value.status === 'ok' && value.database === 'up'
}

function isDatabaseDown(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false
  const value = body as Record<string, unknown>
  return value.status === 'unavailable' && value.database === 'down'
}

export const useHealthStore = defineStore('health', () => {
  const state = ref<HealthState>('idle')
  const message = ref('Not checked yet.')

  async function check(fetcher: typeof fetch = fetch, timeoutMs = 5000) {
    state.value = 'loading'
    message.value = 'Checking the API and database…'

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetcher('/api/health', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      const body: unknown = await response.json().catch(() => null)

      if (response.ok && isHealthy(body)) {
        state.value = 'ok'
        message.value = 'API and database are ready.'
      } else if (response.status === 503 && isDatabaseDown(body)) {
        state.value = 'error'
        message.value = 'The API is reachable, but the database is unavailable.'
      } else {
        state.value = 'error'
        message.value = 'The API returned an unexpected response.'
      }
    } catch {
      state.value = 'error'
      message.value = 'Could not reach the API. Check the connection and retry.'
    } finally {
      clearTimeout(timer)
    }
  }

  return { state, message, check }
})
