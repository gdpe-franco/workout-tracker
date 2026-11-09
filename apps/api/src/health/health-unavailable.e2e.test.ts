import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../bootstrap'

describe('health endpoint with an unavailable database', () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    process.env.DATABASE_URL =
      'postgres://workout_tracker:workout_tracker_dev@127.0.0.1:1/workout_tracker'
    app = (await createApp()).app
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 503 with a safe response', async () => {
    const response = await request(app.getHttpServer()).get('/api/health')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      status: 'unavailable',
      database: 'down',
    })
  })
})
