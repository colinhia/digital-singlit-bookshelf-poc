export const TABLE_POSITION: [number, number, number] = [0, 0, -1.25];
export const TABLETOP_SURFACE_HEIGHT = 1.866;

export const STOOL_OFFSET: [number, number, number] = [0.86, 0, 0.65];
export const STOOL_POSITION: [number, number, number] = [
  TABLE_POSITION[0] + STOOL_OFFSET[0],
  TABLE_POSITION[1] + STOOL_OFFSET[1],
  TABLE_POSITION[2] + STOOL_OFFSET[2],
];

export const TABLE_BOOK_STACK_POSITION: [number, number, number] = [
  TABLE_POSITION[0],
  TABLE_POSITION[1] + TABLETOP_SURFACE_HEIGHT,
  TABLE_POSITION[2],
];
