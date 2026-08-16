import { AppModule } from '@/app.module';
import { DRIZZLE_DB_PROVIDER } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { fixtureChannelDefinitions } from '@/db/seeding/data/fixtures/fixture-channel-definitions';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { SerialSendService } from '@/io/serial/serial-send.service';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { SEED_FIXTURE_PUBLIC_ID } from '@/testhelpers/seed-fixture-data';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type CreateFixtureVendorMutation = {
  createFixtureVendor: {
    name: string;
    publicId: string;
  };
};

type UpdateFixtureMutation = {
  updateFixture: {
    name: string;
    publicId: string;
    fixtureChannelDefinitions: {
      name: string;
      publicId: string;
    }[];
    fixtureChannelModes: {
      name: string;
      order: number;
      publicId: string;
      fixtureChannelAssignments: {
        channelNumber: number;
        fixtureChannelDefinition: {
          publicId: string;
        };
      }[];
    }[];
  };
};

type DeleteFixtureVendorMutation = {
  deleteFixtureVendor: {
    deleted: boolean;
    publicId: string;
  };
};

type DeleteFixtureMutation = {
  deleteFixture: {
    deleted: boolean;
    publicId: string;
  };
};

type GetFixtureQuery = {
  fixture: {
    publicId: string;
  } | null;
};

type FixtureChannelModesQuery = {
  fixture: {
    fixtureChannelDefinitions: { publicId: string }[];
    fixtureChannelModes: UpdateFixtureMutation['updateFixture']['fixtureChannelModes'];
  } | null;
};

type FixtureChannelDefinitionsQuery = {
  fixture: {
    fixtureChannelDefinitions: { publicId: string; name: string }[];
  } | null;
};

const SEED_CHANNEL_DEFINITION_RED_PUBLIC_ID = fixtureChannelDefinitions[0]?.publicId;
const SEED_CHANNEL_DEFINITION_GREEN_PUBLIC_ID = fixtureChannelDefinitions[1]?.publicId;

type ChannelModeInput = {
  publicId?: string;
  name: string;
  assignments: { channelDefinitionPublicId: string }[];
};

const UPDATE_FIXTURE_WITH_MODES = gql`
  mutation ($input: UpdateFixtureInput!) {
    updateFixture(input: $input) {
      name
      publicId
      fixtureChannelModes {
        name
        order
        publicId
        fixtureChannelAssignments {
          channelNumber
          fixtureChannelDefinition {
            publicId
          }
        }
      }
    }
  }
`;

const UPDATE_FIXTURE_DEFINITIONS = gql`
  mutation ($input: UpdateFixtureInput!) {
    updateFixture(input: $input) {
      publicId
      fixtureChannelDefinitions {
        publicId
        name
      }
    }
  }
`;

const GET_FIXTURE_CHANNEL_DEFINITIONS = gql`
  query ($publicId: UUID!) {
    fixture(publicId: $publicId) {
      fixtureChannelDefinitions {
        publicId
        name
      }
    }
  }
`;

const GET_FIXTURE_CHANNEL_MODES = gql`
  query ($publicId: UUID!) {
    fixture(publicId: $publicId) {
      fixtureChannelDefinitions {
        publicId
      }
      fixtureChannelModes {
        name
        order
        publicId
        fixtureChannelAssignments {
          channelNumber
          fixtureChannelDefinition {
            publicId
          }
        }
      }
    }
  }
`;

function toChannelModeInputs(modes: UpdateFixtureMutation['updateFixture']['fixtureChannelModes']): ChannelModeInput[] {
  return [...modes]
    .sort((a, b) => a.order - b.order)
    .map(mode => ({
      publicId: mode.publicId,
      name: mode.name,
      assignments: [...mode.fixtureChannelAssignments]
        .sort((a, b) => a.channelNumber - b.channelNumber)
        .map(assignment => ({
          channelDefinitionPublicId: assignment.fixtureChannelDefinition.publicId,
        })),
    }));
}

const ORIGINAL_ENV = process.env;

