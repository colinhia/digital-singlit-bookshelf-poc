"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  InstancedFlatParts,
  InstancedRoundParts,
  StemSegment,
  type PartTransform,
  type Point,
} from "@/components/scene-assets/BotanicalPrimitives";
import { OrchidPlanter } from "@/components/scene-assets/PlanterFlowers";

const BOUGAINVILLEA_PATHS: Point[][] = [
  [[-1.34, 0.22, 0], [-1.42, 1.25, 0.01], [-1.31, 2.4, -0.01], [-1.37, 3.45, 0.02], [-1.18, 4.84, 0]],
  [[-1.32, 2.05, 0], [-0.94, 2.58, -0.01], [-0.72, 3.16, 0.02]],
  [[-1.18, 4.84, 0], [-0.55, 5.06, 0.01], [0.18, 4.99, -0.01], [0.62, 4.84, 0]],
];

const LEAF_COLORS = ["#31563a", "#416840", "#557846"];
const BOUGAINVILLEA_COLORS = ["#bd4c9d", "#d663b1", "#9e438b"];
const HANGING_PATHS: Point[][] = [
  [[-0.13, 0.02, 0], [-0.16, -0.28, -0.01], [-0.1, -0.58, 0.01]],
  [[0, 0.02, 0], [0.05, -0.32, 0.01], [0.02, -0.7, -0.01]],
  [[0.13, 0.02, 0], [0.17, -0.24, -0.01], [0.12, -0.52, 0.01]],
];

function samplePath(path: Point[], progress: number) {
  const scaled = progress * (path.length - 1);
  const index = Math.min(Math.floor(scaled), path.length - 2);
  const amount = scaled - index;
  return new THREE.Vector3(...path[index]).lerp(new THREE.Vector3(...path[index + 1]), amount);
}

function BougainvilleaLeaves() {
  const leaves = useMemo(() => Array.from({ length: 54 }, (_, index): PartTransform => {
    const path = BOUGAINVILLEA_PATHS[index % BOUGAINVILLEA_PATHS.length];
    const progress = ((index * 17) % 53) / 52;
    const anchor = samplePath(path, progress);
    const side = index % 2 === 0 ? -1 : 1;
    const angle = (index * 2.13) % (Math.PI * 2);
    anchor.x += side * (0.08 + (index % 4) * 0.018);
    anchor.y += Math.sin(index * 1.71) * 0.065;
    anchor.z += -0.025 - (index % 5) * 0.008;
    return {
      position: anchor,
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08 * side, 0.16 * Math.sin(index), angle)),
      scale: new THREE.Vector3(0.072 + (index % 3) * 0.012, 0.135 + (index % 4) * 0.009, 1),
      color: new THREE.Color(LEAF_COLORS[index % LEAF_COLORS.length]),
    };
  }), []);

  return <group>
    {BOUGAINVILLEA_PATHS.flatMap((path, pathIndex) => path.slice(0, -1).map((point, index) => <StemSegment
      key={`bougainvillea-stem-${pathIndex}-${index}`}
      from={point}
      to={path[index + 1]}
      radius={pathIndex === 0 ? 0.022 : 0.014}
    />))}
    <InstancedFlatParts transforms={leaves} />
  </group>;
}

function BougainvilleaFlowers() {
  const { bracts, centres } = useMemo(() => {
    const flowerCentres = Array.from({ length: 18 }, (_, index) => {
      const pathIndex = index % BOUGAINVILLEA_PATHS.length;
      const path = BOUGAINVILLEA_PATHS[pathIndex];
      const minimumProgress = pathIndex === 0 ? 0.36 : 0.08;
      const progress = minimumProgress + (((index * 19) % 41) / 40) * (1 - minimumProgress);
      const centre = samplePath(path, progress);
      centre.x += Math.sin(index * 2.4) * 0.12;
      centre.y += Math.cos(index * 1.7) * 0.075;
      centre.z -= 0.085 + (index % 3) * 0.012;
      return centre;
    });
    return {
      bracts: flowerCentres.flatMap((centre, flowerIndex) => Array.from({ length: 3 }, (_, petalIndex): PartTransform => {
        const angle = petalIndex * Math.PI * 2 / 3 + flowerIndex * 0.37;
        return {
          position: centre.clone().add(new THREE.Vector3(Math.cos(angle) * 0.055, Math.sin(angle) * 0.055, -0.008)),
          quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0.06 * Math.sin(flowerIndex), angle - Math.PI / 2)),
          scale: new THREE.Vector3(0.07 + (flowerIndex % 3) * 0.008, 0.095, 1),
          color: new THREE.Color(BOUGAINVILLEA_COLORS[(flowerIndex + petalIndex) % BOUGAINVILLEA_COLORS.length]),
        };
      })),
      centres: flowerCentres.map((centre, index): PartTransform => ({
        position: centre.clone().setZ(centre.z - 0.018),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(0.018, 0.018, 0.012),
        color: new THREE.Color(index % 2 ? "#f2d59a" : "#eac27e"),
      })),
    };
  }, []);

  return <group>
    <InstancedFlatParts transforms={bracts} />
    <InstancedRoundParts transforms={centres} />
  </group>;
}

