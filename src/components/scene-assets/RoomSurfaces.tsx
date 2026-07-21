"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Point = [number, number, number];
type RoofFacePoints = [Point, Point, Point];

const FLOOR_TILE_COUNT = 10;
const ROOF_TILE_WIDTH = 0.46;
const ROOF_TILE_DEPTH = 0.5;
const ROOF_TILE_THICKNESS = 0.055;
const ROOF_TILE_OVERLAP_RATIO = 0.11;
const ROOF_BACKING_CLEARANCE = 0.038;
const ROOF_ROW_LAYER_OFFSET = 0.014;
const TERRACOTTA_COLORS = ["#9f4932", "#ad5337", "#bb5d3d", "#91412f"];

function deterministicShade(row: number, column: number) {
  return ((row * 17 + column * 31 + row * column * 7) % 9) - 4;
}

function createFloorTextures() {
  const size = 1024;
  const colorCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  colorCanvas.width = bumpCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = size;
  const colorContext = colorCanvas.getContext("2d");
  const bumpContext = bumpCanvas.getContext("2d");
  if (!colorContext || !bumpContext) throw new Error("Unable to create tiled floor textures");

  const tileSize = size / FLOOR_TILE_COUNT;
  colorContext.fillStyle = "#b9aa95";
  colorContext.fillRect(0, 0, size, size);
  bumpContext.fillStyle = "#555555";
  bumpContext.fillRect(0, 0, size, size);

  for (let row = 0; row < FLOOR_TILE_COUNT; row += 1) {
    for (let column = 0; column < FLOOR_TILE_COUNT; column += 1) {
      const peach = (row * 5 + column * 3 + row * column) % 7 < 2;
      const shade = deterministicShade(row, column);
      const base = peach ? [213, 143, 96] : [137, 126, 111];
      const color = base.map((channel) => channel + shade * 2);
      const inset = 3.5;
      const x = column * tileSize + inset;
      const y = row * tileSize + inset;
      const extent = tileSize - inset * 2;

      colorContext.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      colorContext.fillRect(x, y, extent, extent);

      const bumpShade = 151 + shade;
      bumpContext.fillStyle = `rgb(${bumpShade},${bumpShade},${bumpShade})`;
      bumpContext.fillRect(x, y, extent, extent);
      bumpContext.strokeStyle = "rgba(205,205,205,0.2)";
      bumpContext.lineWidth = 2;
      bumpContext.strokeRect(x + 2, y + 2, extent - 4, extent - 4);
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  [colorMap, bumpMap].forEach((texture) => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  });
  return { colorMap, bumpMap };
}

function TiledFloor({ roomHalf }: { roomHalf: number }) {
  const textures = useMemo(createFloorTextures, []);
  useEffect(() => () => {
    textures.colorMap.dispose();
    textures.bumpMap.dispose();
  }, [textures]);

  return <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[roomHalf * 2, roomHalf * 2]} />
    <meshStandardMaterial
      map={textures.colorMap}
      bumpMap={textures.bumpMap}
      bumpScale={0.035}
      roughness={0.76}
      metalness={0.04}
    />
  </mesh>;
}

function RoofBacking({ points }: { points: RoofFacePoints }) {
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
    result.setIndex([0, 1, 2]);
    result.computeVertexNormals();
    return result;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial color="#713725" roughness={0.96} side={THREE.DoubleSide} />
  </mesh>;
}

function RoofBeam({ from, to }: { from: Point; to: Point }) {
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
    <boxGeometry args={[0.2, transform.length, 0.2]} />
    <meshStandardMaterial color="#5d371f" roughness={0.82} />
  </mesh>;
}

interface RoofTileTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  color: string;
}

