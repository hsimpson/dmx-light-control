import { Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { FixtureResponseDto } from './dto/fixture.response.dto';
import { FixtureService } from './fixture.service';

@Resolver()
export class FixtureResolver {
  public constructor(private readonly fixtureService: FixtureService) {}

  @Query(() => [FixtureResponseDto], {
    name: 'fixtures',
    description: 'get all fixtures',
  })
  public async getAllFixtures(): Promise<FixtureResponseDto[]> {
    const fixtures = await this.fixtureService.getAllFixtures();
    console.log('fixtures', fixtures);
    return plainToInstance(FixtureResponseDto, fixtures);
  }
}
