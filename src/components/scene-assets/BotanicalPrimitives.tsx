"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type Point = [number, number, number];

export interface PartTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  color: THREE.Color;
}

export function InstancedFlatParts({ transforms }: { transforms: PartTransform[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    transforms.forEach((transform, index) => {
      matrix.compose(transform.position, transform.quaternion, transform.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, transform.color);
    });
    mesh.count = transforms.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow>
    <circleGeometry args={[1, 7]} />
    <meshStandardMaterial color="#ffffff" roughness={0.94} metalness={0} side={THREE.DoubleSide} />
  </instancedMesh>;
}

export function InstancedLeafParts({ transforms }: { transforms: PartTransform[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const leafShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.45, 0.08, -1, 0.48, 0, 1);
    shape.bezierCurveTo(1, 0.48, 0.45, 0.08, 0, 0);
    return shape;
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    transforms.forEach((transform, index) => {
      matrix.compose(transform.position, transform.quaternion, transform.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, transform.color);
    });
    mesh.count = transforms.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow>
    <shapeGeometry args={[leafShape, 5]} />
    <meshStandardMaterial color="#ffffff" roughness={0.96} metalness={0} side={THREE.DoubleSide} />
  </instancedMesh>;
}

export function InstancedRoundParts({ transforms }: { transforms: PartTransform[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    transforms.forEach((transform, index) => {
      matrix.compose(transform.position, transform.quaternion, transform.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, transform.color);
    });
    mesh.count = transforms.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow>
    <sphereGeometry args={[1, 7, 5]} />
    <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0} />
  </instancedMesh>;
}

export function StemSegment({ from, to, radius = 0.018, color = "#38523a" }: {
  from: Point;
  to: Point;
  radius?: number;
  color?: string;
}) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    return {
      position: start.clone().add(end).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    };
  }, [from, to]);

  return <mesh position={transform.position} quaternion={transform.quaternion} castShadow>
    <cylinderGeometry args={[radius, radius * 0.82, transform.length, 6]} />
    <meshStandardMaterial color={color} roughness={0.98} />
  </mesh>;
}
