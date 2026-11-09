import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'

function describe(exception: unknown): string {
  return exception instanceof Error
    ? `${exception.name}: ${exception.message}`
    : 'Unknown error'
}

function clientMessage(exception: HttpException): string {
  const response = exception.getResponse()
  if (typeof response === 'string') return response
  if (Array.isArray(response) && response.every((message) => typeof message === 'string')) {
    return response.join('; ')
  }
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = response.message
    if (typeof message === 'string') return message
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join('; ')
    }
  }
  return exception.message
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()

      if (status === 404) {
        response.status(404).json({ code: 'NOT_FOUND', message: 'Resource not found.' })
        return
      }

      if (status >= 500) {
        this.logger.error(describe(exception))
        response
          .status(status)
          .json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' })
        return
      }

      response.status(status).json({ code: 'HTTP_ERROR', message: clientMessage(exception) })
      return
    }

    this.logger.error(describe(exception))
    response
      .status(500)
      .json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' })
  }
}
