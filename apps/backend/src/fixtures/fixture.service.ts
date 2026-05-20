import { Injectable } from '@nestjs/common';
import { FixtureRepository } from './repositories/fixture.repository';

@Injectable()
export class FixtureService {
  public constructor(private readonly fixtureRepository: FixtureRepository) {}

  public async getAllFixtures() {
    return this.fixtureRepository.findAll();
  }
}
