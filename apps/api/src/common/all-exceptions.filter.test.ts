import { BadRequestException, type ArgumentsHost } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { AllExceptionsFilter } from './all-exceptions.filter'

describe('AllExceptionsFilter', () => {
  it('keeps field messages from structured client errors', () => {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost

    new AllExceptionsFilter().catch(
      new BadRequestException({ message: ['name must be a string', 'name should not be empty'] }),
      host,
    )

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      code: 'HTTP_ERROR',
      message: 'name must be a string; name should not be empty',
    })
  })
})
