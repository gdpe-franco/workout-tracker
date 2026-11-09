import 'reflect-metadata'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NextFunction, Request, Response } from 'express'
import { AppModule } from './app.module'
import { APP_ENV, type AppEnv } from './config/env'

export interface RunningApp {
  app: NestExpressApplication
  env: AppEnv
}

export async function createApp(): Promise<RunningApp> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const env = app.get<AppEnv>(APP_ENV)

  app.setGlobalPrefix('api')
  app.enableShutdownHooks()
  configureSwagger(app, env)

  if (env.webDistDir) {
    const distDir = resolve(env.webDistDir)
    const indexFile = join(distDir, 'index.html')
    if (!existsSync(indexFile)) {
      await app.close()
      throw new Error(`WEB_DIST_DIR does not contain index.html: ${distDir}`)
    }
    registerSpa(app, distDir, indexFile)
  }

  return { app, env }
}

function configureSwagger(app: NestExpressApplication, env: AppEnv): void {
  if (!env.swaggerEnabled) return

  const config = new DocumentBuilder()
    .setTitle('Workout Tracker API')
    .setVersion('0.0.0')
    .build()

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config))
}

function registerSpa(
  app: NestExpressApplication,
  distDir: string,
  indexFile: string,
): void {
  app.useStaticAssets(distDir, { index: false })

  app.use((request: Request, response: Response, next: NextFunction) => {
    const isRead = request.method === 'GET' || request.method === 'HEAD'
    const isApiOrDocs =
      request.path.startsWith('/api') || request.path.startsWith('/docs')
    // Paths with a file extension are asset requests, not client routes.
    const looksLikeAsset = request.path.includes('.')

    if (!isRead || isApiOrDocs || looksLikeAsset) {
      next()
      return
    }

    response.sendFile(indexFile)
  })
}
