import vendor from '@/fixtures/entities/vendor.entity';
import { InferInsertModel } from 'drizzle-orm';

export const vendors: InferInsertModel<typeof vendor>[] = [
  {
    externalId: 'aadb2d60-4a8e-45c3-b58a-8726861930b2',
    name: 'American DJ',
  },
];
