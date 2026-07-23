"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { InstancedBoxes, type BoxInstance } from "@/components/scene-assets/InstancedBoxes";

const GATE_HEIGHT = 4.22;
const INNER_WIDTH = 1.84;
const OUTER_WIDTH = 2.08;
const LEAF_GAP = 0.04;
const LEAF_WIDTH = (INNER_WIDTH - LEAF_GAP) / 2;
const GATE_DEPTH = 0.075;
const OPEN_ANGLE = -THREE.MathUtils.degToRad(18);
const BAR_POSITIONS = [-0.3, -0.15, 0, 0.15, 0.3];
const FRAME_SIDE_X = OUTER_WIDTH / 2 - 0.055;
const GATE_LEAF_BOXES: BoxInstance[] = [
  {
    position: [-LEAF_WIDTH / 2 + 0.035, GATE_HEIGHT / 2, 0],
    scale: [0.07, GATE_HEIGHT, GATE_DEPTH],
  },
  {
    position: [LEAF_WIDTH / 2 - 0.035, GATE_HEIGHT / 2, 0],
    scale: [0.07, GATE_HEIGHT, GATE_DEPTH],
  },
  { position: [0, 0.05, 0], scale: [LEAF_WIDTH, 0.1, GATE_DEPTH] },
  { position: [0, GATE_HEIGHT - 0.05, 0], scale: [LEAF_WIDTH, 0.1, GATE_DEPTH] },
  ...BAR_POSITIONS.map((x, index): BoxInstance => ({
    position: [x, GATE_HEIGHT / 2, 0],
    scale: [index === 2 ? 0.045 : 0.035, GATE_HEIGHT - 0.18, GATE_DEPTH * 0.72],
  })),
  { position: [0, 1.03, -0.002], scale: [LEAF_WIDTH - 0.08, 0.065, GATE_DEPTH * 0.9] },
  { position: [0, 2.64, -0.002], scale: [LEAF_WIDTH - 0.08, 0.065, GATE_DEPTH * 0.9] },
  { position: [0, 2.14, -0.012], scale: [LEAF_WIDTH - 0.07, 0.48, GATE_DEPTH * 1.08] },
];
const OUTER_FRAME_BOXES: BoxInstance[] = [
  {
    position: [-FRAME_SIDE_X, GATE_HEIGHT / 2, 0],
    scale: [0.11, GATE_HEIGHT + 0.22, 0.11],
  },
  {
    position: [FRAME_SIDE_X, GATE_HEIGHT / 2, 0],
    scale: [0.11, GATE_HEIGHT + 0.22, 0.11],
  },
  { position: [0, 0, 0], scale: [OUTER_WIDTH, 0.11, 0.11] },
  { position: [0, GATE_HEIGHT, 0], scale: [OUTER_WIDTH, 0.11, 0.11] },
];
const HINGE_BOXES: BoxInstance[] = [-1, 1].flatMap((side) => [1.08, 3.2].map((y) => ({
  position: [side * FRAME_SIDE_X, y, -0.08],
  scale: [0.15, 0.3, 0.14],
})));
const HINGE_RUST_BOXES: BoxInstance[] = [-1, 1].flatMap((side) => [1.08, 3.2].map((y) => ({
  position: [side * FRAME_SIDE_X, y - 0.13, -0.155],
  scale: [0.075, 0.035, 0.02],
})));

function GateLeaf({ material, rustMaterial }: {
  material: THREE.MeshStandardMaterial;
  rustMaterial: THREE.MeshStandardMaterial;
}) {
  return <group>
    <InstancedBoxes instances={GATE_LEAF_BOXES} material={material} castShadow />
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
      <InstancedBoxes instances={OUTER_FRAME_BOXES} material={materials.cream} castShadow />

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

      <InstancedBoxes instances={HINGE_BOXES} material={materials.cream} castShadow />
      <InstancedBoxes instances={HINGE_RUST_BOXES} material={materials.rust} />
    </group>

    <mesh position={[0.31, 0.018, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.72, 0.92]} />
      <meshBasicMaterial color="#f1b477" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>;
}
