"use client";

import { useEffect, useMemo } from "react";
import { createTileTexture } from "@/components/room-decor/mosaicTexture";
import { TABLE_POSITION } from "@/components/room-decor/TiledDisplayTable";

const STOOL_RADIUS = 0.312;
const STOOL_HEIGHT = 0.696;
const STOOL_POSITION: [number, number, number] = [
  TABLE_POSITION[0] + 0.86,
  0,
  TABLE_POSITION[2] + 0.65,
];

export function MosaicStool() {
  const sideTexture = useMemo(() => createTileTexture({ columns: 16, rows: 6 }), []);
  const topTexture = useMemo(() => createTileTexture({ columns: 6, rows: 6 }), []);

  useEffect(() => () => {
    sideTexture.dispose();
    topTexture.dispose();
  }, [sideTexture, topTexture]);

  return <group position={STOOL_POSITION}>
    <mesh position={[0, STOOL_HEIGHT / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[STOOL_RADIUS, STOOL_RADIUS, STOOL_HEIGHT, 48, 1, true]} />
      <meshStandardMaterial map={sideTexture} roughness={0.88} metalness={0.01} />
    </mesh>
    <mesh position={[0, STOOL_HEIGHT + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[STOOL_RADIUS - 0.014, 48]} />
      <meshStandardMaterial map={topTexture} roughness={0.84} metalness={0.01} />
    </mesh>
    <mesh position={[0, STOOL_HEIGHT - 0.014, 0]} castShadow>
      <cylinderGeometry args={[STOOL_RADIUS + 0.007, STOOL_RADIUS + 0.007, 0.03, 48]} />
      <meshStandardMaterial color="#c28668" roughness={0.88} metalness={0.01} />
    </mesh>
    <mesh position={[0, 0.0215, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[STOOL_RADIUS + 0.005, STOOL_RADIUS + 0.005, 0.043, 48]} />
      <meshStandardMaterial color="#e8ddcf" roughness={0.9} metalness={0.005} />
    </mesh>
  </group>;
}
