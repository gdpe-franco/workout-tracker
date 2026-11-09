import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../bootstrap'

describe('health endpoint', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = (await createApp()).app
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('reports the API and database as available', async () => {
    const response = await request(app.getHttpServer()).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', database: 'up' })
  })

  it('returns a JSON envelope for unknown API routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Resource not found.',
    })
  })
})
