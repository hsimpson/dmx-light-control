import {
  type Camera,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  type WebGLRenderer,
} from 'three';

export const AXIS_GIZMO_SIZE_PX = 92;
export const AXIS_GIZMO_MARGIN_PX = 12;

const CAMERA_DISTANCE = 2.4;
const SHAFT_LENGTH = 0.72;
const SHAFT_RADIUS = 0.032;
const CONE_HEIGHT = 0.2;
const CONE_RADIUS = 0.085;
const LABEL_DISTANCE = 1.12;

export const cssHexFromThreeColor = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

const AXES = [
  { label: 'X', color: 0xff0000, rotation: [0, 0, -Math.PI / 2], position: [LABEL_DISTANCE, 0, 0] },
  { label: 'Y', color: 0x00ff00, rotation: [0, 0, 0], position: [0, LABEL_DISTANCE, 0] },
  { label: 'Z', color: 0x0000ff, rotation: [Math.PI / 2, 0, 0], position: [0, 0, LABEL_DISTANCE] },
] as const;

const offset = new Vector3();

const createAxisLabel = (text: string, color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, 64, 64);
    context.fillStyle = color;
    context.font = 'bold 48px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 32, 34);
  }

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true });
  const sprite = new Sprite(material);
  sprite.scale.setScalar(0.58);
  sprite.frustumCulled = false;
  return sprite;
};

export const createAxisOrientationGizmo = () => {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1.55, 1.55, 1.55, -1.55, 0.1, 10);
  camera.position.set(0, 0, CAMERA_DISTANCE);

  const shaftGeometry = new CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_LENGTH, 12);
  const coneGeometry = new ConeGeometry(CONE_RADIUS, CONE_HEIGHT, 16);
  const axes = new Group();

  for (const axis of AXES) {
    const material = new MeshBasicMaterial({ color: axis.color });
    const shaft = new Mesh(shaftGeometry, material);
    shaft.position.y = SHAFT_LENGTH / 2;
    const cone = new Mesh(coneGeometry, material);
    cone.position.y = SHAFT_LENGTH + CONE_HEIGHT / 2;

    const arm = new Group();
    arm.add(shaft, cone);
    arm.rotation.set(axis.rotation[0], axis.rotation[1], axis.rotation[2]);
    axes.add(arm);

    const label = createAxisLabel(axis.label, cssHexFromThreeColor(axis.color));
    label.position.set(axis.position[0], axis.position[1], axis.position[2]);
    axes.add(label);
  }

  scene.add(axes);

  const updateFrom = (mainCamera: Camera) => {
    offset.set(0, 0, CAMERA_DISTANCE).applyQuaternion(mainCamera.quaternion);
    camera.position.copy(offset);
    camera.up.copy(mainCamera.up);
    camera.lookAt(0, 0, 0);
  };

  const render = (renderer: WebGLRenderer, width: number, height: number) => {
    const pixelRatio = renderer.getPixelRatio();
    const size = AXIS_GIZMO_SIZE_PX * pixelRatio;
    const margin = AXIS_GIZMO_MARGIN_PX * pixelRatio;
    const x = width * pixelRatio - margin - size;
    const y = height * pixelRatio - margin - size;

    renderer.clearDepth();
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, size, size);
    renderer.setViewport(x, y, size, size);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width * pixelRatio, height * pixelRatio);
  };

  const dispose = () => {
    scene.traverse(object => {
      if (object instanceof Sprite) {
        const material = object.material;
        material.map?.dispose();
        material.dispose();
        return;
      }

      if (object instanceof Mesh) {
        const material = object.material as Material | Material[];
        if (Array.isArray(material)) {
          for (const entry of material) {
            entry.dispose();
          }
        } else {
          material.dispose();
        }
      }
    });
    shaftGeometry.dispose();
    coneGeometry.dispose();
    scene.clear();
  };

  return { scene, camera, updateFrom, render, dispose };
};
