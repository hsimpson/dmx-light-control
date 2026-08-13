import {
  ChannelDefinitionNotFoundException,
  ChannelModeAlreadyExistsException,
  ChannelModeNotFoundException,
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from '@/fixtures/fixture.exceptions';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm/table';
import { CreateFixtureVendorInput } from './dto/create-fixture-vendor.dto';
import { UpdateFixtureChannelModeInput } from './dto/update-fixture-channel-mode.dto';
import { UpdateFixtureInput } from './dto/update-fixture.dto';
import { fixture } from './entities';
import {
  FixtureChannelModeRepository,
  ReplaceFixtureChannelModeInput,
} from './repositories/fixture-channel-mode.repository';
import { FixtureVendorRepository } from './repositories/fixture-vendor.repository';
import { FixtureRepository } from './repositories/fixture.repository';

type FixtureChannelGraph = InferSelectModel<typeof fixture> & {
  fixtureChannelDefinitions?: { id: number; publicId: string }[];
  fixtureChannelModes?: { publicId: string }[];
};

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return error.code;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  if (getErrorCode(error) === '23505') {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return getErrorCode(error.cause) === '23505';
  }
  return false;
}

@Injectable()
export class FixtureService {
  public constructor(
    private readonly vendorRepository: FixtureVendorRepository,
    private readonly fixtureRepository: FixtureRepository,
    private readonly channelModeRepository: FixtureChannelModeRepository,
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

    const loadedFixture = await this.fixtureRepository.findOneByPublicId(input.publicId);
    if (input.channelModes === undefined) {
      return loadedFixture;
    }

    if (!loadedFixture) {
      throw new FixtureNotFoundException(input.publicId);
    }

    await this.replaceChannelModes(loadedFixture, input.channelModes);
    return await this.fixtureRepository.findOneByPublicId(input.publicId);
  }

  public async deleteFixtureVendorByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.vendorRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }

  public async createFixtureVendor(input: CreateFixtureVendorInput) {
    return this.vendorRepository.createOne(input);
  }

  private async replaceChannelModes(
    loadedFixture: InferSelectModel<typeof fixture>,
    channelModes: UpdateFixtureChannelModeInput[],
  ): Promise<void> {
    const graph = loadedFixture as FixtureChannelGraph;
    const seenNames = new Set<string>();
    const existingModePublicIds = new Set((graph.fixtureChannelModes ?? []).map(mode => mode.publicId));
    const definitionIdByPublicId = new Map(
      (graph.fixtureChannelDefinitions ?? []).map(definition => [definition.publicId, definition.id]),
    );

    for (const mode of channelModes) {
      if (seenNames.has(mode.name)) {
        throw new ChannelModeAlreadyExistsException(mode.name);
      }
      seenNames.add(mode.name);

      if (mode.publicId && !existingModePublicIds.has(mode.publicId)) {
        throw new ChannelModeNotFoundException(mode.publicId);
      }

      for (const assignment of mode.assignments) {
        if (!definitionIdByPublicId.has(assignment.channelDefinitionPublicId)) {
          throw new ChannelDefinitionNotFoundException(assignment.channelDefinitionPublicId);
        }
      }
    }

    const replaceInput: ReplaceFixtureChannelModeInput[] = channelModes.map(mode => ({
      publicId: mode.publicId,
      name: mode.name,
      assignments: mode.assignments.map(assignment => {
        const channelDefinitionId = definitionIdByPublicId.get(assignment.channelDefinitionPublicId);
        if (channelDefinitionId === undefined) {
          throw new ChannelDefinitionNotFoundException(assignment.channelDefinitionPublicId);
        }
        return { channelDefinitionId };
      }),
    }));

    try {
      if (typeof graph.id !== 'number') {
        throw new FixtureNotFoundException(graph.publicId ?? '');
      }
      await this.channelModeRepository.replaceAllForFixture(graph.id, replaceInput);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ChannelModeAlreadyExistsException(channelModes[0]?.name ?? 'channel mode');
      }
      throw error;
    }
  }
}
