import { Body, Controller, Post } from '@nestjs/common';
import { DmxSendService } from './dmx-send.service';
import { SetChannelValuesDto } from './dto/dmx-set-channel-values.dto';

@Controller('dmx')
export class DmxController {
  public constructor(private readonly dmxSendService: DmxSendService) {}

  @Post('channel-values')
  public async setChannelValues(
    @Body() dto: SetChannelValuesDto,
  ): Promise<void> {
    this.dmxSendService.setChannelValues(dto.dmxValues);
    if (!this.dmxSendService.isSending()) {
      await this.dmxSendService.startSending();
    }
  }
}
