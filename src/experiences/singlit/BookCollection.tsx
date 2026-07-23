"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Book, BookRenderProfile, BookSelection, BookSlot } from "@/types/library";
import { bookSlots } from "@/data/room";
import { getBookAppearanceColor, resolveBookAppearance } from "@/components/scene-assets/books/bookAppearance";
import { BookStack } from "@/components/scene-assets/books/BookStack";
import {
  FILTERED_BOOK_OPACITY,
  getBookPageColor,
  HIGHLIGHT_COLOR,
  resolveBookLayerGeometry,
  resolveBookRenderProfile,
  useBookGeometries,
} from "@/components/scene-assets/books/bookVisuals";
import {
  fitSpineTitle,
  fontDeclaration,
  spineTitle,
  TITLE_ACCENT_COLOR,
  TITLE_ATLAS_COLUMNS,
  TITLE_CELL_HEIGHT,
  TITLE_CELL_WIDTH,
  TITLE_TEXT_COLOR,
  type SpineFontFamilies,
  useSpineFontFamilies,
} from "@/components/scene-assets/books/spineTypography";
import type { BookVisualData } from "@/components/scene-assets/books/types";
import { resolveTopDownTierY } from "@/components/scene-assets/roomLayout";

const CENTER_POINTER = new THREE.Vector2(0, 0);
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

interface BookRenderConfig {
  shelfWidth: number;
  bookFace: number;
  tierY: number[];
  slotsPerTier: number;
  capacity: number;
}

interface ProfiledBook {
  book: Book;
  slot: BookSlot;
  profile: BookRenderProfile;
}

interface RenderedBook extends ProfiledBook {
  baseTransform: THREE.Matrix4;
  spineMatrix: THREE.Matrix4;
  pageMatrix: THREE.Matrix4;
  leftBoardMatrix: THREE.Matrix4;
  rightBoardMatrix: THREE.Matrix4;
  coverColor: THREE.Color;
  pageColor: THREE.Color;
}

function getProfiledBooks(books: Book[], capacity: number) {
  const seenSerials = new Set<number>();
  return [...books]
    .sort((left, right) => left.serialNumber - right.serialNumber)
    .flatMap((book): ProfiledBook[] => {
      const slotIndex = book.serialNumber - 1;
      if (slotIndex < 0 || slotIndex >= capacity || seenSerials.has(book.serialNumber)) return [];
      const slot = bookSlots[slotIndex];
      if (!slot) return [];
      seenSerials.add(book.serialNumber);
      return [{ book, slot, profile: resolveBookRenderProfile(book) }];
    });
}

function baseMatrix(item: ProfiledBook, config: BookRenderConfig) {
  const { slot, profile } = item;
  const step = config.shelfWidth / config.slotsPerTier;
  const along = -config.shelfWidth / 2 + step / 2 + slot.positionOnTier * step;
  const shelfY = resolveTopDownTierY(config.tierY, slot.tier);
  const position = slot.wall === "rear"
    ? new THREE.Vector3(along, shelfY, -config.bookFace)
    : slot.wall === "left"
      ? new THREE.Vector3(-config.bookFace, shelfY, -along)
      : new THREE.Vector3(config.bookFace, shelfY, along);
  const yaw = slot.wall === "rear" ? 0 : slot.wall === "left" ? Math.PI / 2 : -Math.PI / 2;
  return new THREE.Matrix4()
    .makeTranslation(position.x, position.y, position.z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeRotationZ(profile.lean));
}

function layerMatrix(
  baseTransform: THREE.Matrix4,
  dimensions: [number, number, number],
  offset: [number, number, number] = [0, 0, 0],
) {
  const [width, height, depth] = dimensions;
  return baseTransform.clone()
    .multiply(new THREE.Matrix4().makeTranslation(offset[0], offset[1] + height / 2, offset[2]))
    .multiply(new THREE.Matrix4().makeScale(width, height, depth));
}

