"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  InstancedFlatParts,
  InstancedLeafParts,
  InstancedRoundParts,
  StemSegment,
  type PartTransform,
  type Point,
} from "@/components/scene-assets/BotanicalPrimitives";

const LEAF_COLORS = ["#31563a", "#416840", "#557846"];
const ORCHID_PETAL_COLORS = ["#d99ad8", "#ca86cd", "#e2a8df"];
const ORCHID_STEMS: Point[][] = [
  [[-0.32, 0.43, -0.01], [-0.34, 0.9, -0.02], [-0.4, 1.38, -0.03]],
  [[-0.16, 0.43, 0], [-0.19, 0.98, -0.01], [-0.16, 1.55, -0.02]],
  [[0, 0.43, 0.01], [-0.01, 0.96, 0], [0.02, 1.5, -0.02]],
  [[0.16, 0.43, 0], [0.2, 0.9, -0.01], [0.25, 1.4, -0.03]],
  [[0.32, 0.43, -0.01], [0.36, 0.82, 0], [0.4, 1.27, -0.02]],
];

export type FlowerVariant = "empty" | "bougainvillea" | "orchid" | "sunflower";

const BOUGAINVILLEA_STEMS: Point[][] = [
  [[-0.3, 0.43, 0], [-0.25, 0.78, -0.01], [-0.34, 1.12, -0.02]],
  [[-0.12, 0.43, 0], [-0.08, 0.86, -0.01], [-0.12, 1.28, -0.02]],
  [[0.08, 0.43, 0], [0.03, 0.82, -0.01], [0.12, 1.22, -0.02]],
  [[0.28, 0.43, 0], [0.24, 0.72, -0.01], [0.32, 1.06, -0.02]],
];

const SUNFLOWER_STEMS: Point[][] = [
  [[-0.27, 0.43, 0], [-0.28, 0.85, -0.01], [-0.3, 1.25, -0.02]],
  [[-0.1, 0.43, 0], [-0.08, 0.95, -0.01], [-0.12, 1.48, -0.02]],
  [[0.1, 0.43, 0], [0.08, 0.9, -0.01], [0.12, 1.38, -0.02]],
  [[0.28, 0.43, 0], [0.25, 0.78, -0.01], [0.3, 1.17, -0.02]],
];

export function PlanterTrough({ highlighted = false }: { highlighted?: boolean }) {
  return <group>
    <mesh position={[0, 0.19, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.85, 0.38, 0.4]} />
      <meshStandardMaterial color={highlighted ? "#d29270" : "#a96c51"} roughness={0.94} />
    </mesh>
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[0.93, 0.08, 0.46]} />
      <meshStandardMaterial color={highlighted ? "#e0a383" : "#c18768"} roughness={0.92} />
    </mesh>
    <mesh position={[0, 0.445, -0.005]}>
      <boxGeometry args={[0.77, 0.025, 0.32]} />
      <meshStandardMaterial color="#49392f" roughness={1} />
    </mesh>
  </group>;
}

