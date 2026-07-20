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

export type BookLocation = "shelf" | "table";

export interface BookSelection {
  book: Book;
  location: BookLocation;
}

export interface Bookshelf {
  id: string;
  name: string;
  description: string;
  capacity: number;
}

export type BookAppearance =
  | {
      kind: "solid";
      backgroundColor: string;
      textColor: string;
    }
  | {
      kind: "image";
      assetPath: string;
      fallbackColor: string;
      textColor: string;
    };

export type BookBinding = "hardcover" | "paperback";

export interface BookRenderProfile {
  serialNumber: number;
  binding: BookBinding;
  width: number;
  height: number;
  depth: number;
  lean: number;
  coverThickness: number;
  pageInset: number;
}

export type WallId = "left" | "rear" | "right";

export interface BookSlot {
  slotNumber: number;
  wall: WallId;
  tier: number;
  positionOnTier: number;
}

export interface BookcaseWall {
  id: WallId;
  capacity: number;
  tiers: number;
  slotsPerTier: number;
}

export interface RoomLayout {
  totalCapacity: number;
  walls: BookcaseWall[];
}

export interface RoomControlsHandle {
  lock: () => void;
  unlock: () => void;
  isLocked: () => boolean;
}
