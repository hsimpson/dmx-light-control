import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DmxModule } from './io/dmx/dmx.module';

@Module({
  imports: [DmxModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
