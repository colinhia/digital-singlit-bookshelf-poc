"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import type { Book, BookSelection, RoomControlsHandle } from "@/types/library";
import { roomLayout } from "@/data/room";
import { Bookcase } from "@/components/scene-assets/Bookcase";
import { ROOM_WALL_COLOR, RoomEnvironment } from "@/components/scene-assets/RoomEnvironment";
import BookCollection from "@/experiences/singlit/BookCollection";
import RoomCentrepiece from "@/components/scene-assets/RoomCentrepiece";
import { EntranceFoliage, PerimeterFoliage } from "@/components/scene-assets/EntranceFoliage";
import { VintageGate } from "@/components/scene-assets/VintageGate";
import {
  BOOKCASE_FACE,
  BOOKCASE_WIDTH,
  BOOK_FACE,
  ROOM_HALF,
  SHELF_WIDTH,
  TIER_Y,
} from "@/components/scene-assets/roomLayout";

const CAMERA_HEIGHT = 3.53;
const MOBILE_MIN_PITCH = -0.72;
const MOBILE_MAX_PITCH = 1.05;
const SLOTS_PER_TIER = roomLayout.walls[0].slotsPerTier;

function CameraRig({ mobile, onSelect, target, onControlsReady, onLock, onUnlock }: { mobile: boolean; onSelect: (selection: BookSelection) => void; target: BookSelection | null; onControlsReady: (controls: RoomControlsHandle | null) => void; onLock: () => void; onUnlock: () => void }) {
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
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x - dy * 0.003,
        MOBILE_MIN_PITCH,
        MOBILE_MAX_PITCH,
      );
      drag.current.x = event.clientX; drag.current.y = event.clientY;
    };
    const up = () => { if (!drag.current.moved && target) onSelect(target); drag.current.active = false; };
    element.addEventListener("pointerdown", down); element.addEventListener("pointermove", move); element.addEventListener("pointerup", up);
    return () => { element.removeEventListener("pointerdown", down); element.removeEventListener("pointermove", move); element.removeEventListener("pointerup", up); };
  }, [camera, gl.domElement, mobile, onSelect, target]);
  return mobile ? null : <PointerLockControls ref={controlsRef} makeDefault selector="#no-automatic-pointer-lock" onLock={onLock} onUnlock={onUnlock} />;
}

function Scene({ books, tableBooks, matchingSerials, mobile, onSelect, onTarget, target, onControlsReady, onLock, onUnlock }: { books: Book[]; tableBooks: Book[]; matchingSerials: Set<number>; mobile: boolean; onSelect: (selection: BookSelection) => void; onTarget: (selection: BookSelection | null) => void; target: BookSelection | null; onControlsReady: (controls: RoomControlsHandle | null) => void; onLock: () => void; onUnlock: () => void }) {
  return <>
    <RoomEnvironment />
    <VintageGate position={[0, 0, ROOM_HALF - 0.33]} />
    <EntranceFoliage position={[0, 0, ROOM_HALF - 0.62]} />
    <PerimeterFoliage roomHalf={ROOM_HALF} bookcaseFace={BOOKCASE_FACE} bookcaseWidth={BOOKCASE_WIDTH} tierY={TIER_Y} />
    <Bookcase wall="left" /><Bookcase wall="rear" /><Bookcase wall="right" />
    <RoomCentrepiece />
    <BookCollection
      books={books}
      tableBooks={tableBooks}
      matchingSerials={matchingSerials}
      onSelect={onSelect}
      onTarget={onTarget}
      target={target}
      shelfWidth={SHELF_WIDTH}
      bookFace={BOOK_FACE}
      tierY={TIER_Y}
      slotsPerTier={SLOTS_PER_TIER}
      capacity={roomLayout.totalCapacity}
    />
    <CameraRig mobile={mobile} onSelect={onSelect} target={target} onControlsReady={onControlsReady} onLock={onLock} onUnlock={onUnlock} />
  </>;
}

export default function RoomScene({ books, tableBooks, matchingSerials, onSelect, onTarget, target, mobile, onControlsReady, onLock, onUnlock }: { books: Book[]; tableBooks: Book[]; matchingSerials: Set<number>; onSelect: (selection: BookSelection) => void; onTarget: (selection: BookSelection | null) => void; target: BookSelection | null; mobile: boolean; onControlsReady: (controls: RoomControlsHandle | null) => void; onLock: () => void; onUnlock: () => void }) {
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor(ROOM_WALL_COLOR);
    gl.shadowMap.enabled = !mobile;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [mobile]);
  return <Canvas camera={{ position:[0,CAMERA_HEIGHT,0.7], fov:68, near:0.1, far:40 }} dpr={mobile ? [1,1.25] : [1,1.7]} shadows={!mobile} onCreated={handleCreated} gl={{ antialias:true, powerPreference:"high-performance" }}>
    <Scene books={books} tableBooks={tableBooks} matchingSerials={matchingSerials} mobile={mobile} onSelect={onSelect} onTarget={onTarget} target={target} onControlsReady={onControlsReady} onLock={onLock} onUnlock={onUnlock} />
  </Canvas>;
}
