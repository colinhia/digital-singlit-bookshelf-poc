export type PhotoId = "mountain" | "acrylic" | "molly-bus";

export interface PhotoOption {
  id: PhotoId;
  label: string;
  previewSrc: string;
  textureSrc: string;
  aspectRatio: number;
}

export const PHOTO_OPTIONS: PhotoOption[] = [
  {
    id: "mountain",
    label: "Mountain",
    previewSrc: "/photos/Mountain.jpg",
    textureSrc: "/photos/display/Mountain.webp",
    aspectRatio: 1,
  },
  {
    id: "acrylic",
    label: "Acrylic",
    previewSrc: "/photos/Acrylic.jpg",
    textureSrc: "/photos/display/Acrylic.webp",
    aspectRatio: 612 / 408,
  },
  {
    id: "molly-bus",
    label: "Molly Bus",
    previewSrc: "/photos/MollyBus.png",
    textureSrc: "/photos/display/MollyBus.webp",
    aspectRatio: 1730 / 909,
  },
];

export const DEFAULT_VISITOR_PHOTO_ID: PhotoId = "mountain";

