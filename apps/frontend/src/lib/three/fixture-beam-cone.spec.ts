import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  BEAM_LENGTH_M,
  createFixtureBeamCone,
  DEFAULT_BEAM_ANGLE_DEG,
  fixtureBeamConeRadius,
} from './fixture-beam-cone';

describe('createFixtureBeamCone', () => {
  it('places the apex at the fixture origin and the base at local +X', () => {
    const mesh = createFixtureBeamCone();
    mesh.updateMatrixWorld(true);

    const box = new Box3().setFromObject(mesh);
    const center = box.getCenter(new Vector3());
    expect(box.min.x).toBeCloseTo(0, 5);
    expect(box.max.x).toBeCloseTo(BEAM_LENGTH_M, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
    expect(mesh).toBeInstanceOf(Mesh);
    expect(mesh.userData.isBeam).toBe(true);
  });

  it('uses the full beam angle for the cone opening', () => {
    const mesh = createFixtureBeamCone(DEFAULT_BEAM_ANGLE_DEG);
    mesh.updateMatrixWorld(true);

    const box = new Box3().setFromObject(mesh);
    const expectedRadius = fixtureBeamConeRadius(DEFAULT_BEAM_ANGLE_DEG);
    expect(box.max.y).toBeCloseTo(expectedRadius, 4);
    expect(box.min.y).toBeCloseTo(-expectedRadius, 4);
  });
});
