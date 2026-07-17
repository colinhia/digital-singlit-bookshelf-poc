"use client";

import { PointerLockControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import type { Book, BookSlot, RoomControlsHandle, WallId } from "@/types/library";
import { bookSlots, roomLayout } from "@/data/room";
import { getBookAppearanceColor, resolveBookAppearance } from "@/data/bookAppearance";

const ROOM_HALF = 3.84;
const SHELF_WIDTH = 6.9;
const BOOK_FACE = ROOM_HALF - 0.36;
const BOOKCASE_FACE = ROOM_HALF - 0.18;
const CAMERA_HEIGHT = 3.53;
const SLOTS_PER_TIER = roomLayout.walls[0].slotsPerTier;
const TIER_COUNT = roomLayout.walls[0].tiers;
const SLOT_STEP = SHELF_WIDTH / SLOTS_PER_TIER;
const TIER_Y = Array.from({ length: TIER_COUNT }, (_, index) => 0.48 + index * 0.92);
const BOOKCASE_HEIGHT = 7.72;
const BOOKCASE_WIDTH = 7.34;
const EAVE_HEIGHT = 8.02;
const TITLE_CHARACTER_LIMIT = 30;
const TITLE_ATLAS_COLUMNS = 30;
const TITLE_CELL_WIDTH = 64;
const TITLE_CELL_HEIGHT = 192;

function slotTransform(slot: BookSlot, book: Book) {
  const along = -SHELF_WIDTH / 2 + SLOT_STEP / 2 + slot.positionOnTier * SLOT_STEP;
  const height = 0.68 + ((book.serialNumber * 7) % 18) / 100;
  const y = TIER_Y[slot.tier] + height / 2;
  const scale: [number, number, number] = [0.245, height, 0.32];
  if (slot.wall === "rear") return { position: [along, y, -BOOK_FACE] as const, rotation: 0, scale };
  if (slot.wall === "left") return { position: [-BOOK_FACE, y, -along] as const, rotation: Math.PI / 2, scale };
  return { position: [BOOK_FACE, y, along] as const, rotation: -Math.PI / 2, scale };
}

function spineTitle(title: string) {
  return title.length <= TITLE_CHARACTER_LIMIT
    ? title
    : `${title.slice(0, TITLE_CHARACTER_LIMIT - 1).trimEnd()}…`;
}

function BookTitles({ books, visibleSerials }: { books: Book[]; visibleSerials: Set<number> }) {
  const booksByInstance = useMemo(() => books.slice(0, 600), [books]);
  const texture = useMemo(() => {
    const rows = Math.ceil(booksByInstance.length / TITLE_ATLAS_COLUMNS);
    const canvas = document.createElement("canvas");
    canvas.width = TITLE_ATLAS_COLUMNS * TITLE_CELL_WIDTH;
    canvas.height = Math.max(1, rows * TITLE_CELL_HEIGHT);
    const context = canvas.getContext("2d");
    if (context) {
      context.font = "600 24px Georgia, serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      booksByInstance.forEach((book, index) => {
        const column = index % TITLE_ATLAS_COLUMNS;
        const row = Math.floor(index / TITLE_ATLAS_COLUMNS);
        const centerX = column * TITLE_CELL_WIDTH + TITLE_CELL_WIDTH / 2;
        const centerY = row * TITLE_CELL_HEIGHT + TITLE_CELL_HEIGHT / 2;
        context.save();
        context.translate(centerX, centerY);
        context.rotate(-Math.PI / 2);
        context.strokeStyle = "rgba(246,245,243,0.62)";
        context.lineWidth = 3;
        context.strokeText(spineTitle(book.title), 0, 0, TITLE_CELL_HEIGHT - 18);
        context.fillStyle = "#241814";
        context.fillText(spineTitle(book.title), 0, 0, TITLE_CELL_HEIGHT - 18);
        context.restore();
      });
    }
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.minFilter = THREE.LinearFilter;
    atlas.magFilter = THREE.LinearFilter;
    atlas.generateMipmaps = false;
    atlas.needsUpdate = true;
    return atlas;
  }, [booksByInstance]);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const rows = Math.max(1, Math.ceil(booksByInstance.length / TITLE_ATLAS_COLUMNS));
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const vertex = new THREE.Vector3();

    booksByInstance.forEach((book, index) => {
      if (!visibleSerials.has(book.serialNumber)) return;
      const transform = slotTransform(bookSlots[index], book);
      position.set(...transform.position);
      quaternion.setFromEuler(new THREE.Euler(0, transform.rotation, 0));
      scale.set(...transform.scale);
      matrix.compose(position, quaternion, scale);

      const firstVertex = positions.length / 3;
      const corners: [number, number, number][] = [
        [-0.38, -0.41, 0.506], [0.38, -0.41, 0.506],
        [0.38, 0.41, 0.506], [-0.38, 0.41, 0.506],
      ];
      corners.forEach((corner) => {
        vertex.set(...corner).applyMatrix4(matrix);
        positions.push(vertex.x, vertex.y, vertex.z);
      });

      const column = index % TITLE_ATLAS_COLUMNS;
      const row = Math.floor(index / TITLE_ATLAS_COLUMNS);
      const u0 = column / TITLE_ATLAS_COLUMNS;
      const u1 = (column + 1) / TITLE_ATLAS_COLUMNS;
      const vTop = 1 - row / rows;
      const vBottom = 1 - (row + 1) / rows;
      uvs.push(u0, vBottom, u1, vBottom, u1, vTop, u0, vTop);
      indices.push(firstVertex, firstVertex + 1, firstVertex + 2, firstVertex, firstVertex + 2, firstVertex + 3);
    });

    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    result.setIndex(indices);
    result.computeBoundingSphere();
    return result;
  }, [booksByInstance, visibleSerials]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} renderOrder={2}>
    <meshBasicMaterial map={texture} transparent alphaTest={0.12} depthWrite={false} toneMapped={false} side={THREE.FrontSide} />
  </mesh>;
}

