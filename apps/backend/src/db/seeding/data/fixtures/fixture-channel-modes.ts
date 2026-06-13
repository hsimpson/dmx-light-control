import { fixtureChannelMode } from '@/db/schema';
import { InferInsertModel } from 'drizzle-orm/table';

export const fixtureChannelModes: InferInsertModel<typeof fixtureChannelMode>[] = [
  {
    publicId: '2c93eb61-16c1-4b1a-98aa-8e74fcbb64c9',
    name: '4 channel mode',
    order: 0,
    fixtureId: 1,
  },
  {
    publicId: 'e2c01c77-7e9f-46ce-bc11-26038d5b1774',
    name: '5 channel mode',
    order: 1,
    fixtureId: 1,
  },
  {
    publicId: 'db9d23b5-bed0-48e9-b4eb-16ee0b11df0e',
    name: '6 channel mode',
    order: 2,
    fixtureId: 1,
  },
  {
    publicId: 'b92d01df-85bc-46e2-8b44-c238a8b4f767',
    name: '9 channel mode',
    order: 3,
    fixtureId: 1,
  },
  {
    publicId: 'ff15eb13-055b-4a12-bafe-41af9a7e3d44',
    name: '10 channel mode',
    order: 4,
    fixtureId: 1,
  },
];
