import { fixtureChannelRange } from '@/db/schema';
import { InferInsertModel } from 'drizzle-orm';

export const fixtureChannelRanges: InferInsertModel<typeof fixtureChannelRange>[] = [
  {
    publicId: '025ef59f-1e6b-4680-921c-09757ba3db46',
    fixtureChannelDefinitionId: 1,
    dmxStart: 0,
    dmxEnd: 255,
    description: 'Red, 0% to 100%',
  },
  {
    publicId: '3e5c8b63-1c70-4ee5-8894-f24b9bdf22ef',
    fixtureChannelDefinitionId: 2,
    dmxStart: 0,
    dmxEnd: 255,
    description: 'Green, 0% to 100%',
  },
  {
    publicId: '716e759f-a978-4fa9-9692-1fdd6c08883c',
    fixtureChannelDefinitionId: 3,
    dmxStart: 0,
    dmxEnd: 255,
    description: 'Blue, 0% to 100%',
  },
  {
    publicId: 'dcd9e7d9-8b7e-42bc-a902-8698d3eed7b6',
    fixtureChannelDefinitionId: 4,
    dmxStart: 0,
    dmxEnd: 255,
    description: 'UV, 0% to 100%',
  },
  {
    publicId: '495a7d51-cbdb-4f2c-871c-31e78f3d299d',
    fixtureChannelDefinitionId: 5,
    dmxStart: 0,
    dmxEnd: 31,
    description: 'LED Off',
  },
  {
    publicId: 'ca7be5f2-be62-4bf3-8b03-a67147b9e82b',
    fixtureChannelDefinitionId: 5,
    dmxStart: 32,
    dmxEnd: 63,
    description: 'LED On',
  },
  {
    publicId: '15eeb5e6-d5e0-4f8e-83da-fd824e30ebd6',
    fixtureChannelDefinitionId: 5,
    dmxStart: 64,
    dmxEnd: 95,
    description: 'Strobing, slow to fast',
  },
  {
    publicId: '99254812-cc7f-4a9a-a275-8b541452d347',
    fixtureChannelDefinitionId: 5,
    dmxStart: 96,
    dmxEnd: 127,
    description: 'LED On',
  },
  {
    publicId: '901cc894-8b66-44fb-9084-9229d33a686e',
    fixtureChannelDefinitionId: 5,
    dmxStart: 128,
    dmxEnd: 159,
    description: 'Strobe Pulse, slow to fast',
  },
  {
    publicId: '0ae1eeb6-d89c-4221-89ba-b7c649367e5d',
    fixtureChannelDefinitionId: 5,
    dmxStart: 160,
    dmxEnd: 191,
    description: 'LED On',
  },
  {
    publicId: 'ee60c8cd-c02a-4d5b-800d-a4e1c10ea26d',
    fixtureChannelDefinitionId: 5,
    dmxStart: 192,
    dmxEnd: 223,
    description: 'Random Strobe, slow to fast',
  },
  {
    publicId: 'e6cac35f-78fc-4cdd-bed0-88e8c2055d4e',
    fixtureChannelDefinitionId: 5,
    dmxStart: 224,
    dmxEnd: 255,
    description: 'LED On',
  },
];