function Books({ books, visibleSerials, onSelect, onTarget }: { books: Book[]; visibleSerials: Set<number>; onSelect: (book: Book) => void; onTarget: (book: Book | null) => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const targetRef = useRef<Book | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const booksByInstance = useMemo(() => books.slice(0, 600), [books]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    booksByInstance.forEach((book, index) => {
      const transform = slotTransform(bookSlots[index], book);
      position.set(transform.position[0], transform.position[1], transform.position[2]);
      quaternion.setFromEuler(new THREE.Euler(0, transform.rotation, 0));
      scale.set(transform.scale[0], transform.scale[1], transform.scale[2]);
      if (!visibleSerials.has(book.serialNumber)) scale.setScalar(0);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.set(getBookAppearanceColor(resolveBookAppearance(book))));
    });
    mesh.count = booksByInstance.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    material.forEach((item) => { item.needsUpdate = true; });
    mesh.computeBoundingSphere();
  }, [booksByInstance, visibleSerials]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hit = raycaster.intersectObject(mesh, false)[0];
    const next = hit?.instanceId !== undefined ? booksByInstance[hit.instanceId] : null;
    const visible = next && visibleSerials.has(next.serialNumber) ? next : null;
    if (visible?.serialNumber !== targetRef.current?.serialNumber) {
      if (targetIndexRef.current !== null) {
        const previous = booksByInstance[targetIndexRef.current];
        if (previous) mesh.setColorAt(targetIndexRef.current, new THREE.Color(getBookAppearanceColor(resolveBookAppearance(previous))));
      }
      targetIndexRef.current = visible && hit?.instanceId !== undefined ? hit.instanceId : null;
      if (targetIndexRef.current !== null) mesh.setColorAt(targetIndexRef.current, new THREE.Color("#f0c98e"));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      targetRef.current = visible;
      onTarget(visible);
    }
  });

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement && targetRef.current) {
        onSelect(targetRef.current);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [gl.domElement, onSelect]);

  return <instancedMesh ref={meshRef} args={[undefined, undefined, 600]} castShadow receiveShadow>
    <boxGeometry />
    <meshStandardMaterial color="#ffffff" roughness={0.62} metalness={0.03} />
  </instancedMesh>;
}

function Bookcase({ wall }: { wall: WallId }) {
  const isRear = wall === "rear";
  const x = wall === "left" ? -BOOKCASE_FACE : wall === "right" ? BOOKCASE_FACE : 0;
  const z = isRear ? -BOOKCASE_FACE : 0;
  const rotation = wall === "left" ? Math.PI / 2 : wall === "right" ? -Math.PI / 2 : 0;
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
    <mesh position={[0, BOOKCASE_HEIGHT / 2, -0.13]} receiveShadow><boxGeometry args={[BOOKCASE_WIDTH, BOOKCASE_HEIGHT, 0.22]} /><meshStandardMaterial color="#4b2d1d" roughness={0.9} /></mesh>
    {TIER_Y.map((y) => <mesh key={y} position={[0, y, 0.12]} receiveShadow castShadow><boxGeometry args={[BOOKCASE_WIDTH + 0.05, 0.12, 0.6]} /><meshStandardMaterial color="#8a5835" roughness={0.72} /></mesh>)}
    <mesh position={[-BOOKCASE_WIDTH / 2, BOOKCASE_HEIGHT / 2, 0]}><boxGeometry args={[0.18, BOOKCASE_HEIGHT + 0.1, 0.68]} /><meshStandardMaterial color="#74452b" /></mesh>
    <mesh position={[BOOKCASE_WIDTH / 2, BOOKCASE_HEIGHT / 2, 0]}><boxGeometry args={[0.18, BOOKCASE_HEIGHT + 0.1, 0.68]} /><meshStandardMaterial color="#74452b" /></mesh>
  </group>;
}

