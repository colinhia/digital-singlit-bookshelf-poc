"use client";

import RoomSurfaces from "@/components/scene-assets/RoomSurfaces";
import { EAVE_HEIGHT, ROOM_HALF } from "@/components/scene-assets/roomLayout";

export function RoomEnvironment() {
  return <>
    <color attach="background" args={["#e8d9c5"]} />
    <ambientLight intensity={1.35} color="#ffd7a6" />
    <directionalLight position={[0, 7, 2]} intensity={2.2} color="#ffd3a0" castShadow shadow-mapSize={[1024,1024]} />
    <pointLight position={[0, 4.6, 0]} intensity={35} distance={14} color="#f2a96f" />
    <RoomSurfaces roomHalf={ROOM_HALF} eaveHeight={EAVE_HEIGHT} />
    <mesh position={[0,EAVE_HEIGHT / 2,ROOM_HALF]}><boxGeometry args={[ROOM_HALF * 2,EAVE_HEIGHT,0.18]} /><meshStandardMaterial color="#eee4d4" roughness={1} /></mesh>
    <mesh position={[0,6.9,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.32,0.14]} /><meshStandardMaterial color="#a95147" /></mesh>
    <mesh position={[0,0.45,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.7,0.15]} /><meshStandardMaterial color="#a95147" /></mesh>
  </>;
}
