import {
  ChannelDefinitionAlreadyExistsException,
  ChannelDefinitionNotFoundException,
  ChannelModeAlreadyExistsException,
  ChannelModeNotFoundException,
  FixtureCreationFailedException,
  FixtureNotFoundException,
  FixtureVendorAlreadyExistsException,
  FixtureVendorCreationFailedException,
  FixtureVendorNotFoundException,
} from '@/fixtures/fixture.exceptions';
import { Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm/table';
import { CreateFixtureVendorInput } from './dto/create-fixture-vendor.dto';
import { CreateFixtureInput } from './dto/create-fixture.dto';
import { UpdateFixtureVendorInput } from './dto/fixture.input';
import { UpdateFixtureChannelDefinitionInput } from './dto/update-fixture-channel-definition.dto';
import { UpdateFixtureChannelModeInput } from './dto/update-fixture-channel-mode.dto';
import { UpdateFixtureInput } from './dto/update-fixture.dto';
import { fixture } from './entities';
import { FixtureChannelDefinitionRepository } from './repositories/fixture-channel-definition.repository';
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
    private readonly channelDefinitionRepository: FixtureChannelDefinitionRepository,
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

    if (input.channelDefinitions === undefined && input.channelModes === undefined) {
      return loadedFixture;
    }

    if (!loadedFixture) {
      throw new FixtureNotFoundException(input.publicId);
    }

    if (input.channelDefinitions !== undefined) {
      await this.renameChannelDefinitions(loadedFixture, input.channelDefinitions);
    }

    if (input.channelModes !== undefined) {
      await this.replaceChannelModes(loadedFixture, input.channelModes);
    }

    return await this.fixtureRepository.findOneByPublicId(input.publicId);
  }

  public async deleteFixtureVendorByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.vendorRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }

  public async deleteFixtureByPublicId(publicId: string): Promise<{ publicId: string; deleted: boolean }> {
    const deleted = await this.fixtureRepository.deleteOneByPublicId(publicId);
    return { publicId, deleted };
  }

  public async createFixtureVendor(input: CreateFixtureVendorInput) {
    return this.vendorRepository.createOne(input);
  }

  public async createFixture(input: CreateFixtureInput) {
    const vendor = await this.resolveVendor(input.vendor);
    const vendorId = vendor.id;
    if (typeof vendorId !== 'number') {
      throw new FixtureVendorCreationFailedException(vendor.name);
    }

    const createdFixture = await this.fixtureRepository.createOne({
      name: input.name,
      vendorId,
    });
    if (!createdFixture) {
      throw new FixtureCreationFailedException(input.name);
    }

    const createdPublicId = createdFixture.publicId;
    if (typeof createdPublicId !== 'string') {
      throw new FixtureCreationFailedException(input.name);
    }

    const loadedFixture = await this.fixtureRepository.findOneByPublicId(createdPublicId);
    if (!loadedFixture) {
      throw new FixtureNotFoundException(createdPublicId);
    }

    if (input.channelDefinitions !== undefined && input.channelDefinitions.length > 0) {
      await this.createChannelDefinitions(loadedFixture, input.channelDefinitions);
    }

    if (input.channelModes !== undefined && input.channelModes.length > 0) {
      await this.replaceChannelModes(loadedFixture, input.channelModes);
    }

    return await this.fixtureRepository.findOneByPublicId(createdPublicId);
  }

  private async resolveVendor(vendor: UpdateFixtureVendorInput) {
    if (vendor.publicId) {
      const existingVendor = await this.vendorRepository.findOneByPublicId(vendor.publicId);
      if (!existingVendor) {
        throw new FixtureVendorNotFoundException(vendor.publicId);
      }
      return existingVendor;
    }

    if (vendor.name) {
      const existingVendor = await this.vendorRepository.findOneByName(vendor.name);
      if (existingVendor) {
        return existingVendor;
      }
      const newVendor = await this.vendorRepository.createOne({ name: vendor.name });
      if (!newVendor) {
        throw new FixtureVendorCreationFailedException(vendor.name);
      }
      return newVendor;
    }

    throw new FixtureVendorNotFoundException('unknown');
  }

  private async createChannelDefinitions(
    loadedFixture: InferSelectModel<typeof fixture>,
    channelDefinitions: UpdateFixtureChannelDefinitionInput[],
  ): Promise<void> {
    const graph = loadedFixture as FixtureChannelGraph;
    if (typeof graph.id !== 'number') {
      throw new FixtureNotFoundException(graph.publicId ?? '');
    }

    for (const definition of channelDefinitions) {
      try {
        const created = await this.channelDefinitionRepository.createOneForFixture(graph.id, {
          name: definition.name.trim(),
          ...(definition.preset !== undefined ? { preset: definition.preset } : {}),
          ...(definition.order !== undefined ? { order: definition.order } : {}),
        });
        if (typeof created?.id === 'number' && definition.ranges !== undefined) {
          await this.channelDefinitionRepository.replaceRangesForDefinition(created.id, definition.ranges);
        }
      } catch (error) {
        if (isPostgresUniqueViolation(error)) {
          throw new ChannelDefinitionAlreadyExistsException(definition.name.trim());
        }
        throw error;
      }
    }
  }

  private async renameChannelDefinitions(
    loadedFixture: InferSelectModel<typeof fixture>,
    channelDefinitions: UpdateFixtureChannelDefinitionInput[],
  ): Promise<void> {
    const graph = loadedFixture as FixtureChannelGraph;
    const existingPublicIds = new Set((graph.fixtureChannelDefinitions ?? []).map(definition => definition.publicId));
    const seenNames = new Set<string>();

    for (const definition of channelDefinitions) {
      const name = definition.name.trim();
      if (seenNames.has(name)) {
        throw new ChannelDefinitionAlreadyExistsException(name);
      }
      seenNames.add(name);

      if (definition.publicId && !existingPublicIds.has(definition.publicId)) {
        throw new ChannelDefinitionNotFoundException(definition.publicId);
      }
    }

    if (typeof graph.id !== 'number') {
      throw new FixtureNotFoundException(graph.publicId ?? '');
    }

    for (const definition of channelDefinitions) {
      try {
        const name = definition.name.trim();
        if (!definition.publicId) {
          const created = await this.channelDefinitionRepository.createOneForFixture(graph.id, {
            name,
            ...(definition.preset !== undefined ? { preset: definition.preset } : {}),
            ...(definition.order !== undefined ? { order: definition.order } : {}),
          });
          if (typeof created?.id === 'number' && definition.ranges !== undefined) {
            await this.channelDefinitionRepository.replaceRangesForDefinition(created.id, definition.ranges);
          }
          continue;
        }
        const updated = await this.channelDefinitionRepository.updateOneByPublicId(definition.publicId, {
          name,
          ...(definition.preset !== undefined ? { preset: definition.preset } : {}),
          ...(definition.order !== undefined ? { order: definition.order } : {}),
        });
        if (!updated) {
          throw new ChannelDefinitionNotFoundException(definition.publicId);
        }
        if (typeof updated.id === 'number' && definition.ranges !== undefined) {
          await this.channelDefinitionRepository.replaceRangesForDefinition(updated.id, definition.ranges);
        }
      } catch (error) {
        if (error instanceof ChannelDefinitionNotFoundException) {
          throw error;
        }
        if (isPostgresUniqueViolation(error)) {
          throw new ChannelDefinitionAlreadyExistsException(definition.name.trim());
        }
        throw error;
      }
    }
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
