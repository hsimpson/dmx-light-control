export const ROOM_SLAB_THICKNESS_M = 0.4;

export const ROOM_PART_NAMES = ['floor', 'wallLeft', 'wallRight', 'wallBack'] as const;

export type RoomPartName = (typeof ROOM_PART_NAMES)[number];

export type RoomPartTransform = {
  position: [number, number, number];
  scale: [number, number, number];
};

export function roomPartTransform(
  part: RoomPartName,
  width: number,
  length: number,
  height: number,
): RoomPartTransform {
  const thickness = ROOM_SLAB_THICKNESS_M;
  const zShift = -thickness / 2;

  switch (part) {
    case 'floor':
      return { position: [0, 0, zShift], scale: [width + 2 * thickness, 1, length + thickness] };
    case 'wallLeft':
      return { position: [-width / 2, 0, zShift], scale: [1, height, length + thickness] };
    case 'wallRight':
      return { position: [width / 2, 0, zShift], scale: [1, height, length + thickness] };
    case 'wallBack':
      return { position: [0, 0, -length / 2], scale: [width, height, 1] };
  }
}

type Transformable = {
  position: { set: (x: number, y: number, z: number) => unknown };
  scale: { set: (x: number, y: number, z: number) => unknown };
};

export function applyRoomDimensions(
  room: { getObjectByName: (name: string) => Transformable | undefined | null },
  width: number,
  length: number,
  height: number,
): void {
  for (const part of ROOM_PART_NAMES) {
    const object = room.getObjectByName(part);
    if (!object) {
      continue;
    }
    const transform = roomPartTransform(part, width, length, height);
    object.position.set(...transform.position);
    object.scale.set(...transform.scale);
  }
}
