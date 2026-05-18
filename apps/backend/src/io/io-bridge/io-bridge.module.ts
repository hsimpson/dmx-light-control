import { EventsModule } from '@/events/events.module';
import { Module } from '@nestjs/common';
import { IoBridgeService } from './io-bridge.service';

@Module({
  imports: [EventsModule],
  providers: [IoBridgeService],
})
export class IoBridgeModule {}
