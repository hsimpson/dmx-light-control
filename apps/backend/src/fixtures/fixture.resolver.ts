import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { plainToInstance } from 'class-transformer';
import { GraphQLUUID } from 'graphql-scalars';
import { CreateFixtureVendorInput } from './dto/create-fixture-vendor.dto';
import { CreateFixtureInput } from './dto/create-fixture.dto';
import { DeleteFixturePayload } from './dto/delete-fixture-payload.dto';
import { DeleteFixtureVendorPayload } from './dto/delete-fixture-vendor-payload.dto';
import { FixtureExportDocumentDto } from './dto/export-fixtures.dto';
import { FixtureVendorDto } from './dto/fixture-vendor.dto';
import { FixtureDto } from './dto/fixture.dto';
import { ImportFixturesInput, ImportFixturesPayload } from './dto/import-fixtures.dto';
import { UpdateFixtureInput } from './dto/update-fixture.dto';
import { FixtureImportExportService } from './fixture-import-export.service';
import { FixtureService } from './fixture.service';

@Resolver()
export class FixtureResolver {
  public constructor(
    private readonly fixtureService: FixtureService,
    private readonly fixtureImportExportService: FixtureImportExportService,
  ) {}

  @Query(() => [FixtureVendorDto], {
    name: 'fixtureVendors',
    description: 'get all fixture vendors',
  })
  public async getAllVendors(): Promise<FixtureVendorDto[]> {
    const vendors = await this.fixtureService.getAllVendors();
    return plainToInstance(FixtureVendorDto, vendors);
  }

  @Query(() => [FixtureDto], {
    name: 'fixtures',
    description: 'get all fixtures',
  })
  public async getAllFixtures(): Promise<FixtureDto[]> {
    const fixtures = await this.fixtureService.getAllFixtures();
    return plainToInstance(FixtureDto, fixtures);
  }

  @Query(() => FixtureDto, {
    name: 'fixture',
    description: 'get fixture by external id',
    nullable: true,
  })
  public async getFixtureByExternalId(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<FixtureDto | null> {
    const fixture = await this.fixtureService.getFixtureByPublicId(publicId);
    if (!fixture) {
      return null;
    }
    return plainToInstance(FixtureDto, fixture);
  }

  @Query(() => FixtureExportDocumentDto, {
    name: 'exportFixtures',
    description: 'export all fixture vendors, fixtures, and related entities as a versioned JSON document',
  })
  public async exportFixtures(): Promise<FixtureExportDocumentDto> {
    const document = await this.fixtureImportExportService.exportFixtures();
    return plainToInstance(FixtureExportDocumentDto, document);
  }

  @Mutation(() => FixtureDto, {
    name: 'updateFixture',
    description: 'update an existing fixture',
  })
  public async updateFixture(@Args('input') input: UpdateFixtureInput): Promise<FixtureDto> {
    const fixture = await this.fixtureService.updateFixture(input);
    return plainToInstance(FixtureDto, fixture);
  }

  @Mutation(() => FixtureDto, {
    name: 'createFixture',
    description: 'create a new fixture; creates the vendor when only a name is given',
  })
  public async createFixture(@Args('input') input: CreateFixtureInput): Promise<FixtureDto> {
    const fixture = await this.fixtureService.createFixture(input);
    return plainToInstance(FixtureDto, fixture);
  }

  @Mutation(() => DeleteFixtureVendorPayload, {
    name: 'deleteFixtureVendor',
    description: 'delete a fixture vendor by public id',
  })
  public async deleteFixtureVendorByPublicId(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteFixtureVendorPayload> {
    const result = await this.fixtureService.deleteFixtureVendorByPublicId(publicId);
    return plainToInstance(DeleteFixtureVendorPayload, result);
  }

  @Mutation(() => DeleteFixturePayload, {
    name: 'deleteFixture',
    description: 'delete a fixture by public id',
  })
  public async deleteFixtureByPublicId(
    @Args('publicId', { type: () => GraphQLUUID }) publicId: string,
  ): Promise<DeleteFixturePayload> {
    const result = await this.fixtureService.deleteFixtureByPublicId(publicId);
    return plainToInstance(DeleteFixturePayload, result);
  }

  @Mutation(() => FixtureVendorDto, {
    name: 'createFixtureVendor',
    description: 'create a new fixture vendor',
  })
  public async createFixtureVendor(@Args('input') input: CreateFixtureVendorInput): Promise<FixtureVendorDto> {
    const vendor = await this.fixtureService.createFixtureVendor(input);
    return plainToInstance(FixtureVendorDto, vendor);
  }

  @Mutation(() => ImportFixturesPayload, {
    name: 'importFixtures',
    description: 'import fixtures and related entities from a versioned JSON document, upserting by publicId or name',
  })
  public async importFixtures(@Args('document') document: ImportFixturesInput): Promise<ImportFixturesPayload> {
    const result = await this.fixtureImportExportService.importFixtures(document);
    return plainToInstance(ImportFixturesPayload, {
      importedCount: result.importedCount,
      fixtures: plainToInstance(FixtureDto, result.fixtures),
    });
  }
}
