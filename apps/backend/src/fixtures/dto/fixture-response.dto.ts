import { Expose } from 'class-transformer';

export class FixtureResponseDto {
  @Expose()
  public externalId: string;

  @Expose()
  public name: string;

  @Expose()
  public vendor: string;

  @Expose()
  public createdAt: Date;

  @Expose()
  public updatedAt: Date;
}
