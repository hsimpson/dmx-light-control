import { DmxValue } from './dmx.types';

export type DmxEvents = {
  /** Already applied to the universe. Listeners broadcast or transmit these deltas. */
  'dmx.channelValues': DmxValue[];
  /** Request to write the manual layer. DmxSendService applies this and emits dmx.channelValues. */
  'dmx.manualValues': DmxValue[];
};
