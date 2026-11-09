import { Logger } from '@nestjs/common'
import { createApp } from './bootstrap'

async function main(): Promise<void> {
  const { app, env } = await createApp()
  await app.listen(env.port, '0.0.0.0')
  Logger.log(`API listening on port ${env.port}`, 'Bootstrap')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed to start API: ${message}`)
  process.exitCode = 1
})