export function OrchidPlant() {
  const { leaves, petals, lips, centres } = useMemo(() => {
    const flowerCentres = [
      [-0.44, 1.34, -0.08], [-0.32, 1.45, -0.075],
      [-0.19, 1.5, -0.085], [-0.09, 1.61, -0.08],
      [0.02, 1.52, -0.075], [0.13, 1.42, -0.08],
      [0.24, 1.48, -0.085], [0.34, 1.32, -0.075],
      [0.44, 1.23, -0.08],
    ].map((point) => new THREE.Vector3(...point));

    return {
      leaves: [
        { position: [-0.33, 0.63, -0.035] as Point, angle: 0.34, width: 0.06, length: 0.36 },
        { position: [-0.335, 0.82, -0.045] as Point, angle: -0.14, width: 0.056, length: 0.3 },
        { position: [-0.175, 0.67, -0.045] as Point, angle: 0.27, width: 0.065, length: 0.39 },
        { position: [-0.185, 0.88, -0.055] as Point, angle: -0.18, width: 0.057, length: 0.32 },
        { position: [-0.005, 0.65, -0.05] as Point, angle: 0.2, width: 0.062, length: 0.37 },
        { position: [-0.008, 0.87, -0.06] as Point, angle: -0.16, width: 0.055, length: 0.3 },
        { position: [0.18, 0.64, -0.045] as Point, angle: -0.29, width: 0.064, length: 0.37 },
        { position: [0.195, 0.83, -0.055] as Point, angle: 0.16, width: 0.056, length: 0.3 },
        { position: [0.33, 0.61, -0.035] as Point, angle: -0.36, width: 0.06, length: 0.34 },
        { position: [0.355, 0.77, -0.045] as Point, angle: 0.13, width: 0.053, length: 0.29 },
      ].map((leaf, index): PartTransform => ({
        position: new THREE.Vector3(...leaf.position),
        quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(
          index % 2 === 0 ? 0.12 : 0.04,
          index % 3 === 0 ? -0.08 : 0.05,
          leaf.angle,
        )),
        scale: new THREE.Vector3(leaf.width, leaf.length, 1),
        color: new THREE.Color(LEAF_COLORS[(index + 1) % LEAF_COLORS.length]),
      })),
      petals: flowerCentres.flatMap((centre, flowerIndex) => Array.from({ length: 5 }, (_, petalIndex): PartTransform => {
        const angle = petalIndex * Math.PI * 2 / 5 + Math.PI / 2;
        const isUpperPetal = petalIndex === 0;
        return {
          position: centre.clone().add(new THREE.Vector3(Math.cos(angle) * 0.075, Math.sin(angle) * 0.075, -0.008)),
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, 0.05 * Math.sin(flowerIndex), angle - Math.PI / 2)),
          scale: new THREE.Vector3(isUpperPetal ? 0.082 : 0.094, isUpperPetal ? 0.143 : 0.126, 1),
          color: new THREE.Color(ORCHID_PETAL_COLORS[(flowerIndex + petalIndex) % ORCHID_PETAL_COLORS.length]),
        };
      })),
      lips: flowerCentres.map((centre, index): PartTransform => ({
        position: centre.clone().add(new THREE.Vector3(0, -0.045, -0.022)),
        quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, 0, index % 2 ? 0.08 : -0.08)),
        scale: new THREE.Vector3(0.079, 0.105, 1),
        color: new THREE.Color(index % 2 ? "#a62d75" : "#92255f"),
      })),
      centres: flowerCentres.map((centre, index): PartTransform => ({
        position: centre.clone().add(new THREE.Vector3(0, -0.005, -0.035)),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(0.024, 0.031, 0.015),
        color: new THREE.Color(index % 2 ? "#efb277" : "#e7a166"),
      })),
    };
  }, []);

  return <group position={[0, 0.06, 0]}>
    {ORCHID_STEMS.flatMap((path, pathIndex) => path.slice(0, -1).map((point, index) => <StemSegment
      key={`orchid-stem-${pathIndex}-${index}`}
      from={point}
      to={path[index + 1]}
      radius={0.009}
      color="#456b42"
    />))}
    <InstancedLeafParts transforms={leaves} />
    <InstancedFlatParts transforms={petals} />
    <InstancedFlatParts transforms={lips} />
    <InstancedRoundParts transforms={centres} />
  </group>;
}

function CompactBougainvilleaPlant() {
  const { leaves, bracts, centres } = useMemo(() => {
    const leafSpecs = [
      [-0.27, 0.57, 0.01, 0.34], [-0.24, 0.82, 0, -0.24],
      [-0.1, 0.62, -0.01, -0.28], [-0.08, 0.94, 0, 0.25],
      [0.06, 0.58, 0, 0.3], [0.06, 0.88, -0.01, -0.24],
      [0.26, 0.57, 0.01, -0.34], [0.25, 0.78, 0, 0.24],
      [-0.32, 0.98, 0, 0.2], [-0.13, 1.1, 0, -0.18],
      [0.13, 1.04, 0, 0.18], [0.31, 0.93, 0, -0.2],
    ] as const;
    const flowerCentres = [
      [-0.34, 1.12, -0.04], [-0.2, 1.01, -0.05], [-0.12, 1.28, -0.04],
      [0.02, 1.13, -0.05], [0.12, 1.22, -0.04], [0.23, 1.02, -0.05],
      [0.32, 1.06, -0.04],
    ].map((point) => new THREE.Vector3(...point));
    return {
      leaves: leafSpecs.map(([x, y, z, angle], index): PartTransform => ({
        position: new THREE.Vector3(x, y, z),
        quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, index % 2 ? 0.08 : -0.05, angle)),
        scale: new THREE.Vector3(0.055, 0.24, 1),
        color: new THREE.Color(LEAF_COLORS[index % LEAF_COLORS.length]),
      })),
      bracts: flowerCentres.flatMap((centre, flowerIndex) => Array.from({ length: 3 }, (_, index): PartTransform => {
        const angle = index * Math.PI * 2 / 3 + Math.PI / 2;
        return {
          position: centre.clone().add(new THREE.Vector3(Math.cos(angle) * 0.052, Math.sin(angle) * 0.052, 0)),
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, 0, angle - Math.PI / 2)),
          scale: new THREE.Vector3(0.07, 0.09, 1),
          color: new THREE.Color(["#c74eaa", "#db68bd", "#b83f9b"][(flowerIndex + index) % 3]),
        };
      })),
      centres: flowerCentres.map((centre, index): PartTransform => ({
        position: centre.clone().add(new THREE.Vector3(0, 0, -0.018)),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(0.018, 0.018, 0.012),
        color: new THREE.Color(index % 2 ? "#f1d08b" : "#e7bc68"),
      })),
    };
  }, []);

  return <group>
    {BOUGAINVILLEA_STEMS.flatMap((path, pathIndex) => path.slice(0, -1).map((point, index) => <StemSegment
      key={`trough-bougainvillea-${pathIndex}-${index}`}
      from={point}
      to={path[index + 1]}
      radius={0.012}
      color="#41633d"
    />))}
    <InstancedLeafParts transforms={leaves} />
    <InstancedFlatParts transforms={bracts} />
    <InstancedRoundParts transforms={centres} />
  </group>;
}

