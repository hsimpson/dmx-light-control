import { Controller, Get } from '@nestjs/common';
import { FixtureService } from './fixture.service';

@Controller('fixtures')
export class FixtureController {
  public constructor(private readonly fixtureService: FixtureService) {}

  @Get('all-fixtures')
  public async getAllFixtures() {
    return await this.fixtureService.getAllFixtures();
  }
}
