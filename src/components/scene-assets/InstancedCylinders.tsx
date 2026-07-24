"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Point } from "@/components/scene-assets/BotanicalPrimitives";

export function InstancedCylinders({
  positions,
  radiusTop,
  radiusBottom,
  height,
  radialSegments,
  color,
  roughness,
  castShadow = false,
  receiveShadow = false,
}: {
  positions: readonly Point[];
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
  color: THREE.ColorRepresentation;
  roughness: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    positions.forEach((position, index) => {
      matrix.makeTranslation(...position);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = positions.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (castShadow && gl.shadowMap.enabled) gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [castShadow, gl, invalidate, positions]);

  return <instancedMesh
    ref={meshRef}
    args={[undefined, undefined, Math.max(1, positions.length)]}
    castShadow={castShadow}
    receiveShadow={receiveShadow}
  >
    <cylinderGeometry args={[radiusTop, radiusBottom, height, radialSegments]} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </instancedMesh>;
}
