import { Logger } from '@nestjs/common';
import { LogWriter } from 'drizzle-orm/logger';

export class DrizzleLogWriter implements LogWriter {
  private logger = new Logger('DRIZZLE');

  public write(message: string) {
    this.logger.debug(message);
  }
}
