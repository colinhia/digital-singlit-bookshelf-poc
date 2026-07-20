import type { Book } from "@/types/library";

export const TABLE_BOOK_CAPACITY = 5;

export function resolveTableBooks(books: Book[], tableSerials: number[]) {
  const booksBySerial = new Map(books.map((book) => [book.serialNumber, book]));
  return tableSerials.flatMap((serialNumber) => {
    const book = booksBySerial.get(serialNumber);
    return book ? [book] : [];
  });
}

export function resolveShelfBooks(books: Book[], tableSerials: number[]) {
  const tableSerialSet = new Set(tableSerials);
  return books.filter((book) => !tableSerialSet.has(book.serialNumber));
}

export function resolveAdjacentBooks(books: Book[], serialNumber: number | undefined) {
  const index = serialNumber === undefined
    ? -1
    : books.findIndex((book) => book.serialNumber === serialNumber);
  return {
    index,
    previous: index > 0 ? books[index - 1] : null,
    next: index >= 0 && index < books.length - 1 ? books[index + 1] : null,
  };
}
