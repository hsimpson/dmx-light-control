import { Box3, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BEAM_LENGTH_M, createFixtureBeamCone } from './fixture-beam-cone';

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
});
