import {
  AdditiveBlending,
  BackSide,
  Color,
  Box3,
  CylinderGeometry,
  Matrix4,
  Mesh,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import type { FixtureBeamColor } from '@/lib/fixtures/fixture-beam-color';

export const BEAM_LENGTH_M = 6;
export const DEFAULT_BEAM_ANGLE_DEG = 30;
/** Near-cap radius when the model has no lens meshes. About a small PAR face. */
export const DEFAULT_BEAM_SOURCE_RADIUS_M = 0.06;
export const FIXTURE_BEAM_LAYER = 1;
/** Empty in the fixture GLB at the LED-cluster center on the lens face. The room pivot stays the group origin. */
export const FIXTURE_BEAM_ORIGIN_NAME = 'BeamOrigin';

const BEAM_RADIAL_SEGMENTS = 32;
const BEAM_RAY_STEPS = 32;
const MIN_BEAM_LENGTH_M = 0.05;
const BEAM_SURFACE_GAP_M = 0.02;

const beamOrigin = new Vector3();
const beamDirection = new Vector3();
const beamRaycaster = new Raycaster();
const beamOccluderBox = new Box3();
const beamOccluderHit = new Vector3();

/**
 * Closed frustum so a back-face draw covers the volume once.
 * The near cap matches the LED face; the far cap keeps the beam angle.
 */
export function createFixtureBeamConeGeometry(
  beamAngleDeg = DEFAULT_BEAM_ANGLE_DEG,
  lengthM = BEAM_LENGTH_M,
  sourceRadiusM = DEFAULT_BEAM_SOURCE_RADIUS_M,
): CylinderGeometry {
  const farRadius = fixtureBeamFarRadius(beamAngleDeg, lengthM, sourceRadiusM);
  return new CylinderGeometry(sourceRadiusM, farRadius, lengthM, BEAM_RADIAL_SEGMENTS, 1, false);
}

/** Radius added by the beam angle over `lengthM`, measured from the rim of the source. */
export function fixtureBeamConeRadius(beamAngleDeg: number, lengthM = BEAM_LENGTH_M): number {
  const halfRad = (beamAngleDeg * Math.PI) / 180 / 2;
  return lengthM * Math.tan(halfRad);
}

export function fixtureBeamFarRadius(
  beamAngleDeg: number,
  lengthM = BEAM_LENGTH_M,
  sourceRadiusM = DEFAULT_BEAM_SOURCE_RADIUS_M,
): number {
  return sourceRadiusM + fixtureBeamConeRadius(beamAngleDeg, lengthM);
}

const BEAM_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * Volumetric cone: march the view ray through the beam AABB and fade with a
 * gaussian core plus smoothstep at the rim and at the far end.
 * Scene occlusion uses a float depth prepass (raw window Z in .x, not packed RGBA).
 */
export const FIXTURE_BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 diffuse;
  uniform sampler2D tSceneDepth;
  uniform vec2 sceneDepthSize;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform mat4 inverseModelMatrix;
  uniform float coneLength;
  uniform float coneRadius;
  uniform float coneSourceRadius;
  uniform vec3 roomMin;
  uniform vec3 roomMax;
  uniform float roomClip;

  varying vec3 vWorldPos;

  const int BEAM_RAY_STEPS = ${BEAM_RAY_STEPS};
  const float BEAM_DEPTH_BIAS = 0.03;
  // Side views only travel a short distance through the cone, so a linear gain
  // leaves them nearly invisible. The exponential saturates when looking down the beam.
  const float BEAM_SCATTER = 1.6;

  #include <packing>

  float beamDensity(vec3 pObj) {
    float along = coneLength * 0.5 - pObj.y;
    if (along <= 0.0 || along >= coneLength) {
      return 0.0;
    }
    float radiusAt = mix(coneSourceRadius, coneRadius, along / coneLength);
    float radial = length(pObj.xz);
    if (radial >= radiusAt || radiusAt <= 0.0) {
      return 0.0;
    }
    float u = radial / radiusAt;
    float radialFade = exp(-3.5 * u * u) * (1.0 - smoothstep(0.7, 1.0, u));
    float alongFade = 1.0 - smoothstep(0.15, 1.0, along / coneLength);
    return radialFade * alongFade;
  }

  bool raySlab(float origin, float direction, float slabMin, float slabMax, inout float tmin, inout float tmax) {
    if (abs(direction) < 1e-8) {
      return origin >= slabMin && origin <= slabMax;
    }
    float inv = 1.0 / direction;
    float ta = (slabMin - origin) * inv;
    float tb = (slabMax - origin) * inv;
    if (ta > tb) {
      float swap = ta;
      ta = tb;
      tb = swap;
    }
    tmin = max(tmin, ta);
    tmax = min(tmax, tb);
    return tmin <= tmax;
  }

  bool rayAabb(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out float t0, out float t1) {
    t0 = 0.0;
    t1 = 0.0;
    float tmin = 0.0;
    float tmax = 1e20;
    if (!raySlab(ro.x, rd.x, bmin.x, bmax.x, tmin, tmax)) return false;
    if (!raySlab(ro.y, rd.y, bmin.y, bmax.y, tmin, tmax)) return false;
    if (!raySlab(ro.z, rd.z, bmin.z, bmax.z, tmin, tmax)) return false;
    t0 = tmin;
    t1 = tmax;
    return tmax > 0.0;
  }

  void main() {
    vec3 toFragment = vWorldPos - cameraPosition;
    float tFrag = length(toFragment);
    if (tFrag < 1e-4 || sceneDepthSize.x < 1.0 || sceneDepthSize.y < 1.0) {
      discard;
    }
    vec3 rdWorld = toFragment / tFrag;

    vec2 uv = gl_FragCoord.xy / sceneDepthSize;
    float windowDepth = texture2D(tSceneDepth, uv).x;
    float sceneT = 1e6;
    vec3 rdView = mat3(viewMatrix) * rdWorld;
    if (rdView.z < -1e-4) {
      float viewZ = perspectiveDepthToViewZ(windowDepth, cameraNear, cameraFar);
      sceneT = viewZ / rdView.z;
    }

    vec3 roObj = (inverseModelMatrix * vec4(cameraPosition, 1.0)).xyz;
    vec3 rdObj = (inverseModelMatrix * vec4(rdWorld, 0.0)).xyz;
    vec3 bmin = vec3(-coneRadius, -coneLength * 0.5, -coneRadius);
    vec3 bmax = vec3(coneRadius, coneLength * 0.5, coneRadius);
    float boxT0;
    float boxT1;
    if (!rayAabb(roObj, rdObj, bmin, bmax, boxT0, boxT1)) {
      discard;
    }

    float tEnd = min(tFrag, min(boxT1, sceneT - BEAM_DEPTH_BIAS));
    float tStart = max(boxT0, 0.0);
    if (roomClip > 0.5) {
      float roomT0;
      float roomT1;
      if (!rayAabb(cameraPosition, rdWorld, roomMin, roomMax, roomT0, roomT1)) {
        discard;
      }
      tStart = max(tStart, roomT0);
      tEnd = min(tEnd, roomT1);
    }
    if (tEnd <= tStart) {
      discard;
    }

    // Depth-test the first lit point inside the room. A cone that continues
    // through a wall then fails the wall's depth from the outside, while the
    // same cone stays solid when the camera is in the room.
    float tEntry = max(tStart, 1e-2);
    vec3 entryWorld = cameraPosition + rdWorld * tEntry;
    float entryViewZ = (viewMatrix * vec4(entryWorld, 1.0)).z;
    gl_FragDepth = entryViewZ < 0.0
      ? clamp(viewZToPerspectiveDepth(entryViewZ, cameraNear, cameraFar), 0.0, 1.0)
      : 0.0;

    float dt = (tEnd - tStart) / float(BEAM_RAY_STEPS);
    float accum = 0.0;
    for (int i = 0; i < BEAM_RAY_STEPS; i++) {
      float t = tStart + (float(i) + 0.5) * dt;
      vec3 pObj = roObj + rdObj * t;
      accum += beamDensity(pObj) * dt;
    }

    float weight = 1.0 - exp(-accum * BEAM_SCATTER);
    if (weight < 0.004) {
      discard;
    }
    gl_FragColor = vec4(diffuse, weight);
    #include <colorspace_fragment>
  }
`;

type FixtureBeamUniforms = {
  diffuse: { value: Color };
  tSceneDepth: { value: Texture | null };
  sceneDepthSize: { value: Vector2 };
  cameraNear: { value: number };
  cameraFar: { value: number };
  roomMin: { value: Vector3 };
  roomMax: { value: Vector3 };
  roomClip: { value: number };
  inverseModelMatrix: { value: Matrix4 };
  coneLength: { value: number };
  coneRadius: { value: number };
  coneSourceRadius: { value: number };
};

type FixtureBeamMaterial = ShaderMaterial & { color: Color; uniforms: FixtureBeamUniforms };

type FixtureBeamMeshUserData = {
  isBeam: boolean;
  beamLit: boolean;
  strobeHz: number;
  beamAngleDeg: number;
  beamLengthM: number;
  beamSourceRadiusM: number;
  beamOriginOffset: Vector3;
};

function fixtureBeamMeshUserData(mesh: Mesh): FixtureBeamMeshUserData {
  return mesh.userData as FixtureBeamMeshUserData;
}

function createFixtureBeamMaterial(beamAngleDeg: number): FixtureBeamMaterial {
  const color = new Color(0xffffff);
  const inverseModelMatrix = new Matrix4();
  const material = new ShaderMaterial({
    uniforms: {
      diffuse: { value: color },
      tSceneDepth: { value: null },
      sceneDepthSize: { value: new Vector2(1, 1) },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000 },
      roomMin: { value: new Vector3() },
      roomMax: { value: new Vector3() },
      roomClip: { value: 0 },
      inverseModelMatrix: { value: inverseModelMatrix },
      coneLength: { value: BEAM_LENGTH_M },
      coneRadius: { value: fixtureBeamFarRadius(beamAngleDeg) },
      coneSourceRadius: { value: DEFAULT_BEAM_SOURCE_RADIUS_M },
    },
    vertexShader: BEAM_VERTEX_SHADER,
    fragmentShader: FIXTURE_BEAM_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: BackSide,
    blending: AdditiveBlending,
    toneMapped: false,
  }) as FixtureBeamMaterial;
  material.color = color;
  material.userData.samplesSceneDepth = true;
  material.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => {
    inverseModelMatrix.copy(object.matrixWorld).invert();
  };
  return material;
}

function fixtureBeamUniforms(material: Material | Material[]): FixtureBeamUniforms | undefined {
  if (Array.isArray(material) || !('uniforms' in material)) {
    return undefined;
  }
  const uniforms = material.uniforms as Partial<FixtureBeamUniforms>;
  if (!uniforms.tSceneDepth || !uniforms.sceneDepthSize || !uniforms.coneRadius || !uniforms.coneSourceRadius) {
    return undefined;
  }
  return uniforms as FixtureBeamUniforms;
}

export function createFixtureBeamCone(beamAngleDeg = DEFAULT_BEAM_ANGLE_DEG): Mesh {
  const geometry = createFixtureBeamConeGeometry(beamAngleDeg);
  const material = createFixtureBeamMaterial(beamAngleDeg);
  const mesh = new Mesh(geometry, material);
  mesh.name = 'beam';
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.layers.set(FIXTURE_BEAM_LAYER);
  mesh.userData.isBeam = true;
  mesh.userData.beamLit = false;
  mesh.userData.strobeHz = 0;
  mesh.userData.beamAngleDeg = beamAngleDeg;
  mesh.userData.beamLengthM = BEAM_LENGTH_M;
  mesh.userData.beamSourceRadiusM = DEFAULT_BEAM_SOURCE_RADIUS_M;
  mesh.userData.beamOriginOffset = new Vector3();
  applyBeamApexPosition(mesh);
  mesh.visible = false;
  mesh.raycast = () => {
    return;
  };
  return mesh;
}

export function replaceFixtureBeamConeGeometry(mesh: Mesh, beamAngleDeg: number): void {
  mesh.userData.beamAngleDeg = beamAngleDeg;
  rebuildBeamGeometry(mesh);
}

function beamLengthM(mesh: Mesh): number {
  const length = fixtureBeamMeshUserData(mesh).beamLengthM;
  return Number.isFinite(length) ? length : BEAM_LENGTH_M;
}

function storedBeamAngleDeg(mesh: Mesh): number {
  const angleDeg = fixtureBeamMeshUserData(mesh).beamAngleDeg;
  return typeof angleDeg === 'number' ? angleDeg : DEFAULT_BEAM_ANGLE_DEG;
}

function beamSourceRadiusM(mesh: Mesh): number {
  const radius = fixtureBeamMeshUserData(mesh).beamSourceRadiusM;
  return Number.isFinite(radius) ? Math.max(0, radius) : DEFAULT_BEAM_SOURCE_RADIUS_M;
}

function syncBeamShapeUniforms(mesh: Mesh): void {
  const uniforms = fixtureBeamUniforms(mesh.material);
  if (!uniforms) {
    return;
  }
  const length = beamLengthM(mesh);
  const sourceRadius = beamSourceRadiusM(mesh);
  uniforms.coneLength.value = length;
  uniforms.coneSourceRadius.value = sourceRadius;
  uniforms.coneRadius.value = fixtureBeamFarRadius(storedBeamAngleDeg(mesh), length, sourceRadius);
}

function rebuildBeamGeometry(mesh: Mesh): void {
  const length = beamLengthM(mesh);
  mesh.geometry.dispose();
  mesh.geometry = createFixtureBeamConeGeometry(storedBeamAngleDeg(mesh), length, beamSourceRadiusM(mesh));
  applyBeamApexPosition(mesh);
  syncBeamShapeUniforms(mesh);
}

function beamOriginOffset(mesh: Mesh): Vector3 {
  if (!(mesh.userData.beamOriginOffset instanceof Vector3)) {
    mesh.userData.beamOriginOffset = new Vector3();
  }
  return mesh.userData.beamOriginOffset as Vector3;
}

/** Apex stays at the beam origin; the mesh center is half a cone length along local +X. */
function applyBeamApexPosition(mesh: Mesh): void {
  const origin = beamOriginOffset(mesh);
  const length = beamLengthM(mesh);
  mesh.position.set(origin.x + length / 2, origin.y, origin.z);
}

/**
 * Move the cone apex to the LED center. The fixture group origin is the room placement pivot and stays put.
 */
export function setFixtureBeamOrigin(mesh: Mesh, origin: Vector3): void {
  beamOriginOffset(mesh).copy(origin);
  applyBeamApexPosition(mesh);
}

/** Widen the near cap so the beam starts on the LED face instead of a point. */
export function setFixtureBeamSourceRadius(mesh: Mesh, radiusM: number): void {
  const radius = Math.max(0, radiusM);
  if (Math.abs(beamSourceRadiusM(mesh) - radius) < 1e-4) {
    return;
  }
  mesh.userData.beamSourceRadiusM = radius;
  rebuildBeamGeometry(mesh);
}

const lensRadial = new Vector3();
const lensCorner = new Vector3();
const lensBox = new Box3();

/** Radius of the lens cluster around the beam origin, in the plane perpendicular to +X. */
export function measureFixtureBeamSourceRadius(model: Object3D, originWorld: Vector3): number {
  const axis = new Vector3(1, 0, 0);
  axis.setFromMatrixColumn(model.matrixWorld, 0);
  if (axis.lengthSq() < 1e-8) {
    axis.set(1, 0, 0);
  } else {
    axis.normalize();
  }
  let maxRadial = 0;
  model.traverse(object => {
    if (!/lens/i.test(object.name) || !isMeshObject(object)) {
      return;
    }
    lensBox.setFromObject(object);
    if (lensBox.isEmpty()) {
      return;
    }
    const { min, max } = lensBox;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          lensCorner.set(x, y, z);
          lensRadial.copy(lensCorner).sub(originWorld);
          const along = lensRadial.dot(axis);
          lensRadial.addScaledVector(axis, -along);
          maxRadial = Math.max(maxRadial, lensRadial.length());
        }
      }
    }
  });
  return maxRadial > 0 ? maxRadial : DEFAULT_BEAM_SOURCE_RADIUS_M;
}

const isMeshObject = (object: Object3D): object is Mesh => 'isMesh' in object && object.isMesh === true;

/** Read a `BeamOrigin` empty from the loaded fixture model and place the cone on the LED face. */
export function positionFixtureBeamFromModel(beam: Mesh, model: Object3D): void {
  const marker = model.getObjectByName(FIXTURE_BEAM_ORIGIN_NAME);
  if (!marker) {
    return;
  }
  model.updateWorldMatrix(true, true);
  const origin = new Vector3();
  marker.getWorldPosition(origin);
  const sourceRadius = measureFixtureBeamSourceRadius(model, origin);
  const parent = beam.parent ?? model;
  parent.updateWorldMatrix(true, false);
  parent.worldToLocal(origin);
  setFixtureBeamOrigin(beam, origin);
  setFixtureBeamSourceRadius(beam, sourceRadius);
}

export function setFixtureBeamLength(mesh: Mesh, lengthM: number): void {
  const length = Math.min(BEAM_LENGTH_M, Math.max(MIN_BEAM_LENGTH_M, lengthM));
  if (Math.abs(beamLengthM(mesh) - length) < 0.01) {
    return;
  }
  mesh.userData.beamLengthM = length;
  rebuildBeamGeometry(mesh);
}

const isTransformGizmo = (object: Object3D): boolean =>
  (object as Object3D & { isTransformControlsRoot?: boolean }).isTransformControlsRoot === true;

const acceptsBeamOcclusion = (object: Object3D, ignoreRoot: Object3D): boolean => {
  let current: Object3D | null = object;
  while (current) {
    if (
      current === ignoreRoot ||
      current.userData.isBeam === true ||
      current.userData.isSelectionHighlight === true ||
      isTransformGizmo(current)
    ) {
      return false;
    }
    current = current.parent;
  }
  return true;
};

const occluderDistance = (mesh: Mesh, origin: Vector3, direction: Vector3): number | undefined => {
  const geometry: BufferGeometry = mesh.geometry;
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const bounds = geometry.boundingBox;
  if (!bounds) {
    return undefined;
  }
  mesh.updateWorldMatrix(true, false);
  beamOccluderBox.copy(bounds).applyMatrix4(mesh.matrixWorld);
  beamRaycaster.ray.set(origin, direction);
  if (!beamRaycaster.ray.intersectBox(beamOccluderBox, beamOccluderHit)) {
    return undefined;
  }
  const along = beamOccluderHit.sub(origin).dot(direction);
  if (along <= 1e-3 || along > BEAM_LENGTH_M) {
    return undefined;
  }
  return along;
};

/** Shorten the cone so it ends on the first wall or object along +X instead of continuing through it. */
export function clipFixtureBeamToScene(mesh: Mesh, scene: Object3D): void {
  const root = mesh.parent;
  if (!root) {
    return;
  }
  root.updateWorldMatrix(true, false);
  const origin = beamOriginOffset(mesh);
  beamOrigin.set(origin.x, origin.y, origin.z);
  root.localToWorld(beamOrigin);
  beamDirection.setFromMatrixColumn(root.matrixWorld, 0);
  if (beamDirection.lengthSq() < 1e-8) {
    return;
  }
  beamDirection.normalize();
  let length = BEAM_LENGTH_M;
  scene.traverse(object => {
    if (!isMeshObject(object) || !acceptsBeamOcclusion(object, root)) {
      return;
    }
    const distance = occluderDistance(object, beamOrigin, beamDirection);
    if (distance !== undefined && distance < length) {
      length = Math.max(MIN_BEAM_LENGTH_M, distance - BEAM_SURFACE_GAP_M);
    }
  });
  setFixtureBeamLength(mesh, length);
}

export function syncFixtureBeamRoomBounds(root: Object3D, min: Vector3 | null, max: Vector3 | null): void {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.userData.isBeam !== true) {
      return;
    }
    const uniforms = fixtureBeamUniforms(mesh.material);
    if (!uniforms) {
      return;
    }
    uniforms.roomClip.value = min && max ? 1 : 0;
    if (min && max) {
      uniforms.roomMin.value.copy(min);
      uniforms.roomMax.value.copy(max);
    }
  });
}

export function syncFixtureBeamSceneDepth(
  root: Object3D,
  depthTexture: Texture,
  depthWidth: number,
  depthHeight: number,
  cameraNear: number,
  cameraFar: number,
): void {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.userData.isBeam !== true) {
      return;
    }
    const uniforms = fixtureBeamUniforms(mesh.material);
    if (!uniforms) {
      return;
    }
    uniforms.tSceneDepth.value = depthTexture;
    uniforms.sceneDepthSize.value.set(depthWidth, depthHeight);
    uniforms.cameraNear.value = cameraNear;
    uniforms.cameraFar.value = cameraFar;
  });
}

export function applyFixtureBeamAppearance(mesh: Mesh, color: FixtureBeamColor): void {
  const material = mesh.material as Material & { color: Color };
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
