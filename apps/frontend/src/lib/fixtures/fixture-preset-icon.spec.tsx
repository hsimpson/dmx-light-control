import { FixtureChannelPreset } from '@/shared/types/graphql/graphql';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixturePresetIcon } from './fixture-preset-icon';

describe('FixturePresetIcon', () => {
  it.each(Object.values(FixtureChannelPreset))('renders an icon for preset %s', preset => {
    const { container } = render(<FixturePresetIcon preset={preset} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('wraps the icon when className is provided', () => {
    const { container } = render(<FixturePresetIcon preset={FixtureChannelPreset.Custom} className="preset-icon" />);
    expect(container.querySelector('span.preset-icon')).not.toBeNull();
  });
});
