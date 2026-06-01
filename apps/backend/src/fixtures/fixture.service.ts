import { Injectable } from '@nestjs/common';
import { Fixture } from './entities';
import { FixtureRepository } from './repositories/fixture.repository';
import { VendorRepository } from './repositories/vendor.repository';

@Injectable()
export class FixtureService {
  public constructor(
    private readonly fixtureRepository: FixtureRepository,
    private readonly vendorRepository: VendorRepository,
  ) {}

  public async getAllVendors() {
    return this.vendorRepository.findMany();
  }

  public async getAllFixtures(): Promise<Fixture[]> {
    return this.fixtureRepository.findMany({
      with: { vendor: true, channelAssignments: true },
    });
  }

  public async getFixtureByExternalId(
    externalId: string,
  ): Promise<Fixture | undefined> {
    return this.fixtureRepository.findOneByExternalId(externalId, {
      with: { vendor: true, channelAssignments: true },
    });
  }
}
