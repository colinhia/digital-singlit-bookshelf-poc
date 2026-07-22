"use client";

import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { PhotoOption } from "@/experiences/mylibrary/photoOptions";

const FRAME_WIDTH = 0.82;
const FRAME_HEIGHT = 0.6;
const FRAME_RAIL = 0.075;
const APERTURE_WIDTH = 0.62;
const APERTURE_HEIGHT = 0.4;

function FramedPhoto({ photo }: { photo: PhotoOption }) {
  const texture = useTexture(photo.textureSrc);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const dimensions = useMemo<[number, number]>(() => {
    const apertureRatio = APERTURE_WIDTH / APERTURE_HEIGHT;
    return photo.aspectRatio >= apertureRatio
      ? [APERTURE_WIDTH, APERTURE_WIDTH / photo.aspectRatio]
      : [APERTURE_HEIGHT * photo.aspectRatio, APERTURE_HEIGHT];
  }, [photo.aspectRatio]);

  return <mesh position={[0, 0, 0.048]}>
    <planeGeometry args={dimensions} />
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

export function WoodenPictureFrame({
  photo,
  highlighted = false,
  groupRef,
  position,
  rotation = [0, 0, 0],
}: {
  photo: PhotoOption | null;
  highlighted?: boolean;
  groupRef?: RefObject<THREE.Group>;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const woodColor = highlighted ? "#a95147" : "#684126";
  return <group
    ref={groupRef}
    position={position}
    rotation={rotation}
    userData={{ pictureFrameTarget: true }}
  >
    <mesh position={[0, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[FRAME_WIDTH, FRAME_HEIGHT, 0.045]} />
      <meshStandardMaterial color="#3f2a1d" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0, 0.028]} receiveShadow>
      <boxGeometry args={[FRAME_WIDTH - FRAME_RAIL * 1.35, FRAME_HEIGHT - FRAME_RAIL * 1.35, 0.025]} />
      <meshStandardMaterial color="#dfd2bd" roughness={0.96} />
    </mesh>
    {photo && <Suspense fallback={null}><FramedPhoto photo={photo} /></Suspense>}
    <mesh position={[0, FRAME_HEIGHT / 2 - FRAME_RAIL / 2, 0.062]} castShadow>
      <boxGeometry args={[FRAME_WIDTH, FRAME_RAIL, 0.085]} />
      <meshStandardMaterial color={woodColor} roughness={0.8} />
    </mesh>
    <mesh position={[0, -FRAME_HEIGHT / 2 + FRAME_RAIL / 2, 0.062]} castShadow>
      <boxGeometry args={[FRAME_WIDTH, FRAME_RAIL, 0.085]} />
      <meshStandardMaterial color={woodColor} roughness={0.8} />
    </mesh>
    <mesh position={[-FRAME_WIDTH / 2 + FRAME_RAIL / 2, 0, 0.062]} castShadow>
      <boxGeometry args={[FRAME_RAIL, FRAME_HEIGHT - FRAME_RAIL * 2, 0.085]} />
      <meshStandardMaterial color={woodColor} roughness={0.8} />
    </mesh>
    <mesh position={[FRAME_WIDTH / 2 - FRAME_RAIL / 2, 0, 0.062]} castShadow>
      <boxGeometry args={[FRAME_RAIL, FRAME_HEIGHT - FRAME_RAIL * 2, 0.085]} />
      <meshStandardMaterial color={woodColor} roughness={0.8} />
    </mesh>
  </group>;
}
