import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { FixtureVendorDto } from './dto/fixture-vendor.dto';
import { FixtureDto } from './dto/fixture.dto';
import { UpdateFixtureInput } from './dto/update-fixture.dto';
import { FixtureService } from './fixture.service';

@Resolver()
export class FixtureResolver {
  public constructor(private readonly fixtureService: FixtureService) {}

  @Query(() => [FixtureVendorDto], {
    name: 'fixtureVendors',
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

  // @Mutation(() => FixtureDto, {
  //   name: 'createFixture',
  //   description: 'create a new fixture',
  // })
  // public async createFixture(@Args('input') input: FixtureInput): Promise<FixtureDto> {
  //   const fixture = await this.fixtureService.createFixture(input);
  //   return plainToInstance(FixtureDto, fixture);
  // }

  @Mutation(() => FixtureDto, {
    name: 'updateFixture',
    description: 'update an existing fixture',
  })
  public async updateFixture(@Args('input') input: UpdateFixtureInput): Promise<FixtureDto> {
    const fixture = await this.fixtureService.updateFixture(input);
    return plainToInstance(FixtureDto, fixture);
  }
}
