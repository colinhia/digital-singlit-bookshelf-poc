"use client";

import { useMemo } from "react";
import type { WallId } from "@/types/library";
import { InstancedBoxes, type BoxInstance } from "@/components/scene-assets/InstancedBoxes";
import {
  BOOKCASE_FACE,
  BOOKCASE_HEIGHT,
  BOOKCASE_WIDTH,
  TIER_Y,
} from "@/components/scene-assets/roomLayout";

type ScenePosition = [number, number, number];

interface BookcaseProps {
  wall: WallId;
  width?: number;
  height?: number;
  tierY?: readonly number[];
  position?: ScenePosition;
  rotationY?: number;
}

export function Bookcase({
  wall,
  width = BOOKCASE_WIDTH,
  height = BOOKCASE_HEIGHT,
  tierY = TIER_Y,
  position,
  rotationY,
}: BookcaseProps) {
  const isRear = wall === "rear";
  const x = wall === "left" ? -BOOKCASE_FACE : wall === "right" ? BOOKCASE_FACE : 0;
  const z = isRear ? -BOOKCASE_FACE : 0;
  const rotation = wall === "left" ? Math.PI / 2 : wall === "right" ? -Math.PI / 2 : 0;
  const back = useMemo<BoxInstance[]>(() => [{
    position: [0, height / 2, -0.13],
    scale: [width, height, 0.22],
  }], [height, width]);
  const shelves = useMemo<BoxInstance[]>(
    () => tierY.map((y) => ({
      position: [0, y, 0.12],
      scale: [width + 0.05, 0.12, 0.6],
    })),
    [tierY, width],
  );
  const posts = useMemo<BoxInstance[]>(() => [
    {
      position: [-width / 2, height / 2, 0],
      scale: [0.18, height + 0.1, 0.68],
    },
    {
      position: [width / 2, height / 2, 0],
      scale: [0.18, height + 0.1, 0.68],
    },
  ], [height, width]);

  return <group position={position ?? [x, 0, z]} rotation={[0, rotationY ?? rotation, 0]}>
    <InstancedBoxes instances={back} color="#4b2d1d" roughness={0.9} receiveShadow />
    <InstancedBoxes instances={shelves} color="#8a5835" roughness={0.72} castShadow receiveShadow />
    <InstancedBoxes instances={posts} color="#74452b" />
  </group>;
}
