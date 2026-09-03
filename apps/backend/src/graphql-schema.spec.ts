import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppEventEmitter } from './events/app-event-emitter';
import { FixtureImportExportService } from './fixtures/fixture-import-export.service';
import { FixtureResolver } from './fixtures/fixture.resolver';
import { FixtureService } from './fixtures/fixture.service';
import { DmxResolver } from './io/dmx/dmx.resolver';
import { MidiResolver } from './io/midi/midi.resolver';
import { MidiService } from './io/midi/midi.service';
import { ProjectImportExportService } from './projects/project-import-export.service';
import { ProjectResolver } from './projects/project.resolver';
import { ProjectService } from './projects/project.service';

describe('GraphQL schema generation', () => {
  it('builds the schema, executing all @Query/@Mutation type-thunks', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        FixtureResolver,
        ProjectResolver,
        DmxResolver,
        MidiResolver,
        { provide: FixtureService, useValue: {} },
        { provide: FixtureImportExportService, useValue: {} },
        { provide: ProjectService, useValue: {} },
        { provide: ProjectImportExportService, useValue: {} },
        { provide: AppEventEmitter, useValue: {} },
        { provide: MidiService, useValue: {} },
      ],
    }).compile();

    const factory = moduleRef.get(GraphQLSchemaFactory);
    const schema = await factory.create([FixtureResolver, ProjectResolver, DmxResolver, MidiResolver]);

    expect(schema).toBeDefined();
    expect(schema.getQueryType()?.getFields().exportFixtures).toBeDefined();
    expect(schema.getQueryType()?.getFields().projects).toBeDefined();
    expect(schema.getQueryType()?.getFields().project).toBeDefined();
    expect(schema.getMutationType()?.getFields().importFixtures).toBeDefined();
    expect(schema.getMutationType()?.getFields().createProject).toBeDefined();
    expect(schema.getQueryType()?.getFields().exportProjects).toBeDefined();
    expect(schema.getMutationType()?.getFields().importProjects).toBeDefined();
    expect(schema.getMutationType()?.getFields().updateProject).toBeDefined();
    expect(schema.getMutationType()?.getFields().deleteProject).toBeDefined();
    expect(schema.getMutationType()?.getFields().addProjectFixture).toBeDefined();
    expect(schema.getMutationType()?.getFields().updateProjectFixture).toBeDefined();
    expect(schema.getMutationType()?.getFields().deleteProjectFixture).toBeDefined();

    await moduleRef.close();
  });
});