function createRenderedBooks(items: ProfiledBook[], config: BookRenderConfig): RenderedBook[] {
  return items.map((item) => {
    const baseTransform = baseMatrix(item, config);
    const {
      pageDimensions,
      pageOffset,
      spineDimensions,
      spineOffset,
      boardDimensions,
      boardX,
    } = resolveBookLayerGeometry(item.profile);
    return {
      ...item,
      baseTransform,
      spineMatrix: layerMatrix(baseTransform, spineDimensions, spineOffset),
      pageMatrix: layerMatrix(baseTransform, pageDimensions, pageOffset),
      leftBoardMatrix: layerMatrix(baseTransform, boardDimensions, [-boardX, 0, 0]),
      rightBoardMatrix: layerMatrix(baseTransform, boardDimensions, [boardX, 0, 0]),
      coverColor: new THREE.Color(getBookAppearanceColor(resolveBookAppearance(item.book))),
      pageColor: new THREE.Color(getBookPageColor(item.book)),
    };
  });
}

function BookTitleBatch({
  items,
  matchingSerials,
  fontFamilies,
  columns,
}: {
  items: RenderedBook[];
  matchingSerials: Set<number>;
  fontFamilies: SpineFontFamilies;
  columns: number;
}) {
  const texture = useMemo(() => {
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const canvas = document.createElement("canvas");
    canvas.width = columns * TITLE_CELL_WIDTH;
    canvas.height = rows * TITLE_CELL_HEIGHT;
    const context = canvas.getContext("2d");
    if (context) {
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      items.forEach(({ book }, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const centerX = column * TITLE_CELL_WIDTH + TITLE_CELL_WIDTH / 2;
        const centerY = row * TITLE_CELL_HEIGHT + TITLE_CELL_HEIGHT / 2;
        const title = spineTitle(book.title);
        const labelWidth = TITLE_CELL_HEIGHT;
        const labelHeight = 104;
        const ruleOffset = labelWidth / 2 - 22;
        const maximumTextWidth = ruleOffset * 2 - 24;
        const fittedTitle = fitSpineTitle(context, title, maximumTextWidth, fontFamilies[book.language]);
        context.save();
        context.translate(centerX, centerY);
        context.rotate(-Math.PI / 2);
        context.fillStyle = TITLE_ACCENT_COLOR;
        context.globalAlpha = 0.68;
        [-ruleOffset, ruleOffset].forEach((offset) => {
          context.fillRect(offset - 2, -labelHeight / 2, 4, labelHeight);
        });
        context.globalAlpha = 1;
        context.fillStyle = TITLE_TEXT_COLOR;
        context.font = fontDeclaration(fittedTitle.fontSize, fontFamilies[book.language]);
        const lineHeight = fittedTitle.fontSize * 1.05;
        const firstLineY = -((fittedTitle.lines.length - 1) * lineHeight) / 2;
        fittedTitle.lines.forEach((line, lineIndex) => {
          context.fillText(line, 0, firstLineY + lineIndex * lineHeight);
        });
        context.restore();
      });
    }
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.minFilter = THREE.LinearFilter;
    atlas.magFilter = THREE.LinearFilter;
    atlas.generateMipmaps = false;
    return atlas;
  }, [columns, fontFamilies, items]);

  const geometries = useMemo(() => {
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const createGeometry = (matchesFilter: boolean) => {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const vertex = new THREE.Vector3();
      items.forEach((item, index) => {
        if (matchingSerials.has(item.book.serialNumber) !== matchesFilter) return;
        const { profile } = item;
        const transform = item.baseTransform;
        const firstVertex = positions.length / 3;
        const halfWidth = profile.width * 0.44;
        const bottom = 0;
        const top = profile.height;
        const front = profile.depth / 2 + 0.006;
        const corners: [number, number, number][] = [
          [-halfWidth, bottom, front], [halfWidth, bottom, front],
          [halfWidth, top, front], [-halfWidth, top, front],
        ];
        corners.forEach((corner) => {
          vertex.set(...corner).applyMatrix4(transform);
          positions.push(vertex.x, vertex.y, vertex.z);
        });
        const column = index % columns;
        const row = Math.floor(index / columns);
        const u0 = column / columns;
        const u1 = (column + 1) / columns;
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
    };
    return { matching: createGeometry(true), filtered: createGeometry(false) };
  }, [columns, items, matchingSerials]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => {
    geometries.matching.dispose();
    geometries.filtered.dispose();
  }, [geometries]);

  return <>
    <mesh geometry={geometries.filtered} renderOrder={3}>
      <meshBasicMaterial map={texture} transparent opacity={FILTERED_BOOK_OPACITY} alphaTest={0.04} depthWrite={false} toneMapped={false} side={THREE.FrontSide} />
    </mesh>
    <mesh geometry={geometries.matching} renderOrder={4}>
      <meshBasicMaterial map={texture} transparent alphaTest={0.12} depthWrite={false} toneMapped={false} side={THREE.FrontSide} />
    </mesh>
  </>;
}

function BookTitles({ items, matchingSerials }: { items: RenderedBook[]; matchingSerials: Set<number> }) {
  const { gl } = useThree();
  const fontFamilies = useSpineFontFamilies(items);
  const maximumTextureSize = gl.capabilities.maxTextureSize;
  const columns = Math.max(1, Math.min(TITLE_ATLAS_COLUMNS, Math.floor(maximumTextureSize / TITLE_CELL_WIDTH)));
  const rows = Math.max(1, Math.floor(maximumTextureSize / TITLE_CELL_HEIGHT));
  const batchCapacity = columns * rows;
  const batches = useMemo(() => Array.from(
    { length: Math.ceil(items.length / batchCapacity) },
    (_, index) => items.slice(index * batchCapacity, (index + 1) * batchCapacity),
  ), [batchCapacity, items]);

  return <>{batches.map((batch, index) => <BookTitleBatch
    key={`${index}-${batch[0]?.book.serialNumber ?? "empty"}`}
    items={batch}
    matchingSerials={matchingSerials}
    fontFamilies={fontFamilies}
    columns={columns}
  />)}</>;
}

function sameSelection(left: BookSelection | null, right: BookSelection | null) {
  return left?.location === right?.location && left?.book.serialNumber === right?.book.serialNumber;
}

function getTableBookUserData(_book: BookVisualData, index: number) {
  return { tableBookIndex: index };
}

function RealisticBooks({ items, tableBooks, matchingSerials, onSelect, onTarget, target }: {
  items: RenderedBook[];
  tableBooks: Book[];
  matchingSerials: Set<number>;
  onSelect: (selection: BookSelection) => void;
  onTarget: (selection: BookSelection | null) => void;
  target: BookSelection | null;
}) {
  const matchingSpineRef = useRef<THREE.InstancedMesh>(null);
  const matchingPagesRef = useRef<THREE.InstancedMesh>(null);
  const matchingBoardsRef = useRef<THREE.InstancedMesh>(null);
  const filteredSpineRef = useRef<THREE.InstancedMesh>(null);
  const filteredPagesRef = useRef<THREE.InstancedMesh>(null);
  const filteredBoardsRef = useRef<THREE.InstancedMesh>(null);
  const tableGroupRef = useRef<THREE.Group>(null);
  const targetRef = useRef<BookSelection | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const { camera, invalidate } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const raycastTargetsRef = useRef<THREE.Object3D[]>([]);
  const intersectionsRef = useRef<THREE.Intersection[]>([]);
  const coverColorRef = useRef(new THREE.Color());
  const geometries = useBookGeometries();

  const setCoverColor = (index: number, value: string) => {
    const color = coverColorRef.current.set(value);
    matchingSpineRef.current?.setColorAt(index, color);
    matchingBoardsRef.current?.setColorAt(index * 2, color);
    matchingBoardsRef.current?.setColorAt(index * 2 + 1, color);
  };

  useEffect(() => {
    const matchingSpine = matchingSpineRef.current;
    const matchingPages = matchingPagesRef.current;
    const matchingBoards = matchingBoardsRef.current;
    const filteredSpine = filteredSpineRef.current;
    const filteredPages = filteredPagesRef.current;
    const filteredBoards = filteredBoardsRef.current;
    if (!matchingSpine || !matchingPages || !matchingBoards || !filteredSpine || !filteredPages || !filteredBoards) return;

    items.forEach((item, index) => {
      matchingSpine.setMatrixAt(index, item.spineMatrix);
      filteredSpine.setMatrixAt(index, item.spineMatrix);
      matchingPages.setMatrixAt(index, item.pageMatrix);
      filteredPages.setMatrixAt(index, item.pageMatrix);
      matchingSpine.setColorAt(index, item.coverColor);
      filteredSpine.setColorAt(index, item.coverColor);
      matchingPages.setColorAt(index, item.pageColor);
      filteredPages.setColorAt(index, item.pageColor);
      matchingBoards.setMatrixAt(index * 2, item.leftBoardMatrix);
      matchingBoards.setMatrixAt(index * 2 + 1, item.rightBoardMatrix);
      filteredBoards.setMatrixAt(index * 2, item.leftBoardMatrix);
      filteredBoards.setMatrixAt(index * 2 + 1, item.rightBoardMatrix);
      [matchingBoards, filteredBoards].forEach((boards) => {
        boards.setColorAt(index * 2, item.coverColor);
        boards.setColorAt(index * 2 + 1, item.coverColor);
      });
    });

    matchingSpine.count = matchingPages.count = filteredSpine.count = filteredPages.count = items.length;
    matchingBoards.count = filteredBoards.count = items.length * 2;
    [matchingSpine, matchingPages, matchingBoards, filteredSpine, filteredPages, filteredBoards].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    invalidate();
  }, [invalidate, items]);

  useEffect(() => {
    const matchingSpine = matchingSpineRef.current;
    const matchingPages = matchingPagesRef.current;
    const matchingBoards = matchingBoardsRef.current;
    const filteredSpine = filteredSpineRef.current;
    const filteredPages = filteredPagesRef.current;
    const filteredBoards = filteredBoardsRef.current;
    if (!matchingSpine || !matchingPages || !matchingBoards || !filteredSpine || !filteredPages || !filteredBoards) return;

    items.forEach((item, index) => {
      const matches = matchingSerials.has(item.book.serialNumber);
      matchingSpine.setMatrixAt(index, matches ? item.spineMatrix : HIDDEN_MATRIX);
      filteredSpine.setMatrixAt(index, matches ? HIDDEN_MATRIX : item.spineMatrix);
      matchingPages.setMatrixAt(index, matches ? item.pageMatrix : HIDDEN_MATRIX);
      filteredPages.setMatrixAt(index, matches ? HIDDEN_MATRIX : item.pageMatrix);
      matchingBoards.setMatrixAt(index * 2, matches ? item.leftBoardMatrix : HIDDEN_MATRIX);
      matchingBoards.setMatrixAt(index * 2 + 1, matches ? item.rightBoardMatrix : HIDDEN_MATRIX);
      filteredBoards.setMatrixAt(index * 2, matches ? HIDDEN_MATRIX : item.leftBoardMatrix);
      filteredBoards.setMatrixAt(index * 2 + 1, matches ? HIDDEN_MATRIX : item.rightBoardMatrix);
    });
    [matchingSpine, matchingPages, matchingBoards, filteredSpine, filteredPages, filteredBoards].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
    invalidate();
  }, [invalidate, items, matchingSerials]);

  useEffect(() => {
    const currentTarget = targetRef.current;
    if (!currentTarget) return;
    const remainsTargetable = currentTarget.location === "table"
      ? tableBooks.some((book) => book.serialNumber === currentTarget.book.serialNumber)
      : items.some((item) => item.book.serialNumber === currentTarget.book.serialNumber)
        && matchingSerials.has(currentTarget.book.serialNumber);
    if (remainsTargetable) return;
    if (targetIndexRef.current !== null) {
      const previous = items[targetIndexRef.current];
      if (previous) setCoverColor(targetIndexRef.current, getBookAppearanceColor(resolveBookAppearance(previous.book)));
    }
    if (matchingSpineRef.current?.instanceColor) matchingSpineRef.current.instanceColor.needsUpdate = true;
    if (matchingBoardsRef.current?.instanceColor) matchingBoardsRef.current.instanceColor.needsUpdate = true;
    targetIndexRef.current = null;
    targetRef.current = null;
    onTarget(null);
    invalidate();
  }, [invalidate, items, matchingSerials, onTarget, tableBooks]);

  useFrame(() => {
    const matchingSpine = matchingSpineRef.current;
    const filteredSpine = filteredSpineRef.current;
    if (!matchingSpine || !filteredSpine) return;
    raycaster.setFromCamera(CENTER_POINTER, camera);
    const targets = raycastTargetsRef.current;
    targets.length = 0;
    targets.push(matchingSpine, filteredSpine);
    if (tableGroupRef.current) targets.push(tableGroupRef.current);
    const intersections = intersectionsRef.current;
    intersections.length = 0;
    raycaster.intersectObjects(targets, true, intersections);
    const hit = intersections[0];
    intersections.length = 0;
    let nextIndex: number | null = null;
    let next: BookSelection | null = null;
    if (hit?.object === matchingSpine && hit.instanceId !== undefined) {
      nextIndex = hit.instanceId;
      const nextItem = items[nextIndex];
      if (nextItem && matchingSerials.has(nextItem.book.serialNumber)) {
        next = { book: nextItem.book, location: "shelf" };
      }
    } else if (hit?.object !== filteredSpine && hit) {
      let object: THREE.Object3D | null = hit.object;
      while (object && typeof object.userData.tableBookIndex !== "number") object = object.parent;
      const tableIndex = object?.userData.tableBookIndex;
      const book = typeof tableIndex === "number" ? tableBooks[tableIndex] : null;
      if (book) next = { book, location: "table" };
    }
    if (sameSelection(next, targetRef.current)) return;

    if (targetIndexRef.current !== null) {
      const previous = items[targetIndexRef.current];
      if (previous) setCoverColor(targetIndexRef.current, getBookAppearanceColor(resolveBookAppearance(previous.book)));
    }
    targetIndexRef.current = next?.location === "shelf" ? nextIndex : null;
    if (targetIndexRef.current !== null) setCoverColor(targetIndexRef.current, HIGHLIGHT_COLOR);
    if (matchingSpine.instanceColor) matchingSpine.instanceColor.needsUpdate = true;
    if (matchingBoardsRef.current?.instanceColor) matchingBoardsRef.current.instanceColor.needsUpdate = true;
    targetRef.current = next;
    onTarget(next);
  });

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement && targetRef.current) onSelect(targetRef.current);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [onSelect]);

  return <>
    <instancedMesh ref={matchingPagesRef} args={[geometries.pages, undefined, items.length]} receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.92} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={matchingBoardsRef} args={[geometries.boards, undefined, items.length * 2]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.74} metalness={0.01} />
    </instancedMesh>
    <instancedMesh ref={matchingSpineRef} args={[geometries.spine, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.64} metalness={0.015} />
    </instancedMesh>
    <instancedMesh ref={filteredPagesRef} args={[geometries.pages, undefined, items.length]} receiveShadow renderOrder={0}>
      <meshStandardMaterial color="#ffffff" roughness={0.92} metalness={0} transparent opacity={FILTERED_BOOK_OPACITY} depthWrite />
    </instancedMesh>
    <instancedMesh ref={filteredBoardsRef} args={[geometries.boards, undefined, items.length * 2]} receiveShadow renderOrder={1}>
      <meshStandardMaterial color="#ffffff" roughness={0.74} metalness={0.01} transparent opacity={FILTERED_BOOK_OPACITY} depthWrite />
    </instancedMesh>
    <instancedMesh ref={filteredSpineRef} args={[geometries.spine, undefined, items.length]} receiveShadow renderOrder={2}>
      <meshStandardMaterial color="#ffffff" roughness={0.64} metalness={0.015} transparent opacity={FILTERED_BOOK_OPACITY} depthWrite />
    </instancedMesh>
    <BookStack
      books={tableBooks}
      highlightedSerialNumber={target?.location === "table" ? target.book.serialNumber : undefined}
      groupRef={tableGroupRef}
      geometries={geometries}
      bookUserData={getTableBookUserData}
    />
  </>;
}

export default function BookCollection({ books, tableBooks, matchingSerials, onSelect, onTarget, target, shelfWidth, bookFace, tierY, slotsPerTier, capacity }: {
  books: Book[];
  tableBooks: Book[];
  matchingSerials: Set<number>;
  onSelect: (selection: BookSelection) => void;
  onTarget: (selection: BookSelection | null) => void;
  target: BookSelection | null;
  shelfWidth: number;
  bookFace: number;
  tierY: number[];
  slotsPerTier: number;
  capacity: number;
}) {
  const config = useMemo<BookRenderConfig>(() => ({ shelfWidth, bookFace, tierY, slotsPerTier, capacity }), [bookFace, capacity, shelfWidth, slotsPerTier, tierY]);
  const profiledItems = useMemo(() => getProfiledBooks(books, capacity), [books, capacity]);
  const items = useMemo(() => createRenderedBooks(profiledItems, config), [config, profiledItems]);
  return <>
    <RealisticBooks items={items} tableBooks={tableBooks} matchingSerials={matchingSerials} onSelect={onSelect} onTarget={onTarget} target={target} />
    <BookTitles items={items} matchingSerials={matchingSerials} />
  </>;
}
