import { setupCatalogFixture, type CatalogFixture } from './catalog-fixture';
import { DRIZZLE_DB_PROVIDER } from '@/db/drizzle-db/drizzle-db.provider';
import { relations } from '@/db/relations';
import * as schema from '@/db/schema';
import { FixtureChannelPreset } from '@/fixtures/channel-presets';
import { FixtureRepository } from '@/fixtures/repositories/fixture.repository';
import { createE2eApp } from '@/testhelpers/e2e-app';
import { graphqlQuery } from '@/testhelpers/graphql-test-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
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

type CreateFixtureMutation = {
  createFixture: {
    name: string;
    publicId: string;
    fixtureVendor: {
      name: string;
      publicId: string;
    };
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

describe('Fixture mutations', () => {
  let app: NestFastifyApplication;
  let catalog: CatalogFixture;

  beforeAll(async () => {
    app = await createE2eApp();

    catalog = await setupCatalogFixture(app.getHttpAdapter().getInstance().server, {
      fixtureName: 'E2E Mutations Catalog Par',
    });
  });

  afterAll(async () => {
    await app.close();
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

  it('should create a fixture via createFixture with a new vendor', async () => {
    const mutation = gql`
      mutation ($input: CreateFixtureInput!) {
        createFixture(input: $input) {
          name
          publicId
          fixtureVendor {
            name
            publicId
          }
        }
      }
    `;

    const body = await graphqlQuery<CreateFixtureMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          name: 'E2E Created Fixture',
          vendor: { name: 'E2E Auto Vendor' },
        },
      },
    });

    expect(body.data?.createFixture.name).toBe('E2E Created Fixture');
    expect(body.data?.createFixture.publicId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(body.data?.createFixture.fixtureVendor.name).toBe('E2E Auto Vendor');
  });

  it('should create a fixture via createFixture reusing an existing vendor publicId', async () => {
    const vendorMutation = gql`
      mutation ($input: CreateFixtureVendorInput!) {
        createFixtureVendor(input: $input) {
          publicId
        }
      }
    `;

    const vendorBody = await graphqlQuery<CreateFixtureVendorMutation>(
      app.getHttpAdapter().getInstance().server,
      vendorMutation,
      {
        variables: {
          input: {
            name: 'E2E Reuse Vendor',
          },
        },
      },
    );
    const vendorPublicId = vendorBody.data?.createFixtureVendor.publicId;
    expect(vendorPublicId).toBeDefined();

    const mutation = gql`
      mutation ($input: CreateFixtureInput!) {
        createFixture(input: $input) {
          name
          publicId
          fixtureVendor {
            publicId
          }
        }
      }
    `;

    const body = await graphqlQuery<CreateFixtureMutation>(app.getHttpAdapter().getInstance().server, mutation, {
      variables: {
        input: {
          name: 'E2E Reuse Fixture',
          vendor: { publicId: vendorPublicId },
        },
      },
    });

    expect(body.data?.createFixture.fixtureVendor.publicId).toBe(vendorPublicId);
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
          publicId: catalog.fixturePublicId,
          name: 'Mega TriPar Profile Plus (E2E)',
        },
      },
    });

    expect(body.data?.updateFixture.publicId).toBe(catalog.fixturePublicId);
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
      variables: { publicId: catalog.fixturePublicId },
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
            publicId: catalog.fixturePublicId,
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
            publicId: catalog.fixturePublicId,
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
          publicId: catalog.fixturePublicId,
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
      variables: { publicId: catalog.fixturePublicId },
    });
    const definitions = loaded.data?.fixture?.fixtureChannelDefinitions ?? [];
    const target = definitions.find(definition => definition.publicId === catalog.redDefinitionPublicId);
    const sibling = definitions.find(definition => definition.publicId === catalog.greenDefinitionPublicId);
    if (!target || !sibling) {
      throw new Error('Seed fixture is missing Red/Green channel definitions');
    }
    const originalName = target.name;
    const renamed = `${originalName} (E2E)`;

    try {
      const body = await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_DEFINITIONS, {
        variables: {
          input: {
            publicId: catalog.fixturePublicId,
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
            publicId: catalog.fixturePublicId,
            channelDefinitions: [{ publicId: target.publicId, name: originalName }],
          },
        },
      });
    }
  });

  it('should reject renaming a channel definition to a sibling name', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const loaded = await graphqlQuery<FixtureChannelDefinitionsQuery>(server, GET_FIXTURE_CHANNEL_DEFINITIONS, {
      variables: { publicId: catalog.fixturePublicId },
    });
    const definitions = loaded.data?.fixture?.fixtureChannelDefinitions ?? [];
    const target = definitions.find(definition => definition.publicId === catalog.redDefinitionPublicId);
    const sibling = definitions.find(definition => definition.publicId === catalog.greenDefinitionPublicId);
    if (!target || !sibling) {
      throw new Error('Seed fixture is missing Red/Green channel definitions');
    }

    const body = await graphqlQuery<UpdateFixtureMutation>(server, UPDATE_FIXTURE_DEFINITIONS, {
      variables: {
        input: {
          publicId: catalog.fixturePublicId,
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
            publicId: catalog.fixturePublicId,
            channelDefinitions: [{ publicId: unknownId, name: 'Does not exist' }],
          },
        },
      },
    );

    expect(body.data?.updateFixture).toBeUndefined();
    expect(body.errors?.[0]?.message).toContain(unknownId);
  });

  it('should update a channel range in place and preserve its publicId via updateFixture', async () => {
    const server = app.getHttpAdapter().getInstance().server;
    const redRangePublicId = catalog.redRangePublicId;
    const updatedDescription = 'Red, 0% to 100% (E2E)';
    const originalDescription = 'Red, 0% to 100%';

    const loaded = await graphqlQuery<{
      fixture: {
        fixtureChannelDefinitions: {
          publicId: string;
          name: string;
          fixtureChannelRanges: { publicId: string; dmxStart: number; dmxEnd: number; description: string }[];
        }[];
      } | null;
    }>(
      server,
      gql`
        query ($publicId: UUID!) {
          fixture(publicId: $publicId) {
            fixtureChannelDefinitions {
              publicId
              name
              fixtureChannelRanges {
                publicId
                dmxStart
                dmxEnd
                description
              }
            }
          }
        }
      `,
      { variables: { publicId: catalog.fixturePublicId } },
    );

    const redDefinition = loaded.data?.fixture?.fixtureChannelDefinitions.find(
      definition => definition.publicId === catalog.redDefinitionPublicId,
    );
    const redRange = redDefinition?.fixtureChannelRanges.find(range => range.publicId === redRangePublicId);
    if (!redDefinition || !redRange) {
      throw new Error('Seed fixture is missing Red channel range');
    }

    try {
      const body = await graphqlQuery<{
        updateFixture: {
          fixtureChannelDefinitions: {
            publicId: string;
            fixtureChannelRanges: { publicId: string; description: string }[];
          }[];
        };
      }>(
        server,
        gql`
          mutation ($input: UpdateFixtureInput!) {
            updateFixture(input: $input) {
              fixtureChannelDefinitions {
                publicId
                fixtureChannelRanges {
                  publicId
                  description
                }
              }
            }
          }
        `,
        {
          variables: {
            input: {
              publicId: catalog.fixturePublicId,
              channelDefinitions: [
                {
                  publicId: redDefinition.publicId,
                  name: redDefinition.name,
                  ranges: [
                    {
                      publicId: redRange.publicId,
                      dmxStart: redRange.dmxStart,
                      dmxEnd: redRange.dmxEnd,
                      description: updatedDescription,
                    },
                  ],
                },
              ],
            },
          },
        },
      );

      expect(body.errors).toBeUndefined();
      const updatedDefinition = body.data?.updateFixture.fixtureChannelDefinitions.find(
        definition => definition.publicId === redDefinition.publicId,
      );
      const updatedRange = updatedDefinition?.fixtureChannelRanges.find(range => range.publicId === redRangePublicId);
      expect(updatedRange?.description).toBe(updatedDescription);
    } finally {
      await graphqlQuery(server, UPDATE_FIXTURE_DEFINITIONS, {
        variables: {
          input: {
            publicId: catalog.fixturePublicId,
            channelDefinitions: [
              {
                publicId: redDefinition.publicId,
                name: redDefinition.name,
                ranges: [
                  {
                    publicId: redRange.publicId,
                    dmxStart: redRange.dmxStart,
                    dmxEnd: redRange.dmxEnd,
                    description: originalDescription,
                  },
                ],
              },
            ],
          },
        },
      });
    }
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
    const db = app.get<NodePgDatabase<typeof relations>>(DRIZZLE_DB_PROVIDER);
    const [americanDjVendor] = await db
      .select()
      .from(schema.fixtureVendor)
      .where(eq(schema.fixtureVendor.publicId, catalog.vendorPublicId));
    if (!americanDjVendor?.id) {
      throw new Error('Expected American DJ vendor in imported fixture catalog');
    }

    const created = await app.get(FixtureRepository).createOne({
      name: 'Fixture To Delete',
      vendorId: americanDjVendor.id,
    });
    const publicId = created?.publicId;
    const fixtureId = created?.id;
    if (typeof publicId !== 'string' || typeof fixtureId !== 'number') {
      throw new Error('Failed to create fixture for delete e2e');
    }

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

    const [vendor] = await db
      .select()
      .from(schema.fixtureVendor)
      .where(eq(schema.fixtureVendor.publicId, catalog.vendorPublicId));
    expect(vendor).toBeDefined();
  });
});
