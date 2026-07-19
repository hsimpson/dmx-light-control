import { describe, it, expect } from 'vitest';
import { FixtureChannelPreset, fixtureChannelPresetsName } from './channel-presets';

describe('channel-presets', () => {
  it('returns a human readable name for every preset', () => {
    const all = Object.values(FixtureChannelPreset);
    expect(all.length).toBeGreaterThan(0);
    for (const preset of all) {
      expect(typeof fixtureChannelPresetsName(preset)).toBe('string');
      expect(fixtureChannelPresetsName(preset).length).toBeGreaterThan(0);
    }
  });

  it('maps Custom to "Custom"', () => {
    expect(fixtureChannelPresetsName(FixtureChannelPreset.Custom)).toBe('Custom');
  });
});