function Vines() {
  const pieces = useMemo(() => Array.from({ length: 72 }, (_, index) => {
    const wall = index % 3;
    const t = ((index * 37) % 100) / 100;
    const y = EAVE_HEIGHT + 0.18 - ((index * 13) % 18) / 100;
    const vineFace = ROOM_HALF - 0.08;
    const vineSpan = ROOM_HALF * 1.84;
    if (wall === 0) return { position: [-vineFace, y, -vineSpan / 2 + t * vineSpan] as [number,number,number], rotation: [0, 0, Math.PI / 2] as [number,number,number] };
    if (wall === 1) return { position: [-vineSpan / 2 + t * vineSpan, y, -vineFace] as [number,number,number], rotation: [0, 0, 0] as [number,number,number] };
    return { position: [vineFace, y, -vineSpan / 2 + t * vineSpan] as [number,number,number], rotation: [0, 0, Math.PI / 2] as [number,number,number] };
  }), []);
  return <group>{pieces.map((piece, index) => <group key={index} position={piece.position} rotation={piece.rotation}>
    <mesh scale={[0.13,0.24,0.06]}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={index % 4 ? "#315234" : "#203d2b"} roughness={1} /></mesh>
    {index % 3 === 0 && <mesh position={[0.08,0.03,0.05]} scale={0.07}><sphereGeometry args={[1,8,6]} /><meshStandardMaterial color={index % 2 ? "#a95147" : "#d86f78"} /></mesh>}
  </group>)}</group>;
}

function RoofFace({ points }: { points: [[number,number,number],[number,number,number],[number,number,number]] }) {
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
    result.setIndex([0, 1, 2]);
    result.computeVertexNormals();
    return result;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#a95147" roughness={0.92} side={THREE.DoubleSide} /></mesh>;
}

function RoofBeam({ from, to }: { from: [number,number,number]; to: [number,number,number] }) {
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

function PyramidRoof() {
  const { apex, corners, faces } = useMemo(() => {
    const edge = ROOM_HALF + 0.05;
    const eave = EAVE_HEIGHT;
    const roofApex: [number,number,number] = [0, 10.2, 0];
    const roofCorners: [number,number,number][] = [
      [-edge,eave,-edge], [edge,eave,-edge], [edge,eave,edge], [-edge,eave,edge],
    ];
    const roofFaces: [[number,number,number],[number,number,number],[number,number,number]][] = [
      [roofCorners[0],roofCorners[1],roofApex], [roofCorners[1],roofCorners[2],roofApex],
      [roofCorners[2],roofCorners[3],roofApex], [roofCorners[3],roofCorners[0],roofApex],
    ];
    return { apex:roofApex, corners:roofCorners, faces:roofFaces };
  }, []);
  return <group>
    {faces.map((points, index) => <RoofFace key={index} points={points} />)}
    {corners.map((corner, index) => <RoofBeam key={`hip-${index}`} from={corner} to={apex} />)}
    {corners.map((corner, index) => <RoofBeam key={`edge-${index}`} from={corner} to={corners[(index+1)%4]} />)}
  </group>;
}

function RoomArchitecture() {
  return <>
    <color attach="background" args={["#e8d9c5"]} />
    <ambientLight intensity={1.35} color="#ffd7a6" />
    <directionalLight position={[0, 7, 2]} intensity={2.2} color="#ffd3a0" castShadow shadow-mapSize={[1024,1024]} />
    <pointLight position={[0, 4.6, 0]} intensity={35} distance={14} color="#f2a96f" />
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[ROOM_HALF * 2,ROOM_HALF * 2]} /><meshStandardMaterial color="#d98c5f" roughness={0.95} /></mesh>
    <mesh position={[0,EAVE_HEIGHT / 2,ROOM_HALF]}><boxGeometry args={[ROOM_HALF * 2,EAVE_HEIGHT,0.18]} /><meshStandardMaterial color="#eee4d4" roughness={1} /></mesh>
    <mesh position={[0,6.9,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.32,0.14]} /><meshStandardMaterial color="#a95147" /></mesh>
    <mesh position={[0,0.45,ROOM_HALF-0.12]}><boxGeometry args={[ROOM_HALF * 2,0.7,0.15]} /><meshStandardMaterial color="#a95147" /></mesh>
    <mesh position={[0,2.45,ROOM_HALF-0.24]}><boxGeometry args={[2.2,4.7,0.24]} /><meshStandardMaterial color="#6a4028" roughness={0.8} /></mesh>
    <mesh position={[0,2.45,ROOM_HALF-0.4]}><boxGeometry args={[1.72,4.22,0.15]} /><meshStandardMaterial color="#b36d46" roughness={0.86} /></mesh>
    <Text position={[0,2.5,ROOM_HALF-0.52]} rotation={[0,Math.PI,0]} fontSize={0.18} color="#f4e7d0" letterSpacing={0.2}>THE DOOR</Text>
    <Bookcase wall="left" /><Bookcase wall="rear" /><Bookcase wall="right" />
    <PyramidRoof />
    <Vines />
  </>;
}

