import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { DmxSnifferService } from './dmx-sniffer.service';

@Command({
  name: 'dmx-sniffer',
  description: 'Starts the DMX sniffer to monitor DMX data frames.',
})
export class DmxSnifferCommand extends CommandRunner {
  private readonly logger = new Logger(DmxSnifferCommand.name);

  public constructor(private readonly dmxSnifferService: DmxSnifferService) {
    super();
  }

  @Option({
    flags: '-b, --bus <bus>',
    description: 'Specify the bus number of the USB device to monitor',
  })
  public parseBus(val: string) {
    return Number(val);
  }

  @Option({
    flags: '-a, --address <address>',
    description: 'Specify the address of the USB device to monitor',
  })
  public parseAddress(val: string) {
    return Number(val);
  }

  public override async run(
    passedParams: string[],
    options: Record<string, string | boolean | number>,
  ): Promise<void> {
    // this command should only be available on linux
    if (process.platform !== 'linux') {
      this.logger.error('The dmx-sniffer command is only supported on Linux.');
      return;
    }

    this.logger.log(
      `dmx-sniffer command executed with params: ${passedParams.join(' ')} and options: ${JSON.stringify(options)}`,
    );

    if (!options.bus || !options.address) {
      this.logger.error(
        'Both --bus and --address options are required to start the DMX sniffer.',
      );
      return;
    }

    await this.dmxSnifferService.startSniffer(
      Number(options.bus),
      Number(options.address),
    );

    return Promise.resolve();
  }
}
