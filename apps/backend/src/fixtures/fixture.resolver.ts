import { Args, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { FixtureVendorDto } from './dto/fixture-vendor.dto';
import { FixtureDto } from './dto/fixture.dto';
import { FixtureService } from './fixture.service';
@Resolver()
export class FixtureResolver {
  public constructor(private readonly fixtureService: FixtureService) {}

  @Query(() => [FixtureVendorDto], {
    name: 'vendors',
    description: 'get all fixture vendors',
  })
  public async getAllVendors(): Promise<FixtureVendorDto[]> {
    const vendors = await this.fixtureService.getAllVendors();
    return plainToInstance(FixtureVendorDto, vendors);
  }

  @Query(() => [FixtureDto], {
    name: 'fixtures',
    description: 'get all fixtures',
  })
  public async getAllFixtures(): Promise<FixtureDto[]> {
    const fixtures = await this.fixtureService.getAllFixtures();
    console.log('Fetched fixtures:', JSON.stringify(fixtures, null, 2));
    // return fixtures.map(fixture => this.transformFixture(fixture));
    return plainToInstance(FixtureDto, fixtures);
  }

  @Query(() => FixtureDto, {
    name: 'fixture',
    description: 'get fixture by external id',
    nullable: true,
  })
  public async getFixtureByExternalId(
    @Args('fixtureId', { type: () => GraphQLUUID }) fixtureId: string,
  ): Promise<FixtureDto | null> {
    const fixture = await this.fixtureService.getFixtureByPublicId(fixtureId);
    if (!fixture) {
      return null;
    }
    return plainToInstance(FixtureDto, fixture);
  }
}