function CameraRig({ mobile, onSelect, target, onControlsReady }: { mobile: boolean; onSelect: (book: Book) => void; target: Book | null; onControlsReady: (controls: RoomControlsHandle | null) => void }) {
  const { camera, gl } = useThree();
  const drag = useRef({ active:false, moved:false, x:0, y:0 });
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);
  useEffect(() => {
    camera.position.set(0, CAMERA_HEIGHT, 0.7);
    camera.rotation.order = "YXZ";
    camera.lookAt(0, CAMERA_HEIGHT, -5);
  }, [camera]);
  useEffect(() => {
    if (mobile) return;
    const handle: RoomControlsHandle = {
      lock: () => controlsRef.current?.lock(),
      unlock: () => controlsRef.current?.unlock(),
      isLocked: () => Boolean(controlsRef.current?.isLocked),
    };
    onControlsReady(handle);
    return () => onControlsReady(null);
  }, [mobile, onControlsReady]);
  useEffect(() => {
    if (!mobile) return;
    const element = gl.domElement;
    const down = (event: PointerEvent) => { drag.current = { active:true, moved:false, x:event.clientX, y:event.clientY }; };
    const move = (event: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
      camera.rotation.y -= dx * 0.004;
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 0.003, -0.72, 0.72);
      drag.current.x = event.clientX; drag.current.y = event.clientY;
    };
    const up = () => { if (!drag.current.moved && target) onSelect(target); drag.current.active = false; };
    element.addEventListener("pointerdown", down); element.addEventListener("pointermove", move); element.addEventListener("pointerup", up);
    return () => { element.removeEventListener("pointerdown", down); element.removeEventListener("pointermove", move); element.removeEventListener("pointerup", up); };
  }, [camera, gl.domElement, mobile, onSelect, target]);
  return mobile ? null : <PointerLockControls ref={controlsRef} makeDefault selector="#no-automatic-pointer-lock" />;
}

function Scene({ books, visibleSerials, mobile, onSelect, onTarget, target, onControlsReady }: { books: Book[]; visibleSerials: Set<number>; mobile: boolean; onSelect: (book: Book) => void; onTarget: (book: Book | null) => void; target: Book | null; onControlsReady: (controls: RoomControlsHandle | null) => void }) {
  return <>
    <RoomArchitecture />
    <Books books={books} visibleSerials={visibleSerials} onSelect={onSelect} onTarget={onTarget} />
    <BookTitles books={books} visibleSerials={visibleSerials} />
    <CameraRig mobile={mobile} onSelect={onSelect} target={target} onControlsReady={onControlsReady} />
  </>;
}

export default function RoomScene({ books, visibleSerials, onSelect, onTarget, target, mobile, onControlsReady }: { books: Book[]; visibleSerials: Set<number>; onSelect: (book: Book) => void; onTarget: (book: Book | null) => void; target: Book | null; mobile: boolean; onControlsReady: (controls: RoomControlsHandle | null) => void }) {
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor("#e8d9c5");
    gl.shadowMap.enabled = !mobile;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [mobile]);
  return <Canvas camera={{ position:[0,CAMERA_HEIGHT,0.7], fov:68, near:0.1, far:40 }} dpr={mobile ? [1,1.25] : [1,1.7]} shadows={!mobile} onCreated={handleCreated} gl={{ antialias:true, powerPreference:"high-performance" }}>
    <Scene books={books} visibleSerials={visibleSerials} mobile={mobile} onSelect={onSelect} onTarget={onTarget} target={target} onControlsReady={onControlsReady} />
  </Canvas>;
}
