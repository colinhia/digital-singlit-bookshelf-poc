"use client";

import { PointerLockControls, Text } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import type { Book, RoomControlsHandle, WallId } from "@/types/library";
import { roomLayout } from "@/data/room";
import RoomSurfaces from "@/components/RoomSurfaces";
import BookCollection from "@/components/BookCollection";

const ROOM_HALF = 3.84;
const SHELF_WIDTH = 6.9;
const BOOK_FACE = ROOM_HALF - 0.36;
const BOOKCASE_FACE = ROOM_HALF - 0.18;
const CAMERA_HEIGHT = 3.53;
const SLOTS_PER_TIER = roomLayout.walls[0].slotsPerTier;
const TIER_COUNT = roomLayout.walls[0].tiers;
const TIER_Y = Array.from({ length: TIER_COUNT }, (_, index) => 0.48 + index * 0.92);
const BOOKCASE_HEIGHT = 7.72;
const BOOKCASE_WIDTH = 7.34;
const EAVE_HEIGHT = 8.02;
function Bookcase({ wall }: { wall: WallId }) {
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

function Vines() {
  const pieces = useMemo(() => Array.from({ length: 72 }, (_, index) => {
    const wall = index % 3;
    const t = ((index * 37) % 100) / 100;
    const y = EAVE_HEIGHT + 0.18 - ((index * 13) % 18) / 100;
    const vineFace = ROOM_HALF - 0.08;
    const vineSpan = ROOM_HALF * 1.84;
    if (wall === 0) return { position: [-vineFace, y, -vineSpan / 2 + t * vineSpan] as [number,number,number], rotation: [0, 0, Math.PI / 2] as [number,number,number] };
    if (wall === 1) return { position: [-vineSpan / 2 + t * vineSpan, y, -vineFace] as [number,number,number], rotation: [0, 0, 0] as [number,number,number] };
    return { position: [vineFace, y, -vineSpan / 2 + t * vineSpan] as [number,number,number], rotation: [0, 0, Math.PI / 2] as [number,number,number] };
  }), []);
  return <group>{pieces.map((piece, index) => <group key={index} position={piece.position} rotation={piece.rotation}>
    <mesh scale={[0.13,0.24,0.06]}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={index % 4 ? "#315234" : "#203d2b"} roughness={1} /></mesh>
    {index % 3 === 0 && <mesh position={[0.08,0.03,0.05]} scale={0.07}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={index % 2 ? "#a95147" : "#d86f78"} /></mesh>}
  </group>)}</group>;
}

function RoomArchitecture() {
  return <>
    <color attach="background" args={["#e8d9c5"]} />
    <ambientLight intensity={1.35} color="#ffd7a6" />
    <directionalLight position={[0, 7, 2]} intensity={2.2} color="#ffd3a0" castShadow shadow-mapSize={[1024,1024]} />
    <pointLight position={[0, 4.6, 0]} intensity={35} distance={14} color="#f2a96f" />
    <RoomSurfaces roomHalf={ROOM_HALF} eaveHeight={EAVE_HEIGHT} />
    <mesh position={[0,EAVE_HEIGHT / 2,ROOM_HALF]}><boxGeometry args={[ROOM_HALF * 2,EAVE_HEIGHT,0.18]} /><meshStandardMaterial color="#eee4d4" roughness={1} /></mesh>
    <mesh position={[0,6.9,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.32,0.14]} /><meshStandardMaterial color="#a95147" /></mesh>
    <mesh position={[0,0.45,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.7,0.15]} /><meshStandardMaterial color="#a95147" /></mesh>
    <mesh position={[0,2.45,ROOM_HALF-0.24]}><boxGeometry args={[2.2,4.7,0.24]} /><meshStandardMaterial color="#6a4028" roughness={0.8} /></mesh>
    <mesh position={[0,2.45,ROOM_HALF-0.4]}><boxGeometry args={[1.72,4.22,0.15]} /><meshStandardMaterial color="#b36d46" roughness={0.86} /></mesh>
    <Text position={[0,2.5,ROOM_HALF-0.52]} rotation={[0,Math.PI,0]} fontSize={0.18} color="#f4e7d0" letterSpacing={0.2}>THE DOOR</Text>
    <Bookcase wall="left" /><Bookcase wall="rear" /><Bookcase wall="right" />
    <Vines />
  </>;
}

function CameraRig({ mobile, onSelect, target, onControlsReady }: { mobile: boolean; onSelect: (book: Book) => void; target: Book | null; onControlsReady: (controls: RoomControlsHandle | null) => void }) {
  const { camera, gl } = useThree();
  const drag = useRef({ active:false, moved:false, x:0, y:0 });
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);
  useEffect(() => {
    camera.position.set(0, CAMERA_HEIGHT, 0.7);
    camera.rotation.order = "YXZ";
    camera.lookAt(0, CAMERA_HEIGHT, -5);
  }, [camera]);
  useEffect(() => {
    if (mobile) return;
    const handle: RoomControlsHandle = {
      lock: () => controlsRef.current?.lock(),
      unlock: () => controlsRef.current?.unlock(),
      isLocked: () => Boolean(controlsRef.current?.isLocked),
    };
    onControlsReady(handle);
    return () => onControlsReady(null);
  }, [mobile, onControlsReady]);
  useEffect(() => {
    if (!mobile) return;
    const element = gl.domElement;
    const down = (event: PointerEvent) => { drag.current = { active:true, moved:false, x:event.clientX, y:event.clientY }; };
    const move = (event: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
      camera.rotation.y -= dx * 0.004;
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 0.003, -0.72, 0.72);
      drag.current.x = event.clientX; drag.current.y = event.clientY;
    };
    const up = () => { if (!drag.current.moved && target) onSelect(target); drag.current.active = false; };
    element.addEventListener("pointerdown", down); element.addEventListener("pointermove", move); element.addEventListener("pointerup", up);
    return () => { element.removeEventListener("pointerdown", down); element.removeEventListener("pointermove", move); element.removeEventListener("pointerup", up); };
  }, [camera, gl.domElement, mobile, onSelect, target]);
  return mobile ? null : <PointerLockControls ref={controlsRef} makeDefault selector="#no-automatic-pointer-lock" />;
}

