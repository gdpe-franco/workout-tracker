export const APP_ENV = Symbol('APP_ENV')

export type NodeEnv = 'development' | 'test' | 'production'

export interface AppEnv {
  nodeEnv: NodeEnv
  port: number
  databaseUrl: string
  webDistDir: string | null
  swaggerEnabled: boolean
}

const nodeEnvs: readonly NodeEnv[] = ['development', 'test', 'production']

function isNodeEnv(value: string): value is NodeEnv {
  return (nodeEnvs as readonly string[]).includes(value)
}

export function parseEnv(raw: Record<string, string | undefined>): AppEnv {
  const errors: string[] = []

  const nodeEnvValue = raw.NODE_ENV ?? 'development'
  if (!isNodeEnv(nodeEnvValue)) {
    errors.push('NODE_ENV must be one of: development, test, production')
  }

  const portValue = raw.PORT ?? '3000'
  const port = Number(portValue)
  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535')
  }

  let databaseUrl = ''
  const databaseUrlValue = raw.DATABASE_URL
  if (!databaseUrlValue) {
    errors.push('DATABASE_URL is required')
  } else {
    try {
      const url = new URL(databaseUrlValue)
      if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
        errors.push('DATABASE_URL must use the postgres:// or postgresql:// protocol')
      } else if (!url.hostname) {
        errors.push('DATABASE_URL must include a host')
      } else {
        databaseUrl = databaseUrlValue
      }
    } catch {
      errors.push('DATABASE_URL must be a valid connection URL')
    }
  }

  const webDistDir = raw.WEB_DIST_DIR?.trim() || null

  const swaggerDefault = nodeEnvValue === 'production' ? 'false' : 'true'
  const swaggerValue = raw.SWAGGER_ENABLED ?? swaggerDefault
  if (swaggerValue !== 'true' && swaggerValue !== 'false') {
    errors.push('SWAGGER_ENABLED must be true or false')
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`)
  }

  return {
    nodeEnv: nodeEnvValue as NodeEnv,
    port,
    databaseUrl,
    webDistDir,
    swaggerEnabled: swaggerValue === 'true',
  }
}
