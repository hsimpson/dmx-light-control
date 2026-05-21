import { Expose } from 'class-transformer';

export abstract class BaseDto {
  @Expose()
  public externalId: string;

  @Expose()
  public createdAt: Date;

  @Expose()
  public updatedAt: Date;
}
