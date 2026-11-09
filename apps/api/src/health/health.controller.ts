import { Controller, Get, Inject, Res } from '@nestjs/common'
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { DatabaseService } from '../database/database.module'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get()
  @ApiOkResponse({
    description: 'API and database are available.',
    schema: { example: { status: 'ok', database: 'up' } },
  })
  @ApiServiceUnavailableResponse({
    description: 'API is running but the database probe failed.',
    schema: { example: { status: 'unavailable', database: 'down' } },
  })
  async check(@Res({ passthrough: true }) response: Response) {
    const databaseUp = await this.database.ping()
    if (!databaseUp) response.status(503)

    return databaseUp
      ? { status: 'ok', database: 'up' }
      : { status: 'unavailable', database: 'down' }
  }
}
