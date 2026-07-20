import type { Book, BookAppearance } from "@/types/library";

export const BOOK_PALETTE = [
  { backgroundColor: "#4a2c24", textColor: "#d8cfbf" },
  { backgroundColor: "#642a35", textColor: "#d8cfbf" },
  { backgroundColor: "#243a5a", textColor: "#d8cfbf" },
  { backgroundColor: "#2f4a3a", textColor: "#d8cfbf" },
] as const;

function hashSerialNumber(serialNumber: number) {
  let value = Math.trunc(serialNumber) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function resolveBookAppearance(book: Pick<Book, "serialNumber">): BookAppearance {
  const paletteEntry = BOOK_PALETTE[hashSerialNumber(book.serialNumber) % BOOK_PALETTE.length];
  return { kind: "solid", ...paletteEntry };
}

export function getBookAppearanceColor(appearance: BookAppearance) {
  return appearance.kind === "solid" ? appearance.backgroundColor : appearance.fallbackColor;
}
