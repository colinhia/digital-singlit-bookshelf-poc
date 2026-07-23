"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface BoxInstance {
  position: [number, number, number];
  scale: [number, number, number];
}

export function InstancedBoxes({
  instances,
  material,
  color,
  roughness,
  metalness,
  castShadow = false,
  receiveShadow = false,
}: {
  instances: readonly BoxInstance[];
  material?: THREE.Material;
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    instances.forEach((instance, index) => {
      matrix.compose(
        position.set(...instance.position),
        quaternion,
        scale.set(...instance.scale),
      );
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (castShadow && gl.shadowMap.enabled) gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [castShadow, gl, instances, invalidate]);

  return <instancedMesh
    ref={meshRef}
    args={[undefined, undefined, Math.max(1, instances.length)]}
    material={material}
    castShadow={castShadow}
    receiveShadow={receiveShadow}
  >
    <boxGeometry />
    {!material && <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />}
  </instancedMesh>;
}
