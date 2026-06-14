import { Injectable } from '@nestjs/common';
import { Fixture, FixtureChannelDefinition, FixtureChannelMode, FixtureVendor } from './entities';
import { FixtureChannelDefinitionInput, FixtureChannelModeInput, FixtureInput } from './dto/fixture.input';
import { FixtureRepository } from './repositories/fixture.repository';
import { FixtureChannelDefinitionRepository } from './repositories/fixture-channel-definition.repository';
import { FixtureChannelModeRepository } from './repositories/fixture-channel-mode.repository';
import { FixtureChannelRangeRepository } from './repositories/fixture-channel-range.repository';
import { FixtureChannelAssignmentRepository } from './repositories/fixture-channel-assignment.repository';
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
    private readonly channelDefinitionRepository: FixtureChannelDefinitionRepository,
    private readonly channelModeRepository: FixtureChannelModeRepository,
    private readonly channelRangeRepository: FixtureChannelRangeRepository,
    private readonly channelAssignmentRepository: FixtureChannelAssignmentRepository,
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

  public async createFixture(input: FixtureInput): Promise<FixtureWithRelations> {
    const created = await this.fixtureRepository.create([{ name: input.name, vendorId: input.vendorId }]);
    const firstCreated = created[0];
    if (!firstCreated) {
      throw new Error('Failed to create fixture');
    }
    const fixtureId = firstCreated.id;
    if (!fixtureId) {
      throw new Error('Failed to create fixture: id is missing');
    }

    if (input.fixtureChannelDefinitions) {
      await this.insertChannelDefinitions(fixtureId, input.fixtureChannelDefinitions);
    }

    if (input.fixtureChannelModes) {
      await this.insertChannelModes(fixtureId, input.fixtureChannelModes);
    }

    const fixturePublicId = firstCreated.publicId;
    if (!fixturePublicId) {
      throw new Error('Failed to create fixture: publicId is missing');
    }

    const result = await this.fixtureRepository.findOneByPublicId(fixturePublicId, {
      with: {
        fixtureVendor: true,
        fixtureChannelDefinitions: { with: { fixtureChannelRanges: true, fixtureChannelAssignments: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
      },
    });

    return result as FixtureWithRelations;
  }

  public async updateFixture(input: FixtureInput): Promise<FixtureWithRelations> {
    if (!input.publicId) {
      throw new Error('Update requires a publicId');
    }

    await this.fixtureRepository.updateByPublicId(input.publicId, { name: input.name, vendorId: input.vendorId });

    if (input.fixtureChannelDefinitions) {
      await this.insertChannelDefinitionsForFixture(input.publicId, input.fixtureChannelDefinitions);
    }

    if (input.fixtureChannelModes) {
      await this.insertChannelModesForFixture(input.publicId, input.fixtureChannelModes);
    }

    const result = await this.fixtureRepository.findOneByPublicId(input.publicId, {
      with: {
        fixtureVendor: true,
        fixtureChannelDefinitions: { with: { fixtureChannelRanges: true, fixtureChannelAssignments: true } },
        fixtureChannelModes: { with: { fixtureChannelAssignments: true } },
      },
    });

    return result as FixtureWithRelations;
  }

  private async insertChannelDefinitions(
    fixtureId: number,
    definitions: FixtureChannelDefinitionInput[],
  ): Promise<void> {
    for (const def of definitions) {
      const created = await this.channelDefinitionRepository.create([
        { fixtureId, name: def.name, order: def.order, preset: def.preset },
      ]);
      const defCreated = created[0];
      if (!defCreated) {
        throw new Error('Failed to create channel definition');
      }
      const defId = defCreated.id;
      if (!defId) {
        throw new Error('Failed to create channel definition: id is missing');
      }

      if (def.fixtureChannelRanges) {
        for (const range of def.fixtureChannelRanges) {
          await this.channelRangeRepository.create([
            {
              fixtureChannelDefinitionId: defId,
              dmxStart: range.dmxStart,
              dmxEnd: range.dmxEnd,
              description: range.description,
            },
          ]);
        }
      }
    }
  }

  private async insertChannelModes(fixtureId: number, modes: FixtureChannelModeInput[]): Promise<void> {
    for (const mode of modes) {
      const created = await this.channelModeRepository.create([{ fixtureId, name: mode.name, order: mode.order }]);
      const modeCreated = created[0];
      if (!modeCreated) {
        throw new Error('Failed to create channel mode');
      }
      const modeId = modeCreated.id;
      if (!modeId) {
        throw new Error('Failed to create channel mode: id is missing');
      }

      if (mode.fixtureChannelAssignments) {
        for (const assignment of mode.fixtureChannelAssignments) {
          await this.channelAssignmentRepository.create([
            { fixtureChannelModeId: modeId, channelNumber: assignment.channelNumber },
          ]);
        }
      }
    }
  }

  private async insertChannelDefinitionsForFixture(
    fixturePublicId: string,
    definitions: FixtureChannelDefinitionInput[],
  ): Promise<void> {
    const fixtureId = await this.getFixtureIdByPublicId(fixturePublicId);
    if (!fixtureId) {
      throw new Error('Fixture not found');
    }

    const existing = await this.channelDefinitionRepository.findMany({
      where: (fields, { eq }) => eq(fields.fixtureId, fixtureId),
    });

    if (existing.length > 0) {
      await this.channelDefinitionRepository.deleteManyBy((fields, { eq }) => eq(fields.fixtureId, fixtureId));
    }

    await this.insertChannelDefinitions(fixtureId, definitions);
  }

  private async insertChannelModesForFixture(fixturePublicId: string, modes: FixtureChannelModeInput[]): Promise<void> {
    const fixtureId = await this.getFixtureIdByPublicId(fixturePublicId);
    if (!fixtureId) {
      throw new Error('Fixture not found');
    }

    const existing = await this.channelModeRepository.findMany({
      where: (fields, { eq }) => eq(fields.fixtureId, fixtureId),
    });

    if (existing.length > 0) {
      await this.channelModeRepository.deleteManyBy((fields, { eq }) => eq(fields.fixtureId, fixtureId));
    }

    await this.insertChannelModes(fixtureId, modes);
  }

  private async getFixtureIdByPublicId(publicId: string): Promise<number | null> {
    const result = await this.fixtureRepository.findOneByPublicId(publicId);
    return result?.id ?? null;
  }
}
