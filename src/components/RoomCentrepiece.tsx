"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

const TABLE_POSITION: [number, number, number] = [0, 0, -1.25];
const TABLETOP_RADIUS = 0.73;
const TABLETOP_HEIGHT = 1.78;
const TABLETOP_THICKNESS = 0.16;
const TABLETOP_SURFACE = TABLETOP_HEIGHT + TABLETOP_THICKNESS / 2;
const DRAGON_DEPTH = 0.12;
const DRAGON_PROFILE_WIDTH = 1.2;
const DRAGON_PROFILE_HEIGHT = 0.7;

interface TileTextureOptions {
  columns: number;
  rows: number;
  brickCentre?: boolean;
}

function createTileTexture({ columns, rows, brickCentre = false }: TileTextureOptions) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create display-table texture");

  context.fillStyle = "#c9bbaa";
  context.fillRect(0, 0, size, size);
  const tileWidth = size / columns;
  const tileHeight = size / rows;
  const tileColors = ["#eee5d8", "#e9dfd1", "#f2eadf", "#e5dacb"];
  const brickColors = ["#9f4932", "#a95147", "#ad5337", "#b45b40"];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const inset = 3;
      const centreColumn = Math.abs(column - (columns - 1) / 2) < 2;
      const centreRow = Math.abs(row - (rows - 1) / 2) < 2;
      const isBrickCentre = brickCentre && centreColumn && centreRow;
      const centreIndex = ((row - (rows / 2 - 2)) * 4 + column - (columns / 2 - 2)) % brickColors.length;
      context.fillStyle = isBrickCentre
        ? brickColors[centreIndex]
        : tileColors[(row * 3 + column * 5) % tileColors.length];
      context.fillRect(
        column * tileWidth + inset,
        row * tileHeight + inset,
        tileWidth - inset * 2,
        tileHeight - inset * 2,
      );
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function TiledDisplayTable() {
  const tabletopTexture = useMemo(() => createTileTexture({ columns: 8, rows: 8, brickCentre: true }), []);
  const pedestalTexture = useMemo(() => createTileTexture({ columns: 10, rows: 9 }), []);

  useEffect(() => () => {
    tabletopTexture.dispose();
    pedestalTexture.dispose();
  }, [pedestalTexture, tabletopTexture]);

  return <group position={TABLE_POSITION}>
    <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.39, 0.39, 0.14, 48]} />
      <meshStandardMaterial color="#dfd3c4" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.33, 0.33, 0.045, 48]} />
      <meshStandardMaterial color="#c28668" roughness={0.88} />
    </mesh>
    <mesh position={[0, 0.94, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.28, 0.28, 1.56, 48]} />
      <meshStandardMaterial map={pedestalTexture} roughness={0.88} metalness={0.01} />
    </mesh>
    <mesh position={[0, TABLETOP_HEIGHT, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[TABLETOP_RADIUS, TABLETOP_RADIUS, TABLETOP_THICKNESS, 64]} />
      <meshStandardMaterial color="#e8ddcf" roughness={0.84} metalness={0.01} />
    </mesh>
    <mesh position={[0, TABLETOP_HEIGHT + TABLETOP_THICKNESS / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[TABLETOP_RADIUS - 0.018, 64]} />
      <meshStandardMaterial map={tabletopTexture} roughness={0.8} metalness={0.015} />
    </mesh>
    <mesh position={[0, TABLETOP_HEIGHT - 0.045, 0]} castShadow>
      <cylinderGeometry args={[TABLETOP_RADIUS + 0.007, TABLETOP_RADIUS + 0.007, 0.035, 64]} />
      <meshStandardMaterial color="#b8755d" roughness={0.86} metalness={0.01} />
    </mesh>
  </group>;
}

type ProfilePoint = [number, number];

function polygonShape(points: ProfilePoint[]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
}

const FRAME_PROFILE: ProfilePoint[] = [
  [-0.58, 0], [-0.58, 0.09], [-0.23, 0.27], [-0.29, 0.35],
  [-0.23, 0.41], [-0.37, 0.55], [-0.37, 0.67], [-0.28, 0.67],
  [-0.06, 0.46], [0.05, 0.46], [0.05, 0.6], [0.18, 0.6],
  [0.33, 0.45], [0.52, 0.45], [0.6, 0.38], [0.6, 0.22],
  [0.5, 0.11], [0.32, 0.11], [0.25, 0.16], [0.18, 0.16],
  [0.18, 0], [0.08, 0], [0.08, 0.14], [-0.02, 0.14],
  [-0.02, 0], [-0.12, 0], [-0.12, 0.17], [-0.23, 0.08],
  [-0.23, 0],
];

const ORANGE_PROFILES: ProfilePoint[][] = [
  [
    [-0.25, 0.39], [-0.18, 0.43], [0.29, 0.43], [0.34, 0.41],
    [0.49, 0.41], [0.56, 0.36], [0.56, 0.24], [0.47, 0.15],
    [0.33, 0.15], [0.25, 0.2], [0.14, 0.2], [0.14, 0.05],
    [0.11, 0.05], [0.11, 0.18], [-0.05, 0.18], [-0.05, 0.05],
    [-0.09, 0.05], [-0.09, 0.21], [-0.2, 0.29],
  ],
  [
    [-0.34, 0.57], [-0.34, 0.64], [-0.3, 0.64], [-0.09, 0.43],
    [-0.17, 0.43],
  ],
  [
    [0.08, 0.57], [0.15, 0.57], [0.29, 0.43], [0.2, 0.43],
    [0.08, 0.54],
  ],
  [
    [-0.54, 0.03], [-0.27, 0.03], [-0.18, 0.2], [-0.24, 0.24],
    [-0.54, 0.08],
  ],
];

const MOUTH_PROFILE: ProfilePoint[] = [
  [-0.23, 0.33], [-0.02, 0.33], [-0.02, 0.37], [0.09, 0.37],
  [0.09, 0.31], [0.31, 0.31], [0.31, 0.26], [0.48, 0.26],
  [0.48, 0.21], [0.29, 0.21], [0.22, 0.25], [0.06, 0.25],
  [0.06, 0.29], [-0.23, 0.29],
];

function extrudeDragonFrame() {
  const shape = polygonShape(FRAME_PROFILE);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DRAGON_DEPTH,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.008,
    bevelThickness: 0.008,
  });
  geometry.translate(0, 0, -DRAGON_DEPTH / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function applyDragonProfileUvs(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const uvs = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    uvs[index * 2] = (positions.getX(index) + DRAGON_PROFILE_WIDTH / 2) / DRAGON_PROFILE_WIDTH;
    uvs[index * 2 + 1] = positions.getY(index) / DRAGON_PROFILE_HEIGHT;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

function profileGeometry(points: ProfilePoint[], alignMosaic = false) {
  const geometry = new THREE.ShapeGeometry(polygonShape(points));
  if (alignMosaic) applyDragonProfileUvs(geometry);
  geometry.computeVertexNormals();
  return geometry;
}

function createDragonMosaicTextures() {
  const size = 1024;
  const colorCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  colorCanvas.width = bumpCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = size;
  const colorContext = colorCanvas.getContext("2d");
  const bumpContext = bumpCanvas.getContext("2d");
  if (!colorContext || !bumpContext) throw new Error("Unable to create dragon mosaic textures");

  const columns = 12;
  const rows = 7;
  const tileWidth = size / columns;
  const tileHeight = size / rows;
  const tileColors = ["#cf593c", "#d76543", "#dc6b47", "#c95238", "#d26040"];
  colorContext.fillStyle = "#eee3d5";
  colorContext.fillRect(0, 0, size, size);
  bumpContext.fillStyle = "#555555";
  bumpContext.fillRect(0, 0, size, size);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const inset = 5;
      const x = column * tileWidth + inset;
      const y = row * tileHeight + inset;
      const width = tileWidth - inset * 2;
      const height = tileHeight - inset * 2;
      colorContext.fillStyle = tileColors[(row * 7 + column * 3 + row * column) % tileColors.length];
      colorContext.fillRect(x, y, width, height);
      colorContext.strokeStyle = "rgba(255, 224, 195, 0.16)";
      colorContext.lineWidth = 2;
      colorContext.strokeRect(x + 2, y + 2, width - 4, height - 4);
      const bumpShade = 151 + ((row * 5 + column * 3) % 7);
      bumpContext.fillStyle = `rgb(${bumpShade},${bumpShade},${bumpShade})`;
      bumpContext.fillRect(x, y, width, height);
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

function DragonPlaygroundSilhouette() {
  const geometries = useMemo(() => ({
    frame: extrudeDragonFrame(),
    panels: ORANGE_PROFILES.map((profile) => profileGeometry(profile, true)),
    mouth: profileGeometry(MOUTH_PROFILE),
  }), []);
  const mosaicTextures = useMemo(createDragonMosaicTextures, []);

  useEffect(() => () => {
    geometries.frame.dispose();
    geometries.panels.forEach((geometry) => geometry.dispose());
    geometries.mouth.dispose();
  }, [geometries]);
  useEffect(() => () => {
    mosaicTextures.colorMap.dispose();
    mosaicTextures.bumpMap.dispose();
  }, [mosaicTextures]);

  const front = DRAGON_DEPTH / 2 + 0.012;

  return <group position={[0, TABLETOP_SURFACE + 0.029, 0]} scale={0.95}>
    <mesh position={[0.01, -0.015, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.24, 0.03, 0.25]} />
      <meshStandardMaterial color="#e9dfd1" roughness={0.9} />
    </mesh>
    <mesh geometry={geometries.frame} castShadow receiveShadow>
      <meshStandardMaterial attach="material-0" color="#eee5d8" roughness={0.84} metalness={0.01} />
      <meshStandardMaterial attach="material-1" color="#837b72" roughness={0.9} metalness={0.01} />
    </mesh>
    {geometries.panels.map((geometry, index) => <mesh key={index} geometry={geometry} position={[0, 0, front]} receiveShadow>
      <meshStandardMaterial
        map={mosaicTextures.colorMap}
        bumpMap={mosaicTextures.bumpMap}
        bumpScale={0.006}
        roughness={0.82}
        metalness={0.005}
        side={THREE.FrontSide}
      />
    </mesh>)}
    <mesh geometry={geometries.mouth} position={[0, 0, front + 0.006]}>
      <meshStandardMaterial color="#eee5d8" roughness={0.86} side={THREE.FrontSide} />
    </mesh>
    <mesh position={[0.06, 0.36, front + 0.011]}>
      <ringGeometry args={[0.07, 0.098, 8]} />
      <meshStandardMaterial color="#eee5d8" roughness={0.84} side={THREE.FrontSide} />
    </mesh>
    <mesh position={[0.06, 0.36, front + 0.012]}>
      <ringGeometry args={[0.054, 0.071, 8]} />
      <meshStandardMaterial color="#a95147" roughness={0.82} side={THREE.FrontSide} />
    </mesh>
    <mesh position={[0.06, 0.36, front + 0.01]}>
      <circleGeometry args={[0.055, 8]} />
      <meshStandardMaterial color="#77716b" roughness={0.92} side={THREE.FrontSide} />
    </mesh>
  </group>;
}

export default function RoomCentrepiece() {
  return <>
    <TiledDisplayTable />
    <group position={TABLE_POSITION}>
      <DragonPlaygroundSilhouette />
    </group>
  </>;
}
