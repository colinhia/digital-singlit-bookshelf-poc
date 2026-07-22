"use client";

import { useEffect, useMemo } from "react";
import { TABLE_POSITION } from "@/components/scene-assets/furnitureLayout";
import { createTileTexture } from "@/components/scene-assets/mosaicTexture";

const TABLETOP_RADIUS = 0.73;
const TABLETOP_HEIGHT = 1.78;
const TABLETOP_THICKNESS = 0.16;

export function TiledDisplayTable({ position = TABLE_POSITION }: { position?: [number, number, number] }) {
  const tabletopTexture = useMemo(() => createTileTexture({ columns: 8, rows: 8, brickCentre: true }), []);
  const pedestalTexture = useMemo(() => createTileTexture({ columns: 10, rows: 9 }), []);

  useEffect(() => () => {
    tabletopTexture.dispose();
    pedestalTexture.dispose();
  }, [pedestalTexture, tabletopTexture]);

  return <group position={position}>
    <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.39, 0.39, 0.14, 48]} />
      <meshStandardMaterial color="#dfd3c4" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.33, 0.33, 0.045, 48]} />
      <meshStandardMaterial color="#c28668" roughness={0.88} />
    </mesh>
    <mesh position={[0, 0.94, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.28, 0.28, 1.56, 48]} />
      <meshStandardMaterial map={pedestalTexture} roughness={0.88} metalness={0.01} />
    </mesh>
    <mesh position={[0, TABLETOP_HEIGHT, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[TABLETOP_RADIUS, TABLETOP_RADIUS, TABLETOP_THICKNESS, 64]} />
      <meshStandardMaterial color="#e8ddcf" roughness={0.84} metalness={0.01} />
    </mesh>
    <mesh position={[0, TABLETOP_HEIGHT + TABLETOP_THICKNESS / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[TABLETOP_RADIUS - 0.018, 64]} />
      <meshStandardMaterial map={tabletopTexture} roughness={0.8} metalness={0.015} />
    </mesh>
    <mesh position={[0, TABLETOP_HEIGHT - 0.045, 0]} castShadow>
      <cylinderGeometry args={[TABLETOP_RADIUS + 0.007, TABLETOP_RADIUS + 0.007, 0.035, 64]} />
      <meshStandardMaterial color="#b8755d" roughness={0.86} metalness={0.01} />
    </mesh>
  </group>;
}
