import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { IsString } from 'class-validator'
import { describe, expect, it } from 'vitest'

class ExampleDto {
  @IsString()
  name!: string
}

describe('global validation pipe options', () => {
  it('transforms DTOs and strips fields without validators', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true })
    const value = await pipe.transform(
      { name: 'sets', unexpected: 'discarded' },
      { type: 'body', metatype: ExampleDto },
    )

    expect(value).toBeInstanceOf(ExampleDto)
    expect(value).toEqual({ name: 'sets' })
  })
})
