import { Controller, Get } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { FixtureResponseDto } from './dto/fixture-response.dto';
import { FixtureService } from './fixture.service';

@Controller('fixtures')
export class FixtureController {
  public constructor(private readonly fixtureService: FixtureService) {}

  @Get('all-fixtures')
  public async getAllFixtures(): Promise<FixtureResponseDto[]> {
    const fixtures = await this.fixtureService.getAllFixtures();
    console.log(fixtures);
    return plainToInstance(FixtureResponseDto, fixtures);
  }
}
