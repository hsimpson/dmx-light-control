import { Args, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { FixtureResponseDto } from './dto/fixture.response.dto';
import { VendorResponseDto } from './dto/vendor.response.dto';
import { FixtureService } from './fixture.service';
@Resolver()
export class FixtureResolver {
  public constructor(private readonly fixtureService: FixtureService) {}

  @Query(() => [VendorResponseDto], {
    name: 'vendors',
    description: 'get all fixture vendors',
  })
  public async getAllVendors(): Promise<VendorResponseDto[]> {
    const vendors = await this.fixtureService.getAllVendors();
    return plainToInstance(VendorResponseDto, vendors);
  }

  @Query(() => [FixtureResponseDto], {
    name: 'fixtures',
    description: 'get all fixtures',
  })
  public async getAllFixtures(): Promise<FixtureResponseDto[]> {
    const fixtures = await this.fixtureService.getAllFixtures();
    return plainToInstance(FixtureResponseDto, fixtures);
  }

  @Query(() => FixtureResponseDto, {
    name: 'fixture',
    description: 'get fixture by external id',
    nullable: true,
  })
  public async getFixtureByExternalId(
    @Args('fixtureId', { type: () => GraphQLUUID }) fixtureId: string,
  ): Promise<FixtureResponseDto | null> {
    const fixture = await this.fixtureService.getFixtureByExternalId(fixtureId);
    if (!fixture) {
      return null;
    }
    return plainToInstance(FixtureResponseDto, fixture);
  }
}
