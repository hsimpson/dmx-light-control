import { AppEventEmitter } from '@/events/app-event-emitter';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ChannelValuesInput } from './dto/dmx-set-channel-values.dto';
import { DmxUniverseService } from './dmx-universe.service';

@Resolver()
export class DmxResolver {
  public constructor(
    private readonly eventEmitter: AppEventEmitter,
    private readonly universe: DmxUniverseService,
  ) {}

  @Mutation(() => String, {
    name: 'setChannelValues',
    description: 'Set DMX channel values',
  })
  public setChannelValues(
    @Args('channelValues', { type: () => ChannelValuesInput })
    dto: ChannelValuesInput,
  ): string {
    const applied = this.universe.apply(dto.dmxValues);
    this.eventEmitter.emit('dmx.channelValues', applied);
    return 'DMX channel values set successfully';
  }
}
