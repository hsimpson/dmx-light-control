import { DmxEvents } from '@/io/dmx/types/dmx-events';
import { MidiEvents } from '@/io/midi/types/midi.events';

// Compose all domain event maps here. Add new domain event types with &.
export type AppEvents = DmxEvents & MidiEvents;
