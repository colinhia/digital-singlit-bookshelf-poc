"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

const GATE_HEIGHT = 4.22;
const INNER_WIDTH = 1.84;
const OUTER_WIDTH = 2.08;
const LEAF_GAP = 0.04;
const LEAF_WIDTH = (INNER_WIDTH - LEAF_GAP) / 2;
const GATE_DEPTH = 0.075;
const OPEN_ANGLE = -THREE.MathUtils.degToRad(18);
const BAR_POSITIONS = [-0.3, -0.15, 0, 0.15, 0.3];

function GateLeaf({ material, rustMaterial }: {
  material: THREE.MeshStandardMaterial;
  rustMaterial: THREE.MeshStandardMaterial;
}) {
  const sideX = LEAF_WIDTH / 2 - 0.035;
  return <group>
    {[-sideX, sideX].map((x) => <mesh key={`side-${x}`} position={[x, GATE_HEIGHT / 2, 0]} material={material} castShadow>
      <boxGeometry args={[0.07, GATE_HEIGHT, GATE_DEPTH]} />
    </mesh>)}
    {[0.05, GATE_HEIGHT - 0.05].map((y) => <mesh key={`edge-${y}`} position={[0, y, 0]} material={material} castShadow>
      <boxGeometry args={[LEAF_WIDTH, 0.1, GATE_DEPTH]} />
    </mesh>)}
    {BAR_POSITIONS.map((x, index) => <mesh key={`bar-${x}`} position={[x, GATE_HEIGHT / 2, 0]} material={material} castShadow>
      <boxGeometry args={[index === 2 ? 0.045 : 0.035, GATE_HEIGHT - 0.18, GATE_DEPTH * 0.72]} />
    </mesh>)}
    {[1.03, 2.64].map((y) => <mesh key={`rail-${y}`} position={[0, y, -0.002]} material={material} castShadow>
      <boxGeometry args={[LEAF_WIDTH - 0.08, 0.065, GATE_DEPTH * 0.9]} />
    </mesh>)}
    <mesh position={[0, 2.14, -0.012]} material={material} castShadow>
      <boxGeometry args={[LEAF_WIDTH - 0.07, 0.48, GATE_DEPTH * 1.08]} />
    </mesh>
    <mesh position={[-0.17, 0.32, -0.052]} material={rustMaterial}>
      <boxGeometry args={[0.15, 0.025, 0.012]} />
    </mesh>
  </group>;
}

export function VintageGate({ position }: { position: [number, number, number] }) {
  const materials = useMemo(() => ({
    cream: new THREE.MeshStandardMaterial({ color: "#cfc09e", roughness: 0.88, metalness: 0.12 }),
    creamLight: new THREE.MeshStandardMaterial({ color: "#ddd0b2", roughness: 0.9, metalness: 0.1 }),
    rust: new THREE.MeshStandardMaterial({ color: "#744534", roughness: 0.98, metalness: 0.05 }),
  }), []);

  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);

  const frameSideX = OUTER_WIDTH / 2 - 0.055;
  const rightHingeX = INNER_WIDTH / 2;
  return <group position={position}>
    <mesh position={[0, 2.45, 0.09]} receiveShadow>
      <boxGeometry args={[2.2, 4.7, 0.18]} />
      <meshStandardMaterial color="#624737" roughness={0.96} />
    </mesh>
    <mesh position={[0, 2.45, -0.015]}>
      <planeGeometry args={[1.88, 4.32]} />
      <meshBasicMaterial color="#292c2f" side={THREE.DoubleSide} toneMapped={false} />
    </mesh>

    <group position={[0, 0.34, -0.11]}>
      {[-frameSideX, frameSideX].map((x) => <mesh key={`frame-${x}`} position={[x, GATE_HEIGHT / 2, 0]} material={materials.cream} castShadow>
        <boxGeometry args={[0.11, GATE_HEIGHT + 0.22, 0.11]} />
      </mesh>)}
      {[0, GATE_HEIGHT].map((y) => <mesh key={`frame-edge-${y}`} position={[0, y, 0]} material={materials.cream} castShadow>
        <boxGeometry args={[OUTER_WIDTH, 0.11, 0.11]} />
      </mesh>)}

      <group position={[-LEAF_GAP / 2 - LEAF_WIDTH / 2, 0, -0.035]}>
        <GateLeaf material={materials.creamLight} rustMaterial={materials.rust} />
        <mesh position={[LEAF_WIDTH / 2 - 0.08, 2.14, -0.075]} material={materials.rust}>
          <boxGeometry args={[0.16, 0.12, 0.055]} />
        </mesh>
      </group>
      <group position={[rightHingeX, 0, -0.035]} rotation={[0, OPEN_ANGLE, 0]}>
        <group position={[-LEAF_WIDTH / 2, 0, 0]}>
          <GateLeaf material={materials.cream} rustMaterial={materials.rust} />
          <mesh position={[-LEAF_WIDTH / 2 + 0.08, 2.14, -0.075]} material={materials.rust}>
            <boxGeometry args={[0.13, 0.22, 0.055]} />
          </mesh>
        </group>
      </group>

      {[-1, 1].flatMap((side) => [1.08, 3.2].map((y) => <group key={`hinge-${side}-${y}`} position={[side * frameSideX, y, -0.08]}>
        <mesh material={materials.cream} castShadow><boxGeometry args={[0.15, 0.3, 0.14]} /></mesh>
        <mesh position={[0, -0.13, -0.075]} material={materials.rust}><boxGeometry args={[0.075, 0.035, 0.02]} /></mesh>
      </group>))}
    </group>

    <mesh position={[0.31, 0.018, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.72, 0.92]} />
      <meshBasicMaterial color="#f1b477" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}
