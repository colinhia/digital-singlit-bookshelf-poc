import { DragonPlayground } from "@/components/room-decor/archive/DragonPlayground";
import type { ArchivedRoomDecorDefinition } from "@/components/room-decor/archive/types";

export const archivedRoomDecor = [
  {
    id: "dragon-playground",
    name: "Dragon Playground",
    description: "Angular cream-and-brick mosaic model designed for the central display table.",
    defaultPosition: [0, 0, -1.25],
    component: DragonPlayground,
  },
] satisfies ArchivedRoomDecorDefinition[];

export type { ArchivedRoomDecorDefinition, ArchivedRoomDecorProps } from "@/components/room-decor/archive/types";