describe('Fixture mutations', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      BACKEND_PORT: '3000',
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_HOST: 'h',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'db',
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SerialSendService)
      .useValue({
        onModuleInit: () => undefined,
        onModuleDestroy: () => undefined,
      })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    process.env = ORIGINAL_ENV;
  });

  it('should create a fixture vendor via createFixtureVendor', async () => {
    const mutation = gql`
      mutation ($input: CreateFixtureVendorInput!) {
        createFixtureVendor(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<CreateFixtureVendorMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          name: 'E2E Fixture Vendor',
        },
      },
    });

    expect(body.data?.createFixtureVendor.name).toBe('E2E Fixture Vendor');
    expect(body.data?.createFixtureVendor.publicId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should update a fixture via updateFixture', async () => {
    const mutation = gql`
      mutation ($input: UpdateFixtureInput!) {
        updateFixture(input: $input) {
          name
          publicId
        }
      }
    `;

    const body = await graphqlQuery<UpdateFixtureMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          publicId: SEED_FIXTURE_PUBLIC_ID,
          name: 'Mega TriPar Profile Plus (E2E)',
        },
      },
    });

    expect(body.data?.updateFixture.publicId).toBe(SEED_FIXTURE_PUBLIC_ID);
    expect(body.data?.updateFixture.name).toBe('Mega TriPar Profile Plus (E2E)');
  });

  it('should delete a fixture vendor via deleteFixtureVendor', async () => {
    const createMutation = gql`
      mutation ($input: CreateFixtureVendorInput!) {
        createFixtureVendor(input: $input) {
          publicId
        }
      }
    `;

    const createBody = await graphqlQuery<CreateFixtureVendorMutation>(
      app.getHttpAdapter().getInstance().server,
      createMutation,
      {
        variables: {
          input: {
            name: 'Vendor To Delete',
          },
        },
      },
    );

    const publicId = createBody.data?.createFixtureVendor.publicId;
    expect(publicId).toBeDefined();

    const mutation = gql`
      mutation ($publicId: UUID!) {
        deleteFixtureVendor(publicId: $publicId) {
          deleted
          publicId
        }
      }
    `;

    const body = await graphqlQuery<DeleteFixtureVendorMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId,
      },
    });

    expect(body.data?.deleteFixtureVendor.publicId).toBe(publicId);
    expect(body.data?.deleteFixtureVendor.deleted).toBe(true);
  });

  it('should add, reorder, replace assignments, and remove channel modes via updateFixture', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const loaded = await graphqlQuery<FixtureChannelModesQuery>(server, GET_FIXTURE_CHANNEL_MODES, {
      variables: { publicId: SEED_FIXTURE_PUBLIC_ID },
    });
    const fixture = loaded.data?.fixture;
    expect(fixture).toBeDefined();
    const original = toChannelModeInputs(fixture?.fixtureChannelModes ?? []);
    const definitionPublicId = fixture?.fixtureChannelDefinitions[0]?.publicId;
    if (!definitionPublicId) {
      throw new Error('Seed fixture is missing channel definitions');
    }

    const updateModes = async (channelModes: ChannelModeInput[]) => {
      const body = await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_WITH_MODES, {
        variables: {
          input: {
            publicId: SEED_FIXTURE_PUBLIC_ID,
            channelModes,
          },
        },
      });
      expect(body.errors).toBeUndefined();
      expect(body.data?.updateFixture).toBeDefined();
      return body.data?.updateFixture;
    };

    try {
      const withNew = await updateModes([...original, { name: 'E2E extra mode', assignments: [] }]);
      const extra = withNew?.fixtureChannelModes.find(mode => mode.name === 'E2E extra mode');
      expect(extra).toBeDefined();
      expect(extra?.order).toBe(original.length);
      expect(extra?.fixtureChannelAssignments).toEqual([]);

      const extraInput: ChannelModeInput = {
        publicId: extra?.publicId,
        name: 'E2E extra mode',
        assignments: [],
      };
      const reordered = await updateModes([extraInput, ...original]);
      const reorderedByOrder = [...(reordered?.fixtureChannelModes ?? [])].sort((a, b) => a.order - b.order);
      expect(reorderedByOrder[0]?.name).toBe('E2E extra mode');

      const withAssignment = await updateModes([
        {
          ...extraInput,
          publicId: extra?.publicId,
          assignments: [{ channelDefinitionPublicId: definitionPublicId }],
        },
        ...original,
      ]);
      const extraWithAssignment = withAssignment?.fixtureChannelModes.find(mode => mode.publicId === extra?.publicId);
      expect(extraWithAssignment?.fixtureChannelAssignments).toHaveLength(1);
      expect(extraWithAssignment?.fixtureChannelAssignments[0]?.channelNumber).toBe(1);
      expect(extraWithAssignment?.fixtureChannelAssignments[0]?.fixtureChannelDefinition.publicId).toBe(
        definitionPublicId,
      );

      const restored = await updateModes(original);
      expect(restored?.fixtureChannelModes.some(mode => mode.name === 'E2E extra mode')).toBe(false);
      expect(restored?.fixtureChannelModes).toHaveLength(original.length);
    } finally {
      await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_WITH_MODES, {
        variables: {
          input: {
            publicId: SEED_FIXTURE_PUBLIC_ID,
            channelModes: original,
          },
        },
      });
    }
  });

  it('should reject unknown channel definitions when replacing channel modes', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const body = await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_WITH_MODES, {
      variables: {
        input: {
          publicId: SEED_FIXTURE_PUBLIC_ID,
          channelModes: [
            {
              name: 'invalid mode',
              assignments: [{ channelDefinitionPublicId: '00000000-0000-4000-8000-000000000000' }],
            },
          ],
        },
      },
    });

    expect(body.data?.updateFixture).toBeUndefined();
    expect(body.errors?.[0]?.message).toContain('00000000-0000-4000-8000-000000000000');
  });

  it('should rename a fixture channel definition via updateFixture', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const loaded = await graphqlQuery<FixtureChannelDefinitionsQuery>(server, GET_FIXTURE_CHANNEL_DEFINITIONS, {
      variables: { publicId: SEED_FIXTURE_PUBLIC_ID },
    });
    const definitions = loaded.data?.fixture?.fixtureChannelDefinitions ?? [];
    const target = definitions.find(definition => definition.publicId === SEED_CHANNEL_DEFINITION_RED_PUBLIC_ID);
    const sibling = definitions.find(definition => definition.publicId === SEED_CHANNEL_DEFINITION_GREEN_PUBLIC_ID);
    if (!target || !sibling) {
      throw new Error('Seed fixture is missing Red/Green channel definitions');
    }
    const originalName = target.name;
    const renamed = `${originalName} (E2E)`;

    try {
      const body = await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_DEFINITIONS, {
        variables: {
          input: {
            publicId: SEED_FIXTURE_PUBLIC_ID,
            channelDefinitions: [{ publicId: target.publicId, name: renamed }],
          },
        },
      });

      expect(body.errors).toBeUndefined();
      const updated = body.data?.updateFixture.fixtureChannelDefinitions.find(
        definition => definition.publicId === target.publicId,
      );
      expect(updated?.name).toBe(renamed);
    } finally {
      await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_DEFINITIONS, {
        variables: {
          input: {
            publicId: SEED_FIXTURE_PUBLIC_ID,
            channelDefinitions: [{ publicId: target.publicId, name: originalName }],
          },
        },
      });
    }
  });

  it('should reject renaming a channel definition to a sibling name', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const loaded = await graphqlQuery<FixtureChannelDefinitionsQuery>(server, GET_FIXTURE_CHANNEL_DEFINITIONS, {
      variables: { publicId: SEED_FIXTURE_PUBLIC_ID },
    });
    const definitions = loaded.data?.fixture?.fixtureChannelDefinitions ?? [];
    const target = definitions.find(definition => definition.publicId === SEED_CHANNEL_DEFINITION_RED_PUBLIC_ID);
    const sibling = definitions.find(definition => definition.publicId === SEED_CHANNEL_DEFINITION_GREEN_PUBLIC_ID);
    if (!target || !sibling) {
      throw new Error('Seed fixture is missing Red/Green channel definitions');
    }

    const body = await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_DEFINITIONS, {
      variables: {
        input: {
          publicId: SEED_FIXTURE_PUBLIC_ID,
          channelDefinitions: [{ publicId: target.publicId, name: sibling.name }],
        },
      },
    });

    expect(body.data?.updateFixture).toBeUndefined();
    expect(body.errors?.[0]?.message).toContain(sibling.name);
  });

  it('should reject renaming an unknown channel definition', async () => {
    const unknownId = '00000000-0000-4000-8000-000000000000';
    const body = await graphqlQuery<UpdateFixtureMutation>(
      app.getHttpAdapter().getInstance().server,
      UPDATE_FIXTURE_DEFINITIONS,
      {
        variables: {
          input: {
            publicId: SEED_FIXTURE_PUBLIC_ID,
            channelDefinitions: [{ publicId: unknownId, name: 'Does not exist' }],
          },
        },
      },
    );

    expect(body.data?.updateFixture).toBeUndefined();
    expect(body.errors?.[0]?.message).toContain(unknownId);
  });

  it('should return deleted false when deleteFixture publicId does not exist', async () => {
    const unknownId = '00000000-0000-4000-8000-000000000001';
    const mutation = gql`
      mutation ($publicId: UUID!) {
        deleteFixture(publicId: $publicId) {
          deleted
          publicId
        }
      }
    `;

    const body = await graphqlQuery<DeleteFixtureMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId: unknownId,
      },
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteFixture.publicId).toBe(unknownId);
    expect(body.data?.deleteFixture.deleted).toBe(false);
  });

  it('should delete a fixture via deleteFixture', async () => {
    const created = await app.get(FixtureRepository).createOne({
      name: 'Fixture To Delete',
      vendorId: 1,
    });
    const publicId = created?.publicId;
    const fixtureId = created?.id;
    if (typeof publicId !== 'string' || typeof fixtureId !== 'number') {
      throw new Error('Failed to create fixture for delete e2e');
    }

    const db = app.get<NodePgDatabase<typeof relations>>(DRIZZLE_DB_PROVIDER);
    const [definition] = await db
      .insert(schema.fixtureChannelDefinition)
      .values({
        fixtureId,
        name: 'Dimmer',
        order: 0,
        preset: FixtureChannelPreset.Custom,
      })
      .returning();
    const [range] = await db
      .insert(schema.fixtureChannelRange)
      .values({
        fixtureChannelDefinitionId: definition?.id ?? 0,
        dmxStart: 0,
        dmxEnd: 255,
        description: 'Full',
      })
      .returning();
    const [mode] = await db
      .insert(schema.fixtureChannelMode)
      .values({
        fixtureId,
        name: '1ch',
        order: 0,
      })
      .returning();
    const [assignment] = await db
      .insert(schema.fixtureChannelAssignment)
      .values({
        fixtureChannelModeId: mode?.id ?? 0,
        fixtureChannelDefinitionId: definition?.id ?? 0,
        channelNumber: 1,
      })
      .returning();

    expect(definition?.publicId).toBeDefined();
    expect(range?.publicId).toBeDefined();
    expect(mode?.publicId).toBeDefined();
    expect(assignment?.publicId).toBeDefined();

    const mutation = gql`
      mutation ($publicId: UUID!) {
        deleteFixture(publicId: $publicId) {
          deleted
          publicId
        }
      }
    `;

    const body = await graphqlQuery<DeleteFixtureMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        publicId,
      },
    });

    expect(body.data?.deleteFixture.publicId).toBe(publicId);
    expect(body.data?.deleteFixture.deleted).toBe(true);

    const loaded = await graphqlQuery<GetFixtureQuery>(
      app.getHttpAdapter().getInstance().server,
      gql`
        query ($publicId: UUID!) {
          fixture(publicId: $publicId) {
            publicId
          }
        }
      `,
      { variables: { publicId } },
    );
    expect(loaded.data?.fixture).toBeNull();

    expect(
      await db
        .select()
        .from(schema.fixtureChannelDefinition)
        .where(eq(schema.fixtureChannelDefinition.publicId, definition?.publicId ?? '')),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.fixtureChannelRange)
        .where(eq(schema.fixtureChannelRange.publicId, range?.publicId ?? '')),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.fixtureChannelMode)
        .where(eq(schema.fixtureChannelMode.publicId, mode?.publicId ?? '')),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.fixtureChannelAssignment)
        .where(eq(schema.fixtureChannelAssignment.publicId, assignment?.publicId ?? '')),
    ).toEqual([]);

    const [vendor] = await db.select().from(schema.fixtureVendor).where(eq(schema.fixtureVendor.id, 1));
    expect(vendor).toBeDefined();
  });
});
