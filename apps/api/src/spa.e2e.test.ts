import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NestExpressApplication } from '@nestjs/platform-express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './bootstrap'

const marker = '<div id="app">production shell</div>'

describe('production static serving', () => {
  let app: NestExpressApplication
  let webDir: string

  beforeAll(async () => {
    webDir = await mkdtemp(join(tmpdir(), 'workout-tracker-web-'))
    await mkdir(join(webDir, 'assets'))
    await writeFile(join(webDir, 'index.html'), marker)
    await writeFile(join(webDir, 'assets', 'app.js'), 'console.log("asset")')

    process.env.WEB_DIST_DIR = webDir
    app = (await createApp()).app
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await rm(webDir, { recursive: true, force: true })
    delete process.env.WEB_DIST_DIR
  })

  it('serves the shell for client-side routes', async () => {
    const response = await request(app.getHttpServer()).get('/routines/123')

    expect(response.status).toBe(200)
    expect(response.text).toContain(marker)
  })

  it('serves static assets', async () => {
    const response = await request(app.getHttpServer()).get('/assets/app.js')

    expect(response.status).toBe(200)
    expect(response.text).toContain('console.log')
  })

  it('keeps unknown API routes as JSON 404 responses', async () => {
    const response = await request(app.getHttpServer()).get('/api/unknown')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Resource not found.',
    })
    expect(response.text).not.toContain(marker)
  })

  it('does not serve the shell for missing assets', async () => {
    const response = await request(app.getHttpServer()).get('/assets/missing.js')

    expect(response.status).toBe(404)
    expect(response.text).not.toContain(marker)
  })
})
