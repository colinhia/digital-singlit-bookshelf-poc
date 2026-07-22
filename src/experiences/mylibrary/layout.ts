import {
  BOOKCASE_HEIGHT,
  BOOKCASE_WIDTH,
  SHELF_WIDTH,
  TIER_Y,
} from "@/components/scene-assets/roomLayout";
import {
  STOOL_OFFSET,
  TABLETOP_SURFACE_HEIGHT,
} from "@/components/scene-assets/furnitureLayout";

export const READING_LIST_TIER_Y = TIER_Y.slice(0, 4);
export const READING_LIST_BOOKCASE_WIDTH = BOOKCASE_WIDTH / 3;
export const READING_LIST_SHELF_WIDTH = SHELF_WIDTH / 3;
export const READING_LIST_BOOKCASE_HEIGHT = READING_LIST_TIER_Y.at(-1)! + 0.8;
export const READING_LIST_SLOTS_PER_TIER = 8;
export const READING_LIST_CAPACITY = READING_LIST_TIER_Y.length * READING_LIST_SLOTS_PER_TIER;
export const COMPLETED_CAPACITY = TIER_Y.length * 25;

export const MY_LIBRARY_TABLE_POSITION: [number, number, number] = [0.8, 0, -1.25];
export const MY_LIBRARY_STOOL_POSITION: [number, number, number] = [
  MY_LIBRARY_TABLE_POSITION[0] + STOOL_OFFSET[0],
  MY_LIBRARY_TABLE_POSITION[1] + STOOL_OFFSET[1],
  MY_LIBRARY_TABLE_POSITION[2] + STOOL_OFFSET[2],
];
export const MY_LIBRARY_TABLE_BOOK_POSITION: [number, number, number] = [
  MY_LIBRARY_TABLE_POSITION[0],
  MY_LIBRARY_TABLE_POSITION[1] + TABLETOP_SURFACE_HEIGHT,
  MY_LIBRARY_TABLE_POSITION[2],
];

export const MY_LIBRARY_BOOKCASE_HEIGHT = BOOKCASE_HEIGHT;
export const MY_LIBRARY_PICTURE_FRAME_POSITION: [number, number, number] = [-3.7, 4.58, 0.72];
export const MY_LIBRARY_FLOWER_TROUGH_POSITIONS: readonly [
  [number, number, number],
  [number, number, number],
] = [
  [-3.36, 0, -1.82],
  [-3.36, 0, 1.82],
];
