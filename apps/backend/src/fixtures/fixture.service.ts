import { Injectable } from '@nestjs/common';
import { Fixture } from './entities';
import { ChannelAssignment } from './entities/channel-assignment.entity';
import { Vendor } from './entities/vendor.entity';
import { FixtureRepository } from './repositories/fixture.repository';
import { VendorRepository } from './repositories/vendor.repository';

export type FixtureWithRelations = Fixture & {
  vendor?: Vendor;
  channelAssignments?: ChannelAssignment[];
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
      with: { vendor: true, channelAssignments: true },
    });
  }

  public async getFixtureByExternalId(
    externalId: string,
  ): Promise<FixtureWithRelations | undefined> {
    return this.fixtureRepository.findOneByExternalId(externalId, {
      with: { vendor: true, channelAssignments: true },
    });
  }
}
