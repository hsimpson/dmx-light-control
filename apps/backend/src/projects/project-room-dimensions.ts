export const DEFAULT_ROOM_WIDTH = 10;
export const DEFAULT_ROOM_LENGTH = 8;
export const DEFAULT_ROOM_HEIGHT = 5;
export const ROOM_DIMENSION_MIN = 0.1;
export const ROOM_DIMENSION_MAX = 200;

export type RoomDimensionsPatch = {
  roomWidth?: number;
  roomLength?: number;
  roomHeight?: number;
};

export function optionalRoomDimensions(source: RoomDimensionsPatch): RoomDimensionsPatch {
  const patch: RoomDimensionsPatch = {};
  if (source.roomWidth !== undefined) {
    patch.roomWidth = source.roomWidth;
  }
  if (source.roomLength !== undefined) {
    patch.roomLength = source.roomLength;
  }
  if (source.roomHeight !== undefined) {
    patch.roomHeight = source.roomHeight;
  }
  return patch;
}
