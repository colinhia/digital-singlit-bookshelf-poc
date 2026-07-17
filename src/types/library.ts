export type Language = "Chinese" | "English" | "Tamil" | "Malay";

export interface Book {
  serialNumber: number;
  language: Language;
  barcode: string;
  title: string;
  author: string;
  locationCode: string;
  callNumber: string;
}

export interface Bookshelf {
  id: string;
  name: string;
  description: string;
  capacity: number;
}
