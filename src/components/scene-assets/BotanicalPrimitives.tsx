"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Point = [number, number, number];

export interface StemSegmentSpec {
  from: Point;
  to: Point;
}

export interface PartTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  color: THREE.Color;
}

export function InstancedFlatParts({ transforms }: { transforms: PartTransform[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

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
    invalidate();
  }, [invalidate, transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow>
    <circleGeometry args={[1, 7]} />
    <meshStandardMaterial color="#ffffff" roughness={0.94} metalness={0} side={THREE.DoubleSide} />
  </instancedMesh>;
}

export function InstancedLeafParts({ transforms }: { transforms: PartTransform[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
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
    invalidate();
  }, [invalidate, transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow>
    <shapeGeometry args={[leafShape, 5]} />
    <meshStandardMaterial color="#ffffff" roughness={0.96} metalness={0} side={THREE.DoubleSide} />
  </instancedMesh>;
}

export function InstancedRoundParts({ transforms }: { transforms: PartTransform[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

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
    invalidate();
  }, [invalidate, transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} castShadow>
    <sphereGeometry args={[1, 7, 5]} />
    <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0} />
  </instancedMesh>;
}

export function InstancedStemSegments({
  segments,
  radius = 0.018,
  color = "#38523a",
}: {
  segments: readonly StemSegmentSpec[];
  radius?: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    segments.forEach((segment, index) => {
      start.set(...segment.from);
      end.set(...segment.to);
      direction.subVectors(end, start);
      const length = direction.length();
      position.addVectors(start, end).multiplyScalar(0.5);
      quaternion.setFromUnitVectors(up, direction.normalize());
      matrix.compose(position, quaternion, scale.set(radius, length, radius));
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = segments.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (gl.shadowMap.enabled) gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate, radius, segments]);

  return <instancedMesh
    ref={meshRef}
    args={[undefined, undefined, Math.max(1, segments.length)]}
    castShadow
  >
    <cylinderGeometry args={[1, 0.82, 1, 6]} />
    <meshStandardMaterial color={color} roughness={0.98} />
  </instancedMesh>;
}
