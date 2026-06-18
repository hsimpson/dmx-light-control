import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, r => ({
  fixture: {
    fixtureVendor: r.one.fixtureVendor({
      from: r.fixture.vendorId,
      to: r.fixtureVendor.id,
    }),
    fixtureChannelDefinitions: r.many.fixtureChannelDefinition(),
    fixtureChannelModes: r.many.fixtureChannelMode(),
  },

  fixtureVendor: {
    fixtures: r.many.fixture(),
  },

  fixtureChannelDefinition: {
    fixture: r.one.fixture({
      from: r.fixtureChannelDefinition.fixtureId,
      to: r.fixture.id,
    }),
    fixtureChannelRanges: r.many.fixtureChannelRange(),
    fixtureChannelAssignments: r.many.fixtureChannelAssignment(),
  },

  fixtureChannelRange: {
    fixtureChannelDefinition: r.one.fixtureChannelDefinition({
      from: r.fixtureChannelRange.fixtureChannelDefinitionId,
      to: r.fixtureChannelDefinition.id,
    }),
  },

  fixtureChannelMode: {
    fixture: r.one.fixture({
      from: r.fixtureChannelMode.fixtureId,
      to: r.fixture.id,
    }),
    fixtureChannelAssignments: r.many.fixtureChannelAssignment(),
  },

  fixtureChannelAssignment: {
    fixtureChannelDefinition: r.one.fixtureChannelDefinition({
      from: r.fixtureChannelAssignment.fixtureChannelDefinitionId,
      to: r.fixtureChannelDefinition.id,
    }),
    fixtureChannelMode: r.one.fixtureChannelMode({
      from: r.fixtureChannelAssignment.fixtureChannelModeId,
      to: r.fixtureChannelMode.id,
    }),
  },
}));
