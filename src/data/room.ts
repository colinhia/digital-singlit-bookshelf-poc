import type { BookSlot, RoomLayout } from "@/types/library";

export const roomLayout: RoomLayout = {
  totalCapacity: 600,
  walls: [
    { id: "left", capacity: 200, tiers: 8, slotsPerTier: 25 },
    { id: "rear", capacity: 200, tiers: 8, slotsPerTier: 25 },
    { id: "right", capacity: 200, tiers: 8, slotsPerTier: 25 },
  ],
};

export const bookSlots: BookSlot[] = roomLayout.walls.flatMap((wall, wallIndex) =>
  Array.from({ length: wall.capacity }, (_, localIndex) => ({
    slotNumber: wallIndex * wall.capacity + localIndex + 1,
    wall: wall.id,
    tier: Math.floor(localIndex / wall.slotsPerTier),
    positionOnTier: localIndex % wall.slotsPerTier,
  }))
);
