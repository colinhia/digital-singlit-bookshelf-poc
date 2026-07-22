import type { Book } from "@/types/library";

export type MyLibraryRole = "owner" | "visitor";
export type MyLibraryLocation = "reading-list" | "currently-reading" | "completed";

export interface MyLibrarySelection {
  book: Book;
  location: MyLibraryLocation;
}

export type MyLibraryTarget =
  | { kind: "book"; selection: MyLibrarySelection }
  | { kind: "reading-shelf" }
  | { kind: "picture-frame" }
  | { kind: "flower-trough"; side: "left" | "right" };

export interface CuratedLibraryState {
  readingListSerials: number[];
  currentlyReadingSerial: number | null;
  completedSerials: number[];
}

export interface BookReview {
  rating: number;
  comment: string;
}

export type MyLibraryMode = "role" | "pause" | "resume" | "moving" | "catalogue" | "info" | "photo-picker" | "flower-picker" | "review";
