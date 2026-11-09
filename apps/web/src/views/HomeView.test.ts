import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeView from './HomeView.vue'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function mountView() {
  return mount(HomeView, { global: { plugins: [createPinia()] } })
}

describe('HomeView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows loading and then readiness', async () => {
    let resolveFetch: (response: Response) => void = () => undefined
    const fetcher = vi.fn(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve)),
    )
    vi.stubGlobal('fetch', fetcher)

    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Checking the API and database')

    resolveFetch(jsonResponse({ status: 'ok', database: 'up' }))
    await flushPromises()

    expect(wrapper.text()).toContain('API and database are ready.')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows a failure and retries successfully', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(jsonResponse({ status: 'ok', database: 'up' }))
    vi.stubGlobal('fetch', fetcher)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Could not reach the API')
    const button = wrapper.get('button')
    expect(button.text()).toBe('Retry')

    await button.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('API and database are ready.')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
