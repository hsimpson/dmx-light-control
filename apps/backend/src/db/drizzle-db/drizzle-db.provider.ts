import { Inject } from '@nestjs/common';

export const DRIZZLE_DB_PROVIDER = 'DrizzleDbProvider';
export const InjectDb = () => Inject(DRIZZLE_DB_PROVIDER);
