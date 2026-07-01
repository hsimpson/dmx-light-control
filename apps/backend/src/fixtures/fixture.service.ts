import {
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from '@/fixtures/fixture.exceptions';
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

    if (input.vendor?.publicId) {
      const vendor = await this.vendorRepository.findOneByPublicId(input.vendor.publicId);
      if (!vendor) {
        throw new FixtureVendorNotFoundException(input.vendor.publicId);
      }
      updateData.vendorId = vendor.id ?? undefined;
    } else if (input.vendor?.name) {
      const existingVendor = await this.vendorRepository.findOneByName(input.vendor.name);
      if (existingVendor) {
        throw new FixtureVendorAlreadyExistsException(input.vendor.name);
      }
      const newVendor = await this.vendorRepository.createOne({
        name: input.vendor.name,
        publicId: crypto.randomUUID(),
      });

      if (!newVendor) {
        throw new FixtureVendorCreationFailedException(input.vendor.name);
      }
      updateData.vendorId = newVendor.id ?? undefined;
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