function createRoofTileTransforms(faces: RoofFacePoints[]) {
  const transforms: RoofTileTransform[] = [];
  faces.forEach(([baseStartTuple, baseEndTuple, apexTuple], faceIndex) => {
    const baseStart = new THREE.Vector3(...baseStartTuple);
    const baseEnd = new THREE.Vector3(...baseEndTuple);
    const apex = new THREE.Vector3(...apexTuple);
    const baseCenter = baseStart.clone().add(baseEnd).multiplyScalar(0.5);
    const horizontal = baseEnd.clone().sub(baseStart).normalize();
    const slopeVector = apex.clone().sub(baseCenter);
    const slopeLength = slopeVector.length();
    const slope = slopeVector.normalize();
    const outwardNormal = slope.clone().cross(horizontal).normalize();
    const basis = new THREE.Matrix4().makeBasis(horizontal, outwardNormal, slope);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
    const baseWidth = baseStart.distanceTo(baseEnd);
    const rowCount = Math.ceil(slopeLength / (ROOF_TILE_DEPTH * 0.82));
    const rowSpacing = slopeLength / rowCount;
    const renderedTileDepth = rowSpacing * (1 + ROOF_TILE_OVERLAP_RATIO);

    for (let row = 0; row < rowCount; row += 1) {
      const progress = (row + 0.5) / rowCount;
      const availableWidth = baseWidth * (1 - progress);
      const columnCount = Math.max(1, Math.floor(availableWidth / ROOF_TILE_WIDTH));
      const tileWidth = Math.min(ROOF_TILE_WIDTH, availableWidth / columnCount);
      const rowCenter = baseCenter.clone().addScaledVector(slope, progress * slopeLength);
      const stagger = row % 2 === 0 ? 0 : tileWidth * 0.08;
      const normalOffset = ROOF_TILE_THICKNESS / 2
        + ROOF_BACKING_CLEARANCE
        + (row % 2) * ROOF_ROW_LAYER_OFFSET;

      for (let column = 0; column < columnCount; column += 1) {
        const across = (column - (columnCount - 1) / 2) * tileWidth + stagger;
        if (Math.abs(across) + tileWidth / 2 > availableWidth / 2) continue;
        const position = rowCenter.clone()
          .addScaledVector(horizontal, across)
          .addScaledVector(outwardNormal, -normalOffset);
        transforms.push({
          position,
          quaternion: quaternion.clone(),
          scale: new THREE.Vector3(tileWidth * 0.95, ROOF_TILE_THICKNESS, renderedTileDepth),
          color: TERRACOTTA_COLORS[(faceIndex * 5 + row * 3 + column) % TERRACOTTA_COLORS.length],
        });
      }
    }
  });
  return transforms;
}

function RoofTiles({ faces }: { faces: RoofFacePoints[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const transforms = useMemo(() => createRoofTileTransforms(faces), [faces]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    transforms.forEach((transform, index) => {
      matrix.compose(transform.position, transform.quaternion, transform.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.set(transform.color));
    });
    mesh.count = transforms.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    material.forEach((item) => { item.needsUpdate = true; });
    mesh.computeBoundingSphere();
  }, [transforms]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, transforms.length]} receiveShadow>
    <boxGeometry />
    <meshStandardMaterial color="#ffffff" roughness={0.88} metalness={0.01} />
  </instancedMesh>;
}

function TiledPyramidRoof({ roomHalf, eaveHeight }: { roomHalf: number; eaveHeight: number }) {
  const { apex, corners, faces } = useMemo(() => {
    const edge = roomHalf + 0.05;
    const roofApex: Point = [0, 10.2, 0];
    const roofCorners: Point[] = [
      [-edge, eaveHeight, -edge], [edge, eaveHeight, -edge],
      [edge, eaveHeight, edge], [-edge, eaveHeight, edge],
    ];
    const roofFaces: RoofFacePoints[] = [
      [roofCorners[0], roofCorners[1], roofApex], [roofCorners[1], roofCorners[2], roofApex],
      [roofCorners[2], roofCorners[3], roofApex], [roofCorners[3], roofCorners[0], roofApex],
    ];
    return { apex: roofApex, corners: roofCorners, faces: roofFaces };
  }, [eaveHeight, roomHalf]);

  return <group>
    {faces.map((points, index) => <RoofBacking key={`backing-${index}`} points={points} />)}
    <RoofTiles faces={faces} />
    {corners.map((corner, index) => <RoofBeam key={`hip-${index}`} from={corner} to={apex} />)}
    {corners.map((corner, index) => <RoofBeam key={`edge-${index}`} from={corner} to={corners[(index + 1) % 4]} />)}
  </group>;
}

export default function RoomSurfaces({ roomHalf, eaveHeight }: { roomHalf: number; eaveHeight: number }) {
  return <>
    <TiledFloor roomHalf={roomHalf} />
    <TiledPyramidRoof roomHalf={roomHalf} eaveHeight={eaveHeight} />
  </>;
}
