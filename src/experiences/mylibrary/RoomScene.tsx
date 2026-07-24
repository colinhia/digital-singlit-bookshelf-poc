"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import type { RoomControlsHandle } from "@/types/library";
import type { Book } from "@/types/library";
import { Bookcase } from "@/components/scene-assets/Bookcase";
import { MosaicStool } from "@/components/scene-assets/MosaicStool";
import type { FlowerVariant } from "@/components/scene-assets/PlanterFlowers";
import { ROOM_WALL_COLOR, RoomEnvironment } from "@/components/scene-assets/RoomEnvironment";
import { TiledDisplayTable } from "@/components/scene-assets/TiledDisplayTable";
import { VintageGate } from "@/components/scene-assets/VintageGate";
import { ROOM_HALF } from "@/components/scene-assets/roomLayout";
import {
  MY_LIBRARY_STOOL_POSITION,
  MY_LIBRARY_TABLE_POSITION,
  READING_LIST_BOOKCASE_HEIGHT,
  READING_LIST_BOOKCASE_WIDTH,
  READING_LIST_TIER_Y,
} from "@/experiences/mylibrary/layout";
import type { MyLibraryTarget } from "@/experiences/mylibrary/types";
import type { PhotoOption } from "@/experiences/mylibrary/photoOptions";
import CuratedBooks from "@/experiences/mylibrary/CuratedBooks";
import { StaticShadowMap } from "@/components/scene-assets/StaticShadowMap";

const CAMERA_HEIGHT = 3.53;
const MOBILE_MIN_PITCH = -0.72;
const MOBILE_MAX_PITCH = 1.05;

function CameraRig({
  mobile,
  target,
  onActivateTarget,
  onControlsReady,
  onLock,
  onUnlock,
}: {
  mobile: boolean;
  target: MyLibraryTarget | null;
  onActivateTarget: (target: MyLibraryTarget) => void;
  onControlsReady: (controls: RoomControlsHandle | null) => void;
  onLock: () => void;
  onUnlock: () => void;
}) {
  const { camera, gl, invalidate } = useThree();
  const drag = useRef({ active: false, moved: false, x: 0, y: 0 });
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);

  useEffect(() => {
    camera.position.set(0, CAMERA_HEIGHT, 0.7);
    camera.rotation.order = "YXZ";
    camera.lookAt(0, CAMERA_HEIGHT, -5);
    invalidate();
  }, [camera, invalidate]);

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
    const down = (event: PointerEvent) => {
      drag.current = { active: true, moved: false, x: event.clientX, y: event.clientY };
    };
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
      invalidate();
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
    };
    const up = () => {
      if (!drag.current.moved && target) onActivateTarget(target);
      drag.current.active = false;
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
    };
  }, [camera, gl.domElement, invalidate, mobile, onActivateTarget, target]);

  return mobile ? null : <PointerLockControls
    ref={controlsRef}
    makeDefault
    selector="#no-automatic-pointer-lock"
    onLock={onLock}
    onUnlock={onUnlock}
  />;
}

function Scene(props: MyLibraryRoomSceneProps) {
  const shadowRevision = useMemo(
    () => ({
      completedBooks: props.completedBooks,
      currentlyReadingBook: props.currentlyReadingBook,
      flowerVariant: props.flowerVariant,
      readingListBooks: props.readingListBooks,
    }),
    [
      props.completedBooks,
      props.currentlyReadingBook,
      props.flowerVariant,
      props.readingListBooks,
    ],
  );

  return <>
    <StaticShadowMap enabled={!props.mobile} revision={shadowRevision} />
    <RoomEnvironment />
    <VintageGate position={[0, 0, ROOM_HALF - 0.33]} />
    <Bookcase wall="rear" />
    <Bookcase
      wall="left"
      width={READING_LIST_BOOKCASE_WIDTH}
      height={READING_LIST_BOOKCASE_HEIGHT}
      tierY={READING_LIST_TIER_Y}
    />
    <TiledDisplayTable position={MY_LIBRARY_TABLE_POSITION} />
    <MosaicStool position={MY_LIBRARY_STOOL_POSITION} />
    <CuratedBooks
      readingListBooks={props.readingListBooks}
      completedBooks={props.completedBooks}
      currentlyReadingBook={props.currentlyReadingBook}
      framePhoto={props.framePhoto}
      frameEditable={props.frameEditable}
      flowerVariant={props.flowerVariant}
      flowerEditable={props.flowerEditable}
      target={props.target}
      onTarget={props.onTarget}
      onActivateTarget={props.onActivateTarget}
    />
    <CameraRig
      mobile={props.mobile}
      target={props.target}
      onActivateTarget={props.onActivateTarget}
      onControlsReady={props.onControlsReady}
      onLock={props.onLock}
      onUnlock={props.onUnlock}
    />
  </>;
}

interface MyLibraryRoomSceneProps {
  readingListBooks: Book[];
  completedBooks: Book[];
  currentlyReadingBook: Book | null;
  framePhoto: PhotoOption | null;
  frameEditable: boolean;
  flowerVariant: FlowerVariant;
  flowerEditable: boolean;
  mobile: boolean;
  target: MyLibraryTarget | null;
  onTarget: (target: MyLibraryTarget | null) => void;
  onActivateTarget: (target: MyLibraryTarget) => void;
  onControlsReady: (controls: RoomControlsHandle | null) => void;
  onLock: () => void;
  onUnlock: () => void;
}

function RoomScene(props: MyLibraryRoomSceneProps) {
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor(ROOM_WALL_COLOR);
    gl.shadowMap.enabled = !props.mobile;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = !props.mobile;
  }, [props.mobile]);

  return <Canvas
    camera={{ position: [0, CAMERA_HEIGHT, 0.7], fov: 68, near: 0.1, far: 40 }}
    dpr={props.mobile ? [1, 1.25] : [1, 1.7]}
    frameloop="demand"
    shadows={!props.mobile}
    onCreated={handleCreated}
    gl={{ antialias: true, powerPreference: "high-performance" }}
  >
    <Scene {...props} />
  </Canvas>;
}

export default memo(RoomScene);