function Scene({ books, visibleSerials, mobile, onSelect, onTarget, target, onControlsReady }: { books: Book[]; visibleSerials: Set<number>; mobile: boolean; onSelect: (book: Book) => void; onTarget: (book: Book | null) => void; target: Book | null; onControlsReady: (controls: RoomControlsHandle | null) => void }) {
  return <>
    <RoomArchitecture />
    <BookCollection
      books={books}
      visibleSerials={visibleSerials}
      onSelect={onSelect}
      onTarget={onTarget}
      shelfWidth={SHELF_WIDTH}
      bookFace={BOOK_FACE}
      tierY={TIER_Y}
      slotsPerTier={SLOTS_PER_TIER}
      capacity={roomLayout.totalCapacity}
    />
    <CameraRig mobile={mobile} onSelect={onSelect} target={target} onControlsReady={onControlsReady} />
  </>;
}

export default function RoomScene({ books, visibleSerials, onSelect, onTarget, target, mobile, onControlsReady }: { books: Book[]; visibleSerials: Set<number>; onSelect: (book: Book) => void; onTarget: (book: Book | null) => void; target: Book | null; mobile: boolean; onControlsReady: (controls: RoomControlsHandle | null) => void }) {
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor("#e8d9c5");
    gl.shadowMap.enabled = !mobile;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [mobile]);
  return <Canvas camera={{ position:[0,CAMERA_HEIGHT,0.7], fov:68, near:0.1, far:40 }} dpr={mobile ? [1,1.25] : [1,1.7]} shadows={!mobile} onCreated={handleCreated} gl={{ antialias:true, powerPreference:"high-performance" }}>
    <Scene books={books} visibleSerials={visibleSerials} mobile={mobile} onSelect={onSelect} onTarget={onTarget} target={target} onControlsReady={onControlsReady} />
  </Canvas>;
}
