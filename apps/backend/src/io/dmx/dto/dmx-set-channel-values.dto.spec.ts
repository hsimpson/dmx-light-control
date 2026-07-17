/// <reference types="vitest/globals" />
import { ChannelValuesInput, DmxValueInput } from './dmx-set-channel-values.dto';

describe('dmx channel value DTOs', () => {
  it('instantiates DmxValueInput', () => {
    const v = new DmxValueInput();
    v.channel = 1;
    v.value = 200;
    expect(v.channel).toBe(1);
    expect(v.value).toBe(200);
  });

  it('instantiates ChannelValuesInput', () => {
    const c = new ChannelValuesInput();
    // The @Field defaultValue is GraphQL-arg level only; direct construction leaves it undefined.
    expect(c.dmxValues).toBeUndefined();
    c.dmxValues = [{ channel: 1, value: 127 }];
    expect(Array.isArray(c.dmxValues)).toBe(true);
  });
});
