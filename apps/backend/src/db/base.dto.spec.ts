/// <reference types="vitest/globals" />
import { BaseDto } from './base.dto';

class Concrete extends BaseDto {
  public publicId = 'id';
  public createdAt = new Date();
  public updatedAt = new Date();
}

describe('BaseDto', () => {
  it('can be extended by concrete DTOs', () => {
    const dto = new Concrete();
    expect(dto.publicId).toBe('id');
    expect(dto.createdAt).toBeInstanceOf(Date);
    expect(dto.updatedAt).toBeInstanceOf(Date);
  });
});
