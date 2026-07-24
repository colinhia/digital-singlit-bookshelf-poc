"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Book, BookRenderProfile } from "@/types/library";
import { getBookAppearanceColor, resolveBookAppearance } from "@/components/scene-assets/books/bookAppearance";
import { BookStack } from "@/components/scene-assets/books/BookStack";
import {
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
import { WoodenPictureFrame } from "@/components/scene-assets/WoodenPictureFrame";
import { FlowerTrough, type FlowerVariant } from "@/components/scene-assets/PlanterFlowers";
import {
  BOOK_FACE,
  resolveTopDownTierY,
  SHELF_WIDTH,
  TIER_Y,
} from "@/components/scene-assets/roomLayout";
import {
  MY_LIBRARY_TABLE_BOOK_POSITION,
  MY_LIBRARY_PICTURE_FRAME_POSITION,
  MY_LIBRARY_FLOWER_TROUGH_POSITIONS,
  READING_LIST_BOOKCASE_HEIGHT,
  READING_LIST_BOOKCASE_WIDTH,
  READING_LIST_SHELF_WIDTH,
  READING_LIST_SLOTS_PER_TIER,
  READING_LIST_TIER_Y,
} from "@/experiences/mylibrary/layout";
import type { PhotoOption } from "@/experiences/mylibrary/photoOptions";
import type {
  MyLibraryLocation,
  MyLibrarySelection,
  MyLibraryTarget,
} from "@/experiences/mylibrary/types";

const COMPLETED_SLOTS_PER_TIER = 25;
const CENTER_POINTER = new THREE.Vector2(0, 0);

interface ProfiledShelfItem {
  book: Book;
  location: Exclude<MyLibraryLocation, "currently-reading">;
  slotIndex: number;
  profile: BookRenderProfile;
}

interface CuratedShelfItem extends ProfiledShelfItem {
  baseTransform: THREE.Matrix4;
  spineMatrix: THREE.Matrix4;
  pageMatrix: THREE.Matrix4;
  leftBoardMatrix: THREE.Matrix4;
  rightBoardMatrix: THREE.Matrix4;
  coverColor: THREE.Color;
  pageColor: THREE.Color;
}

function makeShelfItems(
  readingListBooks: Book[],
  completedBooks: Book[],
): ProfiledShelfItem[] {
  return [
    ...readingListBooks.map((book, slotIndex) => ({
      book,
      location: "reading-list" as const,
      slotIndex,
      profile: resolveBookRenderProfile(book),
    })),
    ...completedBooks.map((book, slotIndex) => ({
      book,
      location: "completed" as const,
      slotIndex,
      profile: resolveBookRenderProfile(book),
    })),
  ];
}

function baseMatrix(item: ProfiledShelfItem) {
  const isReadingList = item.location === "reading-list";
  const slotsPerTier = isReadingList ? READING_LIST_SLOTS_PER_TIER : COMPLETED_SLOTS_PER_TIER;
  const shelfWidth = isReadingList ? READING_LIST_SHELF_WIDTH : SHELF_WIDTH;
  const tierY = isReadingList ? READING_LIST_TIER_Y : TIER_Y;
  const tier = Math.floor(item.slotIndex / slotsPerTier);
  const positionOnTier = item.slotIndex % slotsPerTier;
  const step = shelfWidth / slotsPerTier;
  const along = -shelfWidth / 2 + step / 2 + positionOnTier * step;
  const shelfY = resolveTopDownTierY(tierY, tier) ?? tierY[0] ?? 0;
  const position = isReadingList
    ? new THREE.Vector3(-BOOK_FACE, shelfY, -along)
    : new THREE.Vector3(along, shelfY, -BOOK_FACE);
  const yaw = isReadingList ? Math.PI / 2 : 0;
  return new THREE.Matrix4()
    .makeTranslation(position.x, position.y, position.z)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeRotationZ(item.profile.lean));
}

function layerMatrix(
  baseTransform: THREE.Matrix4,
  dimensions: [number, number, number],
  offset: [number, number, number] = [0, 0, 0],
) {
  return baseTransform.clone()
    .multiply(new THREE.Matrix4().makeTranslation(offset[0], offset[1] + dimensions[1] / 2, offset[2]))
    .multiply(new THREE.Matrix4().makeScale(...dimensions));
}