function SunflowerPlant() {
  const { leaves, petals, innerCentres, outerCentres } = useMemo(() => {
    const flowerCentres = [
      [-0.3, 1.25, -0.05], [-0.12, 1.48, -0.055],
      [0.12, 1.38, -0.05], [0.3, 1.17, -0.055],
    ].map((point) => new THREE.Vector3(...point));
    const leafSpecs = [
      [-0.28, 0.67, -0.01, 0.38], [-0.27, 0.88, -0.02, -0.24],
      [-0.09, 0.72, -0.01, -0.32], [-0.08, 1.02, -0.02, 0.2],
      [0.09, 0.68, -0.01, 0.3], [0.09, 0.96, -0.02, -0.22],
      [0.27, 0.64, -0.01, -0.38], [0.26, 0.84, -0.02, 0.24],
    ] as const;
    return {
      leaves: leafSpecs.map(([x, y, z, angle], index): PartTransform => ({
        position: new THREE.Vector3(x, y, z),
        quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, index % 2 ? 0.06 : -0.05, angle)),
        scale: new THREE.Vector3(0.075, index % 2 ? 0.3 : 0.34, 1),
        color: new THREE.Color(LEAF_COLORS[(index + 1) % LEAF_COLORS.length]),
      })),
      petals: flowerCentres.flatMap((centre, flowerIndex) => Array.from({ length: 12 }, (_, index): PartTransform => {
        const angle = index * Math.PI * 2 / 12;
        return {
          position: centre.clone().add(new THREE.Vector3(Math.cos(angle) * 0.095, Math.sin(angle) * 0.095, 0)),
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, 0, angle - Math.PI / 2)),
          scale: new THREE.Vector3(0.043, 0.105, 1),
          color: new THREE.Color((flowerIndex + index) % 3 === 0 ? "#d6a62d" : "#e1b83f"),
        };
      })),
      outerCentres: flowerCentres.map((centre): PartTransform => ({
        position: centre.clone().add(new THREE.Vector3(0, 0, -0.018)),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(0.09, 0.09, 0.025),
        color: new THREE.Color("#6f4528"),
      })),
      innerCentres: flowerCentres.map((centre): PartTransform => ({
        position: centre.clone().add(new THREE.Vector3(0, 0, -0.04)),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(0.055, 0.055, 0.03),
        color: new THREE.Color("#3f2a20"),
      })),
    };
  }, []);

  return <group>
    {SUNFLOWER_STEMS.flatMap((path, pathIndex) => path.slice(0, -1).map((point, index) => <StemSegment
      key={`sunflower-${pathIndex}-${index}`}
      from={point}
      to={path[index + 1]}
      radius={0.014}
      color="#496c3e"
    />))}
    <InstancedLeafParts transforms={leaves} />
    <InstancedFlatParts transforms={petals} />
    <InstancedRoundParts transforms={outerCentres} />
    <InstancedRoundParts transforms={innerCentres} />
  </group>;
}

export function FlowerTrough({ variant, highlighted = false }: { variant: FlowerVariant; highlighted?: boolean }) {
  return <group>
    <PlanterTrough highlighted={highlighted} />
    {variant === "bougainvillea" && <CompactBougainvilleaPlant />}
    {variant === "orchid" && <OrchidPlant />}
    {variant === "sunflower" && <SunflowerPlant />}
  </group>;
}

export function OrchidPlanter({ mirrored = false }: { mirrored?: boolean }) {
  return <group scale={mirrored ? [-1, 1, 1] : [1, 1, 1]}>
    <group position={[1.62, 0, 0]}>
      <PlanterTrough />
      <OrchidPlant />
    </group>
  </group>;
}
