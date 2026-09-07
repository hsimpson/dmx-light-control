import { describe, expect, it, vi } from 'vitest';
import {
  applyRoomDimensions,
  applySimpleGroundDimensions,
  ROOM_SLAB_THICKNESS_M,
  roomPartTransform,
  simpleGroundSlabTransform,
} from './room-layout';

describe('roomPartTransform', () => {
  it('keeps floor and wall slab thickness at 0.4m', () => {
    expect(roomPartTransform('floor', 12, 8, 5).scale[1]).toBe(1);
    expect(roomPartTransform('wallLeft', 12, 8, 5).scale[0]).toBe(1);
    expect(roomPartTransform('wallRight', 12, 8, 5).scale[0]).toBe(1);
    expect(roomPartTransform('wallBack', 12, 8, 5).scale[2]).toBe(1);
  });

  it('places inner wall faces on the room bounds', () => {
    expect(roomPartTransform('wallLeft', 12, 8, 5).position[0]).toBe(-6);
    expect(roomPartTransform('wallRight', 12, 8, 5).position[0]).toBe(6);
    expect(roomPartTransform('wallBack', 12, 8, 5).position[2]).toBe(-4);
  });

  it('extends the floor under the outer wall faces', () => {
    const floor = roomPartTransform('floor', 12, 8, 5);
    expect(floor.scale[0]).toBe(12 + 2 * ROOM_SLAB_THICKNESS_M);
    expect(floor.scale[2]).toBe(8 + ROOM_SLAB_THICKNESS_M);
  });
});

describe('applyRoomDimensions', () => {
  it('writes position and scale onto named room parts', () => {
    const floor = { position: { set: vi.fn() }, scale: { set: vi.fn() } };
    applyRoomDimensions(
      {
        getObjectByName: name => (name === 'floor' ? floor : null),
      },
      12,
      8,
      5,
    );
    expect(floor.scale.set).toHaveBeenCalledWith(12 + 2 * ROOM_SLAB_THICKNESS_M, 1, 8 + ROOM_SLAB_THICKNESS_M);
    expect(floor.position.set).toHaveBeenCalledWith(0, 0, -ROOM_SLAB_THICKNESS_M / 2);
  });
});

describe('simpleGroundSlabTransform', () => {
  it('places a 0.4m slab with its top face at y=0', () => {
    expect(simpleGroundSlabTransform(12, 8)).toEqual({
      position: [0, -ROOM_SLAB_THICKNESS_M / 2, 0],
      scale: [12, ROOM_SLAB_THICKNESS_M, 8],
    });
  });
});

describe('applySimpleGroundDimensions', () => {
  it('writes position and scale onto the ground mesh', () => {
    const ground = { position: { set: vi.fn() }, scale: { set: vi.fn() } };
    applySimpleGroundDimensions(ground, 12, 8);
    expect(ground.scale.set).toHaveBeenCalledWith(12, ROOM_SLAB_THICKNESS_M, 8);
    expect(ground.position.set).toHaveBeenCalledWith(0, -ROOM_SLAB_THICKNESS_M / 2, 0);
  });
});
