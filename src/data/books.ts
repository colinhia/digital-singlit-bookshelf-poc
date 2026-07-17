import type { Book, Language } from "@/types/library";

const languageFor = (serialNumber: number): Language => {
  if (serialNumber <= 25) return "Chinese";
  if (serialNumber <= 50) return "English";
  if (serialNumber <= 75) return "Tamil";
  return "Malay";
};

const authorFor = (serialNumber: number) => {
  if (serialNumber <= 12) return "Last1, First1";
  if (serialNumber === 14 || serialNumber === 29) return "Last3, First3";
  if (serialNumber <= 28) return "Last2, First2";
  if (serialNumber <= 67) return "Last3, First3";
  if (serialNumber <= 86) return "Last4, First4";
  return "Last5, First5";
};

const locations = ["TEEN SING", "ADULT SING", "JUNIOR SING"];
const callNumbers = ["CHE", "LEE", "DAS", "LNGO"];

/** Mirrors src/resources/books.xlsx. Replace this adapter when the source becomes an API/CMS. */
export const books: Book[] = Array.from({ length: 100 }, (_, index) => {
  const serialNumber = index + 1;
  return {
    serialNumber,
    language: languageFor(serialNumber),
    barcode: String(1234567889 + serialNumber),
    title: `Placeholder${serialNumber}`,
    author: authorFor(serialNumber),
    locationCode: locations[index % locations.length],
    callNumber: serialNumber % 17 === 0 ? "XYJX" : callNumbers[(index % 17) % callNumbers.length],
  };
});
