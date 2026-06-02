import vendor from '@/fixtures/entities/vendor.entity';
import { InferInsertModel } from 'drizzle-orm';

export const vendors: InferInsertModel<typeof vendor>[] = [
  {
    externalId: 'aadb2d60-4a8e-45c3-b58a-8726861930b2',
    name: 'American DJ',
  },
  {
    externalId: '3ecfaac4-ec21-4e5e-bd23-505835b30ecc',
    name: 'eurolite',
  },
];