function transformHangingPoint(point: THREE.Vector3, origin: THREE.Vector3, orientation: THREE.Quaternion) {
  return point.clone().applyQuaternion(orientation).add(origin);
}

export function PerimeterFoliage({ roomHalf, bookcaseFace, bookcaseWidth, tierY }: {
  roomHalf: number;
  bookcaseFace: number;
  bookcaseWidth: number;
  tierY: number[];
}) {
  const { basketSpecs, cords, stems, leaves, bracts, centres, motifBracts, motifCentres } = useMemo(() => {
    const inset = roomHalf - 1.2;
    const basketY = 7.68;
    const anchorY = 8.62;
    const baskets = [
      new THREE.Vector3(-inset, basketY, -inset), new THREE.Vector3(inset, basketY, -inset),
      new THREE.Vector3(-inset, basketY, inset), new THREE.Vector3(inset, basketY, inset),
    ].map((position) => ({
      position,
      orientation: new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.atan2(-position.x, -position.z),
      ),
    }));
    const basketCords: Array<{ from: Point; to: Point }> = [];
    const hangingStems: Array<{ from: Point; to: Point }> = [];
    const hangingLeaves: PartTransform[] = [];
    const hangingBracts: PartTransform[] = [];
    const hangingCentres: PartTransform[] = [];

    baskets.forEach(({ position, orientation }, basketIndex) => {
      const anchor = new THREE.Vector3(position.x, anchorY, position.z);
      [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].forEach((angle) => {
        const rim = new THREE.Vector3(Math.cos(angle) * 0.22, 0.13, Math.sin(angle) * 0.22).add(position);
        basketCords.push({ from: anchor.toArray(), to: rim.toArray() });
      });
      HANGING_PATHS.forEach((path) => path.slice(0, -1).forEach((point, index) => {
        const start = transformHangingPoint(new THREE.Vector3(...point), position, orientation);
        const end = transformHangingPoint(new THREE.Vector3(...path[index + 1]), position, orientation);
        hangingStems.push({ from: start.toArray(), to: end.toArray() });
      }));

      Array.from({ length: 14 }, (_, index) => {
        const path = HANGING_PATHS[index % HANGING_PATHS.length];
        const progress = ((index * 5) % 13) / 12;
        const anchorPoint = samplePath(path, progress);
        const side = index % 2 === 0 ? -1 : 1;
        anchorPoint.x += side * (0.045 + (index % 3) * 0.01);
        anchorPoint.y += Math.sin(index * 1.7 + basketIndex) * 0.035;
        anchorPoint.z -= 0.025;
        hangingLeaves.push({
          position: transformHangingPoint(anchorPoint, position, orientation),
          quaternion: orientation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06 * side, 0.08, index * 1.67))),
          scale: new THREE.Vector3(0.064 + (index % 2) * 0.01, 0.115 + (index % 3) * 0.008, 1),
          color: new THREE.Color(LEAF_COLORS[(basketIndex + index) % LEAF_COLORS.length]),
        });
      });

      Array.from({ length: 4 }, (_, flowerIndex) => {
        const path = HANGING_PATHS[flowerIndex % HANGING_PATHS.length];
        const centre = samplePath(path, 0.28 + flowerIndex * 0.18);
        centre.x += Math.sin(flowerIndex * 2.2 + basketIndex) * 0.055;
        centre.z -= 0.055;
        const worldCentre = transformHangingPoint(centre, position, orientation);
        Array.from({ length: 3 }, (_, petalIndex) => {
          const angle = petalIndex * Math.PI * 2 / 3 + flowerIndex * 0.4;
          const offset = new THREE.Vector3(Math.cos(angle) * 0.048, Math.sin(angle) * 0.048, -0.006).applyQuaternion(orientation);
          hangingBracts.push({
            position: worldCentre.clone().add(offset),
            quaternion: orientation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, 0.04, angle - Math.PI / 2))),
            scale: new THREE.Vector3(0.06, 0.082, 1),
            color: new THREE.Color(BOUGAINVILLEA_COLORS[(basketIndex + flowerIndex + petalIndex) % BOUGAINVILLEA_COLORS.length]),
          });
        });
        hangingCentres.push({
          position: worldCentre.clone().add(new THREE.Vector3(0, 0, -0.014).applyQuaternion(orientation)),
          quaternion: orientation.clone(),
          scale: new THREE.Vector3(0.015, 0.015, 0.01),
          color: new THREE.Color((basketIndex + flowerIndex) % 2 ? "#f2d59a" : "#eac27e"),
        });
      });
    });

    const shelfBracts: PartTransform[] = [];
    const shelfCentres: PartTransform[] = [];
    const motifAlong = bookcaseWidth / 2 - 0.12;
    [1, 4, 7].forEach((tierIndex, motifIndex) => {
      const along = (motifIndex % 2 === 0 ? -1 : 1) * motifAlong;
      const y = (tierY[tierIndex] ?? 0) - 0.01;
      const placements = [
        { centre: new THREE.Vector3(along, y, -bookcaseFace + 0.43), rotation: 0 },
        { centre: new THREE.Vector3(-bookcaseFace + 0.43, y, -along), rotation: Math.PI / 2 },
        { centre: new THREE.Vector3(bookcaseFace - 0.43, y, along), rotation: -Math.PI / 2 },
      ];
      placements.forEach(({ centre, rotation }, wallIndex) => {
        const orientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
        Array.from({ length: 3 }, (_, petalIndex) => {
          const angle = petalIndex * Math.PI * 2 / 3 + motifIndex * 0.35;
          const offset = new THREE.Vector3(Math.cos(angle) * 0.021, Math.sin(angle) * 0.021, 0.006).applyQuaternion(orientation);
          shelfBracts.push({
            position: centre.clone().add(offset),
            quaternion: orientation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle - Math.PI / 2))),
            scale: new THREE.Vector3(0.025, 0.035, 1),
            color: new THREE.Color(BOUGAINVILLEA_COLORS[(motifIndex + wallIndex + petalIndex) % BOUGAINVILLEA_COLORS.length]),
          });
        });
        shelfCentres.push({
          position: centre.clone().add(new THREE.Vector3(0, 0, 0.012).applyQuaternion(orientation)),
          quaternion: orientation,
          scale: new THREE.Vector3(0.009, 0.009, 0.006),
          color: new THREE.Color((motifIndex + wallIndex) % 2 ? "#f2d59a" : "#eac27e"),
        });
      });
    });

    return {
      basketSpecs: baskets,
      cords: basketCords,
      stems: hangingStems,
      leaves: hangingLeaves,
      bracts: hangingBracts,
      centres: hangingCentres,
      motifBracts: shelfBracts,
      motifCentres: shelfCentres,
    };
  }, [bookcaseFace, bookcaseWidth, roomHalf, tierY]);

  return <group>
    {basketSpecs.map(({ position }, index) => <group key={`basket-${index}`} position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.2, 0.28, 12]} />
        <meshStandardMaterial color="#a96c51" roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.295, 0.295, 0.055, 12]} />
        <meshStandardMaterial color="#c18768" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.152, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.018, 12]} />
        <meshStandardMaterial color="#49392f" roughness={1} />
      </mesh>
    </group>)}
    {cords.map((cord, index) => <StemSegment key={`basket-cord-${index}`} from={cord.from} to={cord.to} radius={0.007} color="#574436" />)}
    {stems.map((stem, index) => <StemSegment key={`hanging-stem-${index}`} from={stem.from} to={stem.to} radius={0.011} />)}
    <InstancedFlatParts transforms={leaves} />
    <InstancedFlatParts transforms={bracts} />
    <InstancedRoundParts transforms={centres} />
    <InstancedFlatParts transforms={motifBracts} />
    <InstancedRoundParts transforms={motifCentres} />
  </group>;
}

export function EntranceFoliage({ position }: { position: Point }) {
  return <group position={position}>
    <BougainvilleaLeaves />
    <BougainvilleaFlowers />
    <OrchidPlanter />
    <OrchidPlanter mirrored />
  </group>;
}
