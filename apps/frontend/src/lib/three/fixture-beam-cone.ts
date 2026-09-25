import { AdditiveBlending, CylinderGeometry, DoubleSide, Mesh, MeshBasicMaterial, type Material } from 'three';
import type { FixtureBeamColor } from '@/lib/fixtures/fixture-beam-color';

export const BEAM_LENGTH_M = 6;
export const BEAM_HALF_ANGLE_RAD = (18 * Math.PI) / 180;
export const FIXTURE_BEAM_LAYER = 1;

const BEAM_RADIAL_SEGMENTS = 32;
const BEAM_OPACITY = 0.22;

export function createFixtureBeamCone(): Mesh {
  const radius = BEAM_LENGTH_M * Math.tan(BEAM_HALF_ANGLE_RAD);
  const geometry = new CylinderGeometry(0, radius, BEAM_LENGTH_M, BEAM_RADIAL_SEGMENTS, 1, true);
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: BEAM_OPACITY,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'beam';
  mesh.rotation.z = Math.PI / 2;
  mesh.position.x = BEAM_LENGTH_M / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.layers.set(FIXTURE_BEAM_LAYER);
  mesh.userData.isBeam = true;
  mesh.userData.beamLit = false;
  mesh.userData.strobeHz = 0;
  mesh.visible = false;
  mesh.raycast = () => {
    return;
  };
  return mesh;
}

export function applyFixtureBeamAppearance(mesh: Mesh, color: FixtureBeamColor): void {
  const material = mesh.material as MeshBasicMaterial;
  material.color.setRGB(color.r, color.g, color.b);
  const lit = Math.max(color.r, color.g, color.b) > 0;
  mesh.userData.beamLit = lit;
  mesh.userData.strobeHz = color.strobeHz;
  mesh.visible = lit && color.strobeHz === 0;
}

export function updateFixtureBeamStrobe(mesh: Mesh, timeSec: number): void {
  const lit = mesh.userData.beamLit === true;
  const strobeHz = typeof mesh.userData.strobeHz === 'number' ? mesh.userData.strobeHz : 0;
  if (!lit || strobeHz === 0) {
    mesh.visible = lit;
    return;
  }
  mesh.visible = (timeSec * strobeHz) % 1 < 0.5;
}

export function disposeFixtureBeamCone(mesh: Mesh): void {
  mesh.geometry.dispose();
  const material: Material | Material[] = mesh.material;
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose();
    }
    return;
  }
  material.dispose();
}
