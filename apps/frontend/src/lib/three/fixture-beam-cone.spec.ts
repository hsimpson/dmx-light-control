import {
  AdditiveBlending,
  BackSide,
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Scene,
  ShaderMaterial,
  Texture,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import {
  BEAM_LENGTH_M,
  clipFixtureBeamToScene,
  createFixtureBeamCone,
  setFixtureBeamLength,
  DEFAULT_BEAM_ANGLE_DEG,
  DEFAULT_BEAM_SOURCE_RADIUS_M,
  FIXTURE_BEAM_FRAGMENT_SHADER,
  FIXTURE_BEAM_ORIGIN_NAME,
  positionFixtureBeamFromModel,
  setFixtureBeamOrigin,
  fixtureBeamConeRadius,
  fixtureBeamFarRadius,
  syncFixtureBeamSceneDepth,
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

  it('opens from the LED face and keeps the beam angle', () => {
    const mesh = createFixtureBeamCone(DEFAULT_BEAM_ANGLE_DEG);
    mesh.updateMatrixWorld(true);

    const geometry = mesh.geometry as CylinderGeometry;
    const farRadius = fixtureBeamFarRadius(DEFAULT_BEAM_ANGLE_DEG);
    expect(geometry.parameters.radiusTop).toBeCloseTo(DEFAULT_BEAM_SOURCE_RADIUS_M, 5);
    expect(geometry.parameters.radiusBottom).toBeCloseTo(farRadius, 5);
    expect(farRadius - DEFAULT_BEAM_SOURCE_RADIUS_M).toBeCloseTo(fixtureBeamConeRadius(DEFAULT_BEAM_ANGLE_DEG), 5);

    const box = new Box3().setFromObject(mesh);
    expect(box.max.y).toBeCloseTo(farRadius, 4);
    expect(box.min.y).toBeCloseTo(-farRadius, 4);
    expect(mesh.material).toMatchObject({
      uniforms: {
        coneSourceRadius: { value: DEFAULT_BEAM_SOURCE_RADIUS_M },
        coneRadius: { value: farRadius },
      },
    });
  });

  it('fades through the volume and samples scene depth instead of a flat opacity', () => {
    const mesh = createFixtureBeamCone();
    const material = mesh.material as ShaderMaterial;

    expect(material).toBeInstanceOf(ShaderMaterial);
    expect(material.depthWrite).toBe(false);
    expect(material.depthTest).toBe(true);
    expect(material.toneMapped).toBe(false);
    expect(material.blending).toBe(AdditiveBlending);
    expect(material.side).toBe(BackSide);
    expect(material.transparent).toBe(true);
    expect(material.userData.samplesSceneDepth).toBe(true);
    expect(material.uniforms.opacity).toBeUndefined();
    expect(material.fragmentShader).toBe(FIXTURE_BEAM_FRAGMENT_SHADER);
    expect(material.fragmentShader).toContain('tSceneDepth');
    expect(material.fragmentShader).toContain('gl_FragDepth');
    expect(material.fragmentShader).toContain('smoothstep');
    expect(material.fragmentShader).toContain('const float BEAM_SCATTER = 1.6');
    expect(material.fragmentShader).toContain('1.0 - exp(-accum * BEAM_SCATTER)');
    expect(material.fragmentShader).not.toContain('0.22');

    const depth = new Texture();
    const scene = new Scene();
    scene.add(mesh);
    syncFixtureBeamSceneDepth(scene, depth, 1280, 720, 0.1, 1000);

    expect(material.uniforms.tSceneDepth?.value).toBe(depth);
    expect(material.uniforms.sceneDepthSize?.value).toMatchObject({ x: 1280, y: 720 });
    expect(material.uniforms.cameraNear?.value).toBe(0.1);
    expect(material.uniforms.cameraFar?.value).toBe(1000);
  });

  it('stops the cone at the first wall and ignores the fixture body and gizmos', () => {
    const scene = new Scene();
    const fixture = new Group();
    const beam = createFixtureBeamCone();
    fixture.add(beam);
    scene.add(fixture);

    const housing = new Mesh(new BoxGeometry(0.3, 0.3, 0.3), new MeshBasicMaterial());
    housing.position.x = 0.1;
    fixture.add(housing);

    const gizmo = new Group();
    (gizmo as Group & { isTransformControlsRoot: boolean }).isTransformControlsRoot = true;
    const gizmoBlocker = new Mesh(new BoxGeometry(0.2, 2, 2), new MeshBasicMaterial());
    gizmoBlocker.position.x = 1;
    gizmo.add(gizmoBlocker);
    scene.add(gizmo);

    const wall = new Mesh(new BoxGeometry(0.4, 4, 4), new MeshBasicMaterial());
    wall.position.set(2, 0, 0);
    scene.add(wall);

    scene.updateMatrixWorld(true);
    clipFixtureBeamToScene(beam, scene);

    beam.updateMatrixWorld(true);
    const box = new Box3().setFromObject(beam);
    expect(box.min.x).toBeCloseTo(0, 2);
    expect(box.max.x).toBeCloseTo(1.78, 2);
  });

  it('keeps an upward cone at full length when only its side crosses a wall', () => {
    const scene = new Scene();
    const fixture = new Group();
    fixture.rotation.z = Math.PI / 2;
    const beam = createFixtureBeamCone();
    fixture.add(beam);
    scene.add(fixture);

    const wall = new Mesh(new BoxGeometry(0.4, 8, 8), new MeshBasicMaterial());
    wall.position.set(-1, 4, 0);
    scene.add(wall);

    scene.updateMatrixWorld(true);
    clipFixtureBeamToScene(beam, scene);

    expect(beam.userData.beamLengthM).toBe(BEAM_LENGTH_M);
  });

  it('moves the apex to the LED center and keeps that offset when the cone shortens', () => {
    const mesh = createFixtureBeamCone();
    setFixtureBeamOrigin(mesh, new Vector3(0.0735, 0.118, 0));
    mesh.updateMatrixWorld(true);

    let box = new Box3().setFromObject(mesh);
    expect(box.min.x).toBeCloseTo(0.0735, 5);
    expect(box.max.x).toBeCloseTo(0.0735 + BEAM_LENGTH_M, 5);
    expect(box.getCenter(new Vector3()).y).toBeCloseTo(0.118, 5);
    expect(box.getCenter(new Vector3()).z).toBeCloseTo(0, 5);

    setFixtureBeamLength(mesh, 2);
    mesh.updateMatrixWorld(true);
    box = new Box3().setFromObject(mesh);
    expect(box.min.x).toBeCloseTo(0.0735, 5);
    expect(box.max.x).toBeCloseTo(2.0735, 5);
    expect(box.getCenter(new Vector3()).y).toBeCloseTo(0.118, 5);
  });

  it('places the cone from a BeamOrigin empty in the fixture group', () => {
    const fixture = new Group();
    fixture.position.set(4, 1, -2);
    const beam = createFixtureBeamCone();
    const model = new Group();
    const marker = new Group();
    marker.name = FIXTURE_BEAM_ORIGIN_NAME;
    marker.position.set(0.0833, 0.1405, 0);
    model.add(marker);
    fixture.add(beam);
    fixture.add(model);
    fixture.updateMatrixWorld(true);

    positionFixtureBeamFromModel(beam, model);

    expect(beam.position.x).toBeCloseTo(0.0833 + BEAM_LENGTH_M / 2, 5);
    expect(beam.position.y).toBeCloseTo(0.1405, 5);
    expect(beam.position.z).toBeCloseTo(0, 5);
    expect(fixture.position.x).toBe(4);
  });

  it('sizes the near cap to the lens cluster around BeamOrigin', () => {
    const fixture = new Group();
    const beam = createFixtureBeamCone();
    const model = new Group();
    const marker = new Group();
    marker.name = FIXTURE_BEAM_ORIGIN_NAME;
    marker.position.set(0.07, 0.12, 0);
    const lens = new Mesh(new BoxGeometry(0.01, 0.04, 0.04), new MeshBasicMaterial());
    lens.name = 'PAR_Lens_0';
    lens.position.set(0.07, 0.12, 0.05);
    model.add(marker);
    model.add(lens);
    fixture.add(beam);
    fixture.add(model);
    fixture.updateMatrixWorld(true);

    positionFixtureBeamFromModel(beam, model);

    const geometry = beam.geometry as CylinderGeometry;
    const sourceRadius = Math.hypot(0.02, 0.07);
    expect(geometry.parameters.radiusTop).toBeCloseTo(sourceRadius, 4);
    expect(geometry.parameters.radiusBottom).toBeCloseTo(
      fixtureBeamFarRadius(DEFAULT_BEAM_ANGLE_DEG, BEAM_LENGTH_M, sourceRadius),
      4,
    );
    expect(beam.position.y).toBeCloseTo(0.12, 5);
  });

  it('clips from the lens apex when the beam origin is in front of the pivot', () => {
    const scene = new Scene();
    const fixture = new Group();
    const beam = createFixtureBeamCone();
    setFixtureBeamOrigin(beam, new Vector3(0.5, 0.2, 0));
    fixture.add(beam);
    scene.add(fixture);

    const wall = new Mesh(new BoxGeometry(0.4, 4, 4), new MeshBasicMaterial());
    wall.position.set(2, 0, 0);
    scene.add(wall);

    scene.updateMatrixWorld(true);
    clipFixtureBeamToScene(beam, scene);

    beam.updateMatrixWorld(true);
    const box = new Box3().setFromObject(beam);
    expect(box.min.x).toBeCloseTo(0.5, 2);
    expect(box.max.x).toBeCloseTo(1.78, 2);
    expect(box.getCenter(new Vector3()).y).toBeCloseTo(0.2, 2);
  });
});
