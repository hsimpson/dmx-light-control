import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const REFERENCE_PAN_DISTANCE_M = 4;
const MIN_DISTANCE_M = 0.05;

type DollyOrbitControls = OrbitControls & {
  _dollyIn: (dollyScale: number) => void;
  _dollyOut: (dollyScale: number) => void;
  _scale: number;
};

export function orbitPanSpeedForDistance(distanceM: number): number {
  return Math.max(1, REFERENCE_PAN_DISTANCE_M / Math.max(distanceM, MIN_DISTANCE_M));
}

export function linearOrbitDollyScale(
  radiusM: number,
  multiplicativeScale: number,
  direction: 'in' | 'out',
  minDistanceM: number,
  maxDistanceM: number,
): number {
  if (!(radiusM > 0)) {
    return 1;
  }
  const stepM = Math.abs(1 - multiplicativeScale) * REFERENCE_PAN_DISTANCE_M;
  const nextM = direction === 'in' ? Math.max(minDistanceM, radiusM - stepM) : Math.min(maxDistanceM, radiusM + stepM);
  return nextM / radiusM;
}

export function applyLinearOrbitDolly(controls: OrbitControls): void {
  const dollyControls = controls as DollyOrbitControls;
  dollyControls._dollyIn = (dollyScale: number) => {
    const radiusM = controls.object.position.distanceTo(controls.target);
    dollyControls._scale *= linearOrbitDollyScale(
      radiusM,
      dollyScale,
      'in',
      controls.minDistance,
      controls.maxDistance,
    );
  };
  dollyControls._dollyOut = (dollyScale: number) => {
    const radiusM = controls.object.position.distanceTo(controls.target);
    dollyControls._scale *= linearOrbitDollyScale(
      radiusM,
      dollyScale,
      'out',
      controls.minDistance,
      controls.maxDistance,
    );
  };
}
