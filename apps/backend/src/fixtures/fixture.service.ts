import { Injectable } from '@nestjs/common';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

@Injectable()
export class FixtureService {
  public constructor(
    private readonly vendorRepository: FixtureVendorRepository,
    private readonly fixtureRepository: FixtureRepository,
  ) {}

  public async getAllVendors() {
    return this.vendorRepository.findMany();
  }

  public async getAllFixtures() {
    return this.fixtureRepository.findMany();
  }

  public async getFixtureByPublicId(publicId: string) {
    return this.fixtureRepository.findOneByPublicId(publicId);
  }
}
