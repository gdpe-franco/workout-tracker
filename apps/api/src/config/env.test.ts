import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgres://user:secret@localhost:5432/db',
}

describe('parseEnv', () => {
  it('applies development defaults', () => {
    expect(parseEnv(valid)).toEqual({
      nodeEnv: 'development',
      port: 3000,
      databaseUrl: 'postgres://user:secret@localhost:5432/db',
      webDistDir: null,
      swaggerEnabled: true,
    })
  })

  it('disables swagger by default in production', () => {
    const env = parseEnv({ ...valid, NODE_ENV: 'production' })
    expect(env.swaggerEnabled).toBe(false)
  })

  it('allows swagger to be enabled explicitly in production', () => {
    const env = parseEnv({
      ...valid,
      NODE_ENV: 'production',
      SWAGGER_ENABLED: 'true',
    })
    expect(env.swaggerEnabled).toBe(true)
  })

  it('reports every invalid setting without echoing secret values', () => {
    let message = ''
    try {
      parseEnv({
        DATABASE_URL: 'not-a-url',
        NODE_ENV: 'staging',
        PORT: '70000',
        SWAGGER_ENABLED: 'yes',
      })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toContain('NODE_ENV')
    expect(message).toContain('PORT')
    expect(message).toContain('DATABASE_URL')
    expect(message).toContain('SWAGGER_ENABLED')
    expect(message).not.toContain('not-a-url')
  })

  it('rejects a missing database URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL is required/)
  })
})
