import fixtureVendor from '@/fixtures/entities/fixture-vendor.entity';
import { InferInsertModel } from 'drizzle-orm';

export const fixtureVendors: InferInsertModel<typeof fixtureVendor>[] = [
  {
    publicId: 'aadb2d60-4a8e-45c3-b58a-8726861930b2',
    name: 'American DJ',
  },
  {
    publicId: '3ecfaac4-ec21-4e5e-bd23-505835b30ecc',
    name: 'eurolite',
  },
];
