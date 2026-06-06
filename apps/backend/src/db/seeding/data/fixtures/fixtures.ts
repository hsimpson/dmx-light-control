import { fixture } from '@/db/schema';
import { InferInsertModel } from 'drizzle-orm';

export const fixtures: InferInsertModel<typeof fixture>[] = [
  {
    publicId: 'aadb2d60-4a8e-45c3-b58a-8726861930b1',
    name: 'Mega TriPar Profile Plus',
    vendorId: 1,
  },
];
