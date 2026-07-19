import { describe, it, expect } from 'vitest';
import { OpenPortsInput } from './open-ports.dto';

describe('OpenPortsInput', () => {
  it('instantiates with undefined ports (GraphQL defaultValue only, no runtime initializer)', () => {
    const i = new OpenPortsInput();
    expect(i.inputPort).toBeUndefined();
    expect(i.outputPort).toBeUndefined();
    i.inputPort = 1;
    i.outputPort = 1;
    expect(i.inputPort).toBe(1);
    expect(i.outputPort).toBe(1);
  });
});
