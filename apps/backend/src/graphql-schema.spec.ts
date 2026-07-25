import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppEventEmitter } from './events/app-event-emitter';
import { FixtureResolver } from './fixtures/fixture.resolver';
import { FixtureService } from './fixtures/fixture.service';
import { DmxResolver } from './io/dmx/dmx.resolver';
import { MidiResolver } from './io/midi/midi.resolver';
import { MidiService } from './io/midi/midi.service';

describe('GraphQL schema generation', () => {
  it('builds the schema, executing all @Query/@Mutation type-thunks', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        FixtureResolver,
        DmxResolver,
        MidiResolver,
        { provide: FixtureService, useValue: {} },
        { provide: AppEventEmitter, useValue: {} },
        { provide: MidiService, useValue: {} },
      ],
    }).compile();

    const factory = moduleRef.get(GraphQLSchemaFactory);
    const schema = await factory.create([FixtureResolver, DmxResolver, MidiResolver]);

    expect(schema).toBeDefined();
    expect(schema.getQueryType()).not.toBeNull();
    expect(schema.getMutationType()).not.toBeNull();

    await moduleRef.close();
  });
});
