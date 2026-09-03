import { describe, expect, it } from 'vitest';
import { optionalRoomDimensions } from './project-room-dimensions';

describe('optionalRoomDimensions', () => {
  it('omits keys that are undefined', () => {
    expect(optionalRoomDimensions({})).toEqual({});
    expect(optionalRoomDimensions({ roomWidth: 12, roomLength: 9, roomHeight: 4 })).toEqual({
      roomWidth: 12,
      roomLength: 9,
      roomHeight: 4,
    });
    expect(optionalRoomDimensions({ roomWidth: 12 })).toEqual({ roomWidth: 12 });
  });
});
