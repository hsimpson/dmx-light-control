import { Inject } from '@nestjs/common';

export const DB_PROVIDER = 'DbProvider';
export const InjectDb = () => Inject(DB_PROVIDER);
