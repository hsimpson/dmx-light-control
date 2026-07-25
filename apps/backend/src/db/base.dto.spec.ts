import { describe, expect, it } from 'vitest';
import { BaseDto } from './base.dto';

class Concrete extends BaseDto {
  public override publicId = 'id';
  public override createdAt = new Date();
  public override updatedAt = new Date();
}

describe('BaseDto', () => {
  it('can be extended by concrete DTOs', () => {
    const dto = new Concrete();
    expect(dto.publicId).toBe('id');
    expect(dto.createdAt).toBeInstanceOf(Date);
    expect(dto.updatedAt).toBeInstanceOf(Date);
  });
});
