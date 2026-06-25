import { FixtureNotFoundException } from '@/shared/exceptions';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm/table';
import { UpdateFixtureInput } from './dto/update-fixture.dto';
import { fixture } from './entities';
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

  public async updateFixture(input: UpdateFixtureInput) {
    const updateData: Partial<InferSelectModel<typeof fixture>> = {};
    if (input.name) {
      updateData.name = input.name;
    }

    if (Object.keys(updateData).length) {
      const updatedFixture = await this.fixtureRepository.updateOneByPublicId(input.publicId, updateData);
      if (!updatedFixture) {
        throw new FixtureNotFoundException(input.publicId);
      }
    }

    return await this.fixtureRepository.findOneByPublicId(input.publicId);
  }
}
