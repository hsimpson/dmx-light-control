import { Injectable } from '@nestjs/common';
import { Fixture, FixtureChannelDefinition, FixtureChannelMode, FixtureVendor } from './entities';
import { FixtureRepository } from './repositories/fixture.repository';
import { VendorRepository } from './repositories/vendor.repository';

type FixtureWithRelations = Fixture & {
  fixtureVendor?: FixtureVendor;
  fixtureChannelDefinitions?: FixtureChannelDefinition[];
  fixtureChannelModes?: FixtureChannelMode[];
};

@Injectable()
export class FixtureService {
  public constructor(
    private readonly fixtureRepository: FixtureRepository,
    private readonly vendorRepository: VendorRepository,
  ) {}

  public async getAllVendors() {
    return this.vendorRepository.findMany();
  }

  public async getAllFixtures(): Promise<FixtureWithRelations[]> {
    return this.fixtureRepository.findMany({
      with: {
        fixtureVendor: true,
        fixtureChannelDefinitions: { with: { fixtureChannelRanges: true, fixtureChannelAssignments: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
      },
    });
  }

  public async getFixtureByPublicId(publicId: string): Promise<FixtureWithRelations | undefined> {
    return this.fixtureRepository.findOneByPublicId(publicId, {
      with: {
        fixtureVendor: true,
        fixtureChannelDefinitions: { with: { fixtureChannelRanges: true, fixtureChannelAssignments: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
      },
    });
  }
}
