import { DmxEvents } from '@/io/dmx/types/dmx-events';
import { MidiEvents } from '@/io/midi/types/midi.events';
import { FunctionEvents } from '@/events/types/function-events';
import { ProjectEvents } from '@/events/types/project-events';
import { MidiMappingEvents } from '@/midi-mappings/midi-mapping.events';
import { VirtualConsoleEvents } from '@/io/virtual-console-playback/virtual-console-events';

// Compose all domain event maps here. Add new domain event types with &.
export type AppEvents = DmxEvents &
  MidiEvents &
  FunctionEvents &
  ProjectEvents &
  VirtualConsoleEvents &
  MidiMappingEvents;
