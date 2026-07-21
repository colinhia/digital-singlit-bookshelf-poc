export const ROOM_HALF = 3.84;
export const SHELF_WIDTH = 6.6;
export const BOOK_FACE = ROOM_HALF - 0.36;
export const BOOKCASE_FACE = ROOM_HALF - 0.18;
export const BOOKCASE_HEIGHT = 7.72;
export const BOOKCASE_WIDTH = 7.34;
export const EAVE_HEIGHT = 8.02;

const BOOKCASE_TIER_COUNT = 8;
export const TIER_Y = Array.from(
  { length: BOOKCASE_TIER_COUNT },
  (_, index) => 0.48 + index * 0.92,
);
