import { AppEventEmitter } from '@/events/app-event-emitter';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ChannelValuesInput } from './dto/dmx-set-channel-values.dto';

@Resolver()
export class DmxResolver {
  public constructor(private readonly eventEmitter: AppEventEmitter) {}

  @Mutation(() => String, {
    name: 'setChannelValues',
    description: 'Set DMX channel values',
  })
  public setChannelValues(
    @Args('channelValues', { type: () => ChannelValuesInput })
    dto: ChannelValuesInput,
  ): string {
    this.eventEmitter.emit('dmx.channelValues', dto.dmxValues);
    return 'DMX channel values set successfully';
  }
}
