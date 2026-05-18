import { AppEventEmitter } from '@/events/app-event-emitter';
import { Body, Controller, Post } from '@nestjs/common';
import { SetChannelValuesDto } from './dto/dmx-set-channel-values.dto';

@Controller('dmx')
export class DmxController {
  public constructor(private readonly eventEmitter: AppEventEmitter) {}

  @Post('channel-values')
  public setChannelValues(@Body() dto: SetChannelValuesDto) {
    this.eventEmitter.emit('dmx.channelValues', dto.dmxValues);
  }
}