function createRenderedShelfItems(items: ProfiledShelfItem[]): CuratedShelfItem[] {
  return items.map((item) => {
    const baseTransform = baseMatrix(item);
    const layers = resolveBookLayerGeometry(item.profile);
    return {
      ...item,
      baseTransform,
      spineMatrix: layerMatrix(baseTransform, layers.spineDimensions, layers.spineOffset),
      pageMatrix: layerMatrix(baseTransform, layers.pageDimensions, layers.pageOffset),
      leftBoardMatrix: layerMatrix(baseTransform, layers.boardDimensions, [-layers.boardX, 0, 0]),
      rightBoardMatrix: layerMatrix(baseTransform, layers.boardDimensions, [layers.boardX, 0, 0]),
      coverColor: new THREE.Color(getBookAppearanceColor(resolveBookAppearance(item.book))),
      pageColor: new THREE.Color(getBookPageColor(item.book)),
    };
  });
}

function BookTitleBatch({
  items,
  fontFamilies,
  columns,
}: {
  items: CuratedShelfItem[];
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
        const labelWidth = TITLE_CELL_HEIGHT;
        const labelHeight = 104;
        const ruleOffset = labelWidth / 2 - 22;
        const fitted = fitSpineTitle(
          context,
          spineTitle(book.title),
          ruleOffset * 2 - 24,
          fontFamilies[book.language],
        );
        context.save();
        context.translate(centerX, centerY);
        context.rotate(-Math.PI / 2);
        context.fillStyle = TITLE_ACCENT_COLOR;
        context.globalAlpha = 0.68;
        [-ruleOffset, ruleOffset].forEach((offset) => context.fillRect(offset - 2, -labelHeight / 2, 4, labelHeight));
        context.globalAlpha = 1;
        context.fillStyle = TITLE_TEXT_COLOR;
        context.font = fontDeclaration(fitted.fontSize, fontFamilies[book.language]);
        const lineHeight = fitted.fontSize * 1.05;
        const firstLineY = -((fitted.lines.length - 1) * lineHeight) / 2;
        fitted.lines.forEach((line, lineIndex) => context.fillText(line, 0, firstLineY + lineIndex * lineHeight));
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

  const geometry = useMemo(() => {
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const vertex = new THREE.Vector3();
    items.forEach((item, index) => {
      const transform = item.baseTransform;
      const firstVertex = positions.length / 3;
      const halfWidth = item.profile.width * 0.44;
      const front = item.profile.depth / 2 + 0.006;
      const corners: [number, number, number][] = [
        [-halfWidth, 0, front], [halfWidth, 0, front],
        [halfWidth, item.profile.height, front], [-halfWidth, item.profile.height, front],
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
  }, [columns, items]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} renderOrder={4}>
    <meshBasicMaterial map={texture} transparent alphaTest={0.12} depthWrite={false} toneMapped={false} side={THREE.FrontSide} />
  </mesh>;
}

function BookTitles({ items }: { items: CuratedShelfItem[] }) {
  const { gl } = useThree();
  const fontFamilies = useSpineFontFamilies(items);
  const maximumTextureSize = gl.capabilities.maxTextureSize;
  const columns = Math.max(1, Math.min(
    items.length || 1,
    TITLE_ATLAS_COLUMNS,
    Math.floor(maximumTextureSize / TITLE_CELL_WIDTH),
  ));
  const rows = Math.max(1, Math.floor(maximumTextureSize / TITLE_CELL_HEIGHT));
  const batchCapacity = columns * rows;
  const batches = useMemo(() => Array.from(
    { length: Math.ceil(items.length / batchCapacity) },
    (_, index) => items.slice(index * batchCapacity, (index + 1) * batchCapacity),
  ), [batchCapacity, items]);
  return <>{batches.map((batch, index) => <BookTitleBatch
    key={`${index}-${batch[0]?.book.serialNumber ?? "empty"}`}
    items={batch}
    fontFamilies={fontFamilies}
    columns={columns}
  />)}</>;
}

function sameTarget(left: MyLibraryTarget | null, right: MyLibraryTarget | null) {
  if (left?.kind !== right?.kind) return false;
  if (left?.kind === "flower-trough" && right?.kind === "flower-trough") return left.side === right.side;
  if (left?.kind !== "book" || right?.kind !== "book") return left?.kind === right?.kind;
  return left.selection.location === right.selection.location
    && left.selection.book.serialNumber === right.selection.book.serialNumber;
}

function tableBookUserData(_book: BookVisualData) {
  return { myLibraryTableBook: true };
}

export default function CuratedBooks({
  readingListBooks,
  completedBooks,
  currentlyReadingBook,
  framePhoto,
  frameEditable,
  flowerVariant,
  flowerEditable,
  target,
  onTarget,
  onActivateTarget,
}: {
  readingListBooks: Book[];
  completedBooks: Book[];
  currentlyReadingBook: Book | null;
  framePhoto: PhotoOption | null;
  frameEditable: boolean;
  flowerVariant: FlowerVariant;
  flowerEditable: boolean;
  target: MyLibraryTarget | null;
  onTarget: (target: MyLibraryTarget | null) => void;
  onActivateTarget: (target: MyLibraryTarget) => void;
}) {
  const profiledItems = useMemo(
    () => makeShelfItems(readingListBooks, completedBooks),
    [completedBooks, readingListBooks],
  );
  const items = useMemo(() => createRenderedShelfItems(profiledItems), [profiledItems]);
  const spineRef = useRef<THREE.InstancedMesh>(null);
  const pagesRef = useRef<THREE.InstancedMesh>(null);
  const boardsRef = useRef<THREE.InstancedMesh>(null);
  const tableRef = useRef<THREE.Group>(null);
  const readingShelfRef = useRef<THREE.Mesh>(null);
  const pictureFrameRef = useRef<THREE.Group>(null);
  const flowerTroughRefs = useRef<Array<THREE.Group | null>>([]);
  const targetRef = useRef<MyLibraryTarget | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const { camera, invalidate } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const raycastTargetsRef = useRef<THREE.Object3D[]>([]);
  const intersectionsRef = useRef<THREE.Intersection[]>([]);
  const coverColorRef = useRef(new THREE.Color());
  const geometries = useBookGeometries();
  const instanceCapacity = Math.max(1, items.length);

  const setCoverColor = (index: number, value: string) => {
    const color = coverColorRef.current.set(value);
    spineRef.current?.setColorAt(index, color);
    boardsRef.current?.setColorAt(index * 2, color);
    boardsRef.current?.setColorAt(index * 2 + 1, color);
  };

  useEffect(() => {
    const spine = spineRef.current;
    const pages = pagesRef.current;
    const boards = boardsRef.current;
    if (!spine || !pages || !boards) return;
    items.forEach((item, index) => {
      spine.setMatrixAt(index, item.spineMatrix);
      pages.setMatrixAt(index, item.pageMatrix);
      boards.setMatrixAt(index * 2, item.leftBoardMatrix);
      boards.setMatrixAt(index * 2 + 1, item.rightBoardMatrix);
      spine.setColorAt(index, item.coverColor);
      pages.setColorAt(index, item.pageColor);
      boards.setColorAt(index * 2, item.coverColor);
      boards.setColorAt(index * 2 + 1, item.coverColor);
    });
    spine.count = pages.count = items.length;
    boards.count = items.length * 2;
    [spine, pages, boards].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    invalidate();
  }, [invalidate, items]);

  useEffect(() => {
    const current = targetRef.current;
    if (!current || current.kind !== "book") return;
    const remains = current.selection.location === "currently-reading"
      ? currentlyReadingBook?.serialNumber === current.selection.book.serialNumber
      : items.some((item) => item.location === current.selection.location
        && item.book.serialNumber === current.selection.book.serialNumber);
    if (remains) return;
    targetRef.current = null;
    targetIndexRef.current = null;
    onTarget(null);
  }, [currentlyReadingBook, items, onTarget]);

  useEffect(() => {
    if (frameEditable || targetRef.current?.kind !== "picture-frame") return;
    targetRef.current = null;
    onTarget(null);
  }, [frameEditable, onTarget]);

  useEffect(() => {
    if (flowerEditable || targetRef.current?.kind !== "flower-trough") return;
    targetRef.current = null;
    onTarget(null);
  }, [flowerEditable, onTarget]);

  useFrame(() => {
    const spine = spineRef.current;
    const shelfTarget = readingShelfRef.current;
    if (!spine || !shelfTarget) return;
    raycaster.setFromCamera(CENTER_POINTER, camera);
    const targets = raycastTargetsRef.current;
    targets.length = 0;
    targets.push(spine, shelfTarget);
    if (tableRef.current) targets.push(tableRef.current);
    if (frameEditable && pictureFrameRef.current) targets.push(pictureFrameRef.current);
    if (flowerEditable) flowerTroughRefs.current.forEach((trough) => trough && targets.push(trough));
    const intersections = intersectionsRef.current;
    intersections.length = 0;
    raycaster.intersectObjects(targets, true, intersections);
    const hit = intersections[0];
    intersections.length = 0;
    let nextIndex: number | null = null;
    let next: MyLibraryTarget | null = null;
    if (hit?.object === spine && hit.instanceId !== undefined) {
      nextIndex = hit.instanceId;
      const item = items[nextIndex];
      if (item) next = { kind: "book", selection: { book: item.book, location: item.location } };
    } else if (hit) {
      let object: THREE.Object3D | null = hit.object;
      while (object
        && !object.userData.myLibraryTableBook
        && !object.userData.readingShelfTarget
        && !object.userData.pictureFrameTarget
        && !object.userData.flowerTroughTarget) object = object.parent;
      if (object?.userData.myLibraryTableBook && currentlyReadingBook) {
        next = {
          kind: "book",
          selection: { book: currentlyReadingBook, location: "currently-reading" },
        };
      } else if (object?.userData.readingShelfTarget) {
        next = { kind: "reading-shelf" };
      } else if (object?.userData.pictureFrameTarget) {
        next = { kind: "picture-frame" };
      } else if (object?.userData.flowerTroughTarget) {
        next = { kind: "flower-trough", side: object.userData.flowerTroughTarget };
      }
    }
    if (sameTarget(next, targetRef.current)) return;
    if (targetIndexRef.current !== null) {
      const previous = items[targetIndexRef.current];
      if (previous) setCoverColor(targetIndexRef.current, getBookAppearanceColor(resolveBookAppearance(previous.book)));
    }
    targetIndexRef.current = next?.kind === "book" && next.selection.location !== "currently-reading" ? nextIndex : null;
    if (targetIndexRef.current !== null) setCoverColor(targetIndexRef.current, HIGHLIGHT_COLOR);
    if (spine.instanceColor) spine.instanceColor.needsUpdate = true;
    if (boardsRef.current?.instanceColor) boardsRef.current.instanceColor.needsUpdate = true;
    targetRef.current = next;
    onTarget(next);
  });

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement && targetRef.current) onActivateTarget(targetRef.current);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [onActivateTarget]);

  return <>
    <instancedMesh ref={pagesRef} args={[geometries.pages, undefined, instanceCapacity]} receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.92} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={boardsRef} args={[geometries.boards, undefined, instanceCapacity * 2]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.74} metalness={0.01} />
    </instancedMesh>
    <instancedMesh ref={spineRef} args={[geometries.spine, undefined, instanceCapacity]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.64} metalness={0.015} />
    </instancedMesh>
    <BookTitles items={items} />
    <BookStack
      books={currentlyReadingBook ? [currentlyReadingBook] : []}
      highlightedSerialNumber={target?.kind === "book" && target.selection.location === "currently-reading"
        ? target.selection.book.serialNumber
        : undefined}
      groupRef={tableRef}
      geometries={geometries}
      bookUserData={tableBookUserData}
      position={MY_LIBRARY_TABLE_BOOK_POSITION}
    />
    <WoodenPictureFrame
      photo={framePhoto}
      highlighted={target?.kind === "picture-frame"}
      groupRef={pictureFrameRef}
      position={MY_LIBRARY_PICTURE_FRAME_POSITION}
      rotation={[0, Math.PI / 2, 0]}
    />
    {MY_LIBRARY_FLOWER_TROUGH_POSITIONS.map((position, index) => {
      const side = index === 0 ? "left" : "right";
      return <group
        key={`my-library-flower-trough-${side}`}
        ref={(group) => { flowerTroughRefs.current[index] = group; }}
        position={position}
        rotation={[0, -Math.PI / 2, 0]}
        userData={{ flowerTroughTarget: side }}
      >
        <FlowerTrough
          variant={flowerVariant}
          highlighted={target?.kind === "flower-trough" && target.side === side}
        />
      </group>;
    })}
    <mesh
      ref={readingShelfRef}
      position={[-BOOK_FACE - 0.1, READING_LIST_BOOKCASE_HEIGHT / 2, 0]}
      userData={{ readingShelfTarget: true }}
    >
      <boxGeometry args={[0.12, READING_LIST_BOOKCASE_HEIGHT, READING_LIST_BOOKCASE_WIDTH]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </>;
}
