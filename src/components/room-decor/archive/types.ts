import type { ComponentType } from "react";

export type RoomDecorPosition = [number, number, number];

export interface ArchivedRoomDecorProps {
  position?: RoomDecorPosition;
}

export interface ArchivedRoomDecorDefinition {
  id: string;
  name: string;
  description: string;
  defaultPosition: RoomDecorPosition;
  component: ComponentType<ArchivedRoomDecorProps>;
}
