"use client";

import RoomSurfaces from "@/components/scene-assets/RoomSurfaces";
import { EAVE_HEIGHT, ROOM_HALF } from "@/components/scene-assets/roomLayout";

export const ROOM_WALL_COLOR = "#eee4d4";
const WALL_TRIM_COLOR = "#a95147";
const WALL_TRIM_HEIGHT = 6.9;
const WALL_BASE_HEIGHT = 0.45;
const SIDE_TRIM_X = ROOM_HALF - 0.12;

export function RoomEnvironment() {
  return <>
    <color attach="background" args={[ROOM_WALL_COLOR]} />
    <ambientLight intensity={1.35} color="#ffd7a6" />
    <directionalLight position={[0, 7, 2]} intensity={2.2} color="#ffd3a0" castShadow shadow-mapSize={[1024,1024]} />
    <pointLight position={[0, 4.6, 0]} intensity={35} distance={14} color="#f2a96f" />
    <RoomSurfaces roomHalf={ROOM_HALF} eaveHeight={EAVE_HEIGHT} />
    <mesh position={[0,EAVE_HEIGHT / 2,ROOM_HALF]}><boxGeometry args={[ROOM_HALF * 2,EAVE_HEIGHT,0.18]} /><meshStandardMaterial color={ROOM_WALL_COLOR} roughness={1} /></mesh>
    <mesh position={[0,EAVE_HEIGHT / 2,-ROOM_HALF]}><boxGeometry args={[ROOM_HALF * 2,EAVE_HEIGHT,0.18]} /><meshStandardMaterial color={ROOM_WALL_COLOR} roughness={1} /></mesh>
    <mesh position={[-ROOM_HALF,EAVE_HEIGHT / 2,0]}><boxGeometry args={[0.18,EAVE_HEIGHT,ROOM_HALF * 2]} /><meshStandardMaterial color={ROOM_WALL_COLOR} roughness={1} /></mesh>
    <mesh position={[ROOM_HALF,EAVE_HEIGHT / 2,0]}><boxGeometry args={[0.18,EAVE_HEIGHT,ROOM_HALF * 2]} /><meshStandardMaterial color={ROOM_WALL_COLOR} roughness={1} /></mesh>
    <mesh position={[0,WALL_TRIM_HEIGHT,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.32,0.14]} /><meshStandardMaterial color={WALL_TRIM_COLOR} /></mesh>
    <mesh position={[-SIDE_TRIM_X,WALL_TRIM_HEIGHT,0]}><boxGeometry args={[0.06,0.32,ROOM_HALF * 2]} /><meshStandardMaterial color={WALL_TRIM_COLOR} /></mesh>
    <mesh position={[SIDE_TRIM_X,WALL_TRIM_HEIGHT,0]}><boxGeometry args={[0.06,0.32,ROOM_HALF * 2]} /><meshStandardMaterial color={WALL_TRIM_COLOR} /></mesh>
    <mesh position={[0,WALL_BASE_HEIGHT,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.7,0.15]} /><meshStandardMaterial color={WALL_TRIM_COLOR} /></mesh>
    <mesh position={[-SIDE_TRIM_X,WALL_BASE_HEIGHT,0]}><boxGeometry args={[0.06,0.7,ROOM_HALF * 2]} /><meshStandardMaterial color={WALL_TRIM_COLOR} /></mesh>
    <mesh position={[SIDE_TRIM_X,WALL_BASE_HEIGHT,0]}><boxGeometry args={[0.06,0.7,ROOM_HALF * 2]} /><meshStandardMaterial color={WALL_TRIM_COLOR} /></mesh>
  </>;
}
