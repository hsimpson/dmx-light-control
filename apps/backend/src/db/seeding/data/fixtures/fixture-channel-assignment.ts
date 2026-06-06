import fixtureChannelAssignment from '@/fixtures/entities/fixture-channel-assignment.entity';
import { InferInsertModel } from 'drizzle-orm';

export const fixtureChannelAssignments: InferInsertModel<typeof fixtureChannelAssignment>[] = [
  {
    publicId: '5318dd3e-8ed7-4647-8af5-a4da7ef50f24',
    fixtureChannelModeId: 1,
    fixtureChannelDefinitionId: 1,
    channelNumber: 1,
  },
  {
    publicId: '49b5a701-0c61-480f-b3c3-10a4565cb4f0',
    fixtureChannelModeId: 1,
    fixtureChannelDefinitionId: 2,
    channelNumber: 2,
  },
  {
    publicId: 'bb639029-fbe6-4dd6-87bc-2037f29f5481',
    fixtureChannelModeId: 1,
    fixtureChannelDefinitionId: 2,
    channelNumber: 3,
  },
  {
    publicId: '663627c2-926a-4dda-aef9-d3fb0d6fb17a',
    fixtureChannelModeId: 1,
    fixtureChannelDefinitionId: 4,
    channelNumber: 4,
  },
  {
    publicId: '4c382241-fc3b-4f45-b5d6-ad9013ffc4b3',
    fixtureChannelModeId: 2,
    fixtureChannelDefinitionId: 1,
    channelNumber: 1,
  },
  {
    publicId: '1ccf28c7-8062-4221-b6ba-5f027219ad56',
    fixtureChannelModeId: 2,
    fixtureChannelDefinitionId: 2,
    channelNumber: 2,
  },
  {
    publicId: 'f29c5b93-a7a3-4626-a51e-a6adcaf6b94a',
    fixtureChannelModeId: 2,
    fixtureChannelDefinitionId: 3,
    channelNumber: 3,
  },
  {
    publicId: 'ed433303-19b9-4b91-9b5a-597a6b5cbffe',
    fixtureChannelModeId: 2,
    fixtureChannelDefinitionId: 4,
    channelNumber: 4,
  },
  {
    publicId: '08433dd7-df48-422d-80ab-c0d40e04af7c',
    fixtureChannelModeId: 2,
    fixtureChannelDefinitionId: 6,
    channelNumber: 5,
  },
  {
    publicId: 'ed73c78d-ceae-4e24-bb3c-55cba6c33c0a',
    fixtureChannelModeId: 3,
    fixtureChannelDefinitionId: 1,
    channelNumber: 1,
  },
  {
    publicId: 'f61c7ba8-1bd7-4d20-bd90-b65cfc4978cd',
    fixtureChannelModeId: 3,
    fixtureChannelDefinitionId: 2,
    channelNumber: 2,
  },
  {
    publicId: '0144f83d-53d7-4ea8-83b7-7f50569d757f',
    fixtureChannelModeId: 3,
    fixtureChannelDefinitionId: 3,
    channelNumber: 3,
  },
  {
    publicId: 'a7509c8a-b6fc-4928-85db-33d1a5645119',
    fixtureChannelModeId: 3,
    fixtureChannelDefinitionId: 4,
    channelNumber: 4,
  },
  {
    publicId: '4b42fa39-9acb-4769-b411-36f356bdcb5f',
    fixtureChannelModeId: 3,
    fixtureChannelDefinitionId: 5,
    channelNumber: 5,
  },
  {
    publicId: 'ef13913e-02de-4417-8597-21b4e9defc1c',
    fixtureChannelModeId: 3,
    fixtureChannelDefinitionId: 6,
    channelNumber: 6,
  },
];
