"use client";

import type { WallId } from "@/types/library";
import {
  BOOKCASE_FACE,
  BOOKCASE_HEIGHT,
  BOOKCASE_WIDTH,
  TIER_Y,
} from "@/components/scene-assets/roomLayout";

export function Bookcase({ wall }: { wall: WallId }) {
  const isRear = wall === "rear";
  const x = wall === "left" ? -BOOKCASE_FACE : wall === "right" ? BOOKCASE_FACE : 0;
  const z = isRear ? -BOOKCASE_FACE : 0;
  const rotation = wall === "left" ? Math.PI / 2 : wall === "right" ? -Math.PI / 2 : 0;
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
    <mesh position={[0, BOOKCASE_HEIGHT / 2, -0.13]} receiveShadow><boxGeometry args={[BOOKCASE_WIDTH, BOOKCASE_HEIGHT, 0.22]} /><meshStandardMaterial color="#4b2d1d" roughness={0.9} /></mesh>
    {TIER_Y.map((y) => <mesh key={y} position={[0, y, 0.12]} receiveShadow castShadow><boxGeometry args={[BOOKCASE_WIDTH + 0.05, 0.12, 0.6]} /><meshStandardMaterial color="#8a5835" roughness={0.72} /></mesh>)}
    <mesh position={[-BOOKCASE_WIDTH / 2, BOOKCASE_HEIGHT / 2, 0]}><boxGeometry args={[0.18, BOOKCASE_HEIGHT + 0.1, 0.68]} /><meshStandardMaterial color="#74452b" /></mesh>
    <mesh position={[BOOKCASE_WIDTH / 2, BOOKCASE_HEIGHT / 2, 0]}><boxGeometry args={[0.18, BOOKCASE_HEIGHT + 0.1, 0.68]} /><meshStandardMaterial color="#74452b" /></mesh>
  </group>;
}
