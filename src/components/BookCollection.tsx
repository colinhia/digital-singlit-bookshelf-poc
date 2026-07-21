"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import type { Book, BookRenderProfile, BookSelection, BookSlot } from "@/types/library";
import { bookSlots } from "@/data/room";
import { getBookAppearanceColor, resolveBookAppearance } from "@/data/bookAppearance";
import { TABLE_BOOK_STACK_POSITION } from "@/components/scene-assets/furnitureLayout";

const TITLE_CHARACTER_LIMIT = 20;
const TITLE_ATLAS_COLUMNS = 30;
const TITLE_CELL_WIDTH = 128;
const TITLE_CELL_HEIGHT = 384;
const TITLE_MAX_FONT_SIZE = 48;
const TITLE_MIN_FONT_SIZE = 40;
const TITLE_FONT_WEIGHT = 700;
const TITLE_ACCENT_COLOR = "#c7a46b";
const TITLE_TEXT_COLOR = "#d8cfbf";
const HIGHLIGHT_COLOR = "#75412a";
const FILTERED_BOOK_OPACITY = 0.25;
const PAGE_COLORS = ["#eadfce", "#f2e8d8", "#ded1be", "#e7dac7"];
const FALLBACK_FONT_FAMILY = "Arial, sans-serif";

type SpineFontFamilies = Record<Book["language"], string>;

const FALLBACK_FONT_FAMILIES: SpineFontFamilies = {
  Chinese: FALLBACK_FONT_FAMILY,
  English: FALLBACK_FONT_FAMILY,
  Malay: FALLBACK_FONT_FAMILY,
  Tamil: FALLBACK_FONT_FAMILY,
};

const FONT_VARIABLES: Record<Book["language"], string> = {
  Chinese: "--font-spine-chinese",
  English: "--font-spine-latin",
  Malay: "--font-spine-latin",
  Tamil: "--font-spine-tamil",
};

const graphemeSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

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

function hashNumber(serialNumber: number, salt: number) {
  let value = (Math.trunc(serialNumber) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function noise(serialNumber: number, salt: number) {
  return hashNumber(serialNumber, salt) / 0xffffffff;
}

export function resolveBookRenderProfile(book: Pick<Book, "serialNumber">): BookRenderProfile {
  const serialNumber = book.serialNumber;
  const binding = hashNumber(serialNumber, 0x71a9) % 5 === 0 ? "paperback" : "hardcover";
  const leanNoise = noise(serialNumber, 0x3491) * 2 - 1;
  return {
    serialNumber,
    binding,
    width: 0.215 + noise(serialNumber, 0x1123) * 0.037,
    height: 0.7 + noise(serialNumber, 0x2457) * 0.15,
    depth: 0.29 + noise(serialNumber, 0x3869) * 0.06,
    lean: Math.abs(leanNoise) < 0.18 ? 0 : THREE.MathUtils.degToRad(leanNoise * 1.5),
    coverThickness: binding === "hardcover" ? 0.014 + noise(serialNumber, 0x4973) * 0.004 : 0.006,
    pageInset: binding === "hardcover" ? 0.035 : 0.016,
  };
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
  const shelfY = config.tierY[slot.tier];
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
  item: ProfiledBook,
  config: BookRenderConfig,
  dimensions: [number, number, number],
  offset: [number, number, number] = [0, 0, 0],
) {
  const [width, height, depth] = dimensions;
  return baseMatrix(item, config)
    .multiply(new THREE.Matrix4().makeTranslation(offset[0], offset[1] + height / 2, offset[2]))
    .multiply(new THREE.Matrix4().makeScale(width, height, depth));
}

function splitGraphemes(value: string) {
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment)
    : Array.from(value);
}

function spineTitle(title: string) {
  const graphemes = splitGraphemes(title);
  return graphemes.length <= TITLE_CHARACTER_LIMIT
    ? title
    : `${graphemes.slice(0, TITLE_CHARACTER_LIMIT - 1).join("").trimEnd()}…`;
}

function resolveSpineFontFamilies() {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(Object.entries(FONT_VARIABLES).map(([language, variable]) => {
    const family = styles.getPropertyValue(variable).trim();
    return [language, family ? `${family}, ${FALLBACK_FONT_FAMILY}` : FALLBACK_FONT_FAMILY];
  })) as SpineFontFamilies;
}

function fontDeclaration(fontSize: number, family: string) {
  return `${TITLE_FONT_WEIGHT} ${fontSize}px ${family}`;
}

function useSpineFontFamilies(items: ProfiledBook[]) {
  const [fontFamilies, setFontFamilies] = useState<SpineFontFamilies>(FALLBACK_FONT_FAMILIES);

  useEffect(() => {
    let active = true;
    const resolvedFamilies = resolveSpineFontFamilies();
    const loads = (Object.keys(resolvedFamilies) as Book["language"][]).map((language) => {
      const sample = Array.from(new Set(items
        .filter(({ book }) => book.language === language)
        .flatMap(({ book }) => splitGraphemes(book.title))))
        .join("") || language;
      return document.fonts.load(fontDeclaration(TITLE_MAX_FONT_SIZE, resolvedFamilies[language]), sample);
    });

    Promise.allSettled(loads).then(() => {
      if (active) setFontFamilies(resolvedFamilies);
    });

    return () => { active = false; };
  }, [items]);

  return fontFamilies;
}

function wrapSpineTitle(context: CanvasRenderingContext2D, title: string, maximumWidth: number) {
  if (context.measureText(title).width <= maximumWidth) return [title];

  const graphemes = splitGraphemes(title);
  const whitespaceBreaks = graphemes.flatMap((grapheme, index) => /\s/.test(grapheme) ? [index] : []);
  const candidates = whitespaceBreaks.length > 0
    ? whitespaceBreaks
    : Array.from({ length: Math.max(0, graphemes.length - 1) }, (_, index) => index + 1);

  const best = candidates.reduce<{ lines: string[]; width: number } | null>((current, splitAt) => {
    const lines = whitespaceBreaks.length > 0
      ? [graphemes.slice(0, splitAt).join("").trim(), graphemes.slice(splitAt + 1).join("").trim()]
      : [graphemes.slice(0, splitAt).join(""), graphemes.slice(splitAt).join("")];
    const width = Math.max(...lines.map((line) => context.measureText(line).width));
    return !current || width < current.width ? { lines, width } : current;
  }, null);

  return best?.lines.filter(Boolean) ?? [title];
}

function fitSpineTitle(
  context: CanvasRenderingContext2D,
  title: string,
  maximumWidth: number,
  fontFamily: string,
) {
  for (let fontSize = TITLE_MAX_FONT_SIZE; fontSize >= TITLE_MIN_FONT_SIZE; fontSize -= 2) {
    context.font = fontDeclaration(fontSize, fontFamily);
    const lines = wrapSpineTitle(context, title, maximumWidth);
    if (lines.every((line) => context.measureText(line).width <= maximumWidth)) return { fontSize, lines };
  }

  context.font = fontDeclaration(TITLE_MIN_FONT_SIZE, fontFamily);
  const graphemes = splitGraphemes(title.replace(/…$/, ""));
  for (let length = graphemes.length - 1; length > 0; length -= 1) {
    const shortened = `${graphemes.slice(0, length).join("").trimEnd()}…`;
    const lines = wrapSpineTitle(context, shortened, maximumWidth);
    if (lines.every((line) => context.measureText(line).width <= maximumWidth)) {
      return { fontSize: TITLE_MIN_FONT_SIZE, lines };
    }
  }

  return { fontSize: TITLE_MIN_FONT_SIZE, lines: ["…"] };
}

function BookTitleBatch({
  items,
  matchingSerials,
  config,
  fontFamilies,
  columns,
}: {
  items: ProfiledBook[];
  matchingSerials: Set<number>;
  config: BookRenderConfig;
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
        const transform = baseMatrix(item, config);
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
  }, [columns, config, items, matchingSerials]);

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

function BookTitles({ items, matchingSerials, config }: { items: ProfiledBook[]; matchingSerials: Set<number>; config: BookRenderConfig }) {
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
    config={config}
    fontFamilies={fontFamilies}
    columns={columns}
  />)}</>;
}

function sameSelection(left: BookSelection | null, right: BookSelection | null) {
  return left?.location === right?.location && left?.book.serialNumber === right?.book.serialNumber;
}

function TableBookStack({ books, target, groupRef, geometries }: {
  books: Book[];
  target: BookSelection | null;
  groupRef: React.RefObject<THREE.Group>;
  geometries: { spine: THREE.BufferGeometry; pages: THREE.BufferGeometry; boards: THREE.BufferGeometry };
}) {
  const entries = useMemo(() => {
    let stackHeight = 0;
    return books.map((book) => {
      const profile = resolveBookRenderProfile(book);
      const centreY = stackHeight + profile.width / 2;
      stackHeight += profile.width + 0.008;
      return { book, profile, centreY };
    });
  }, [books]);

  return <group
    ref={groupRef}
    position={TABLE_BOOK_STACK_POSITION}
  >
    {entries.map(({ book, profile, centreY }, index) => {
      const highlighted = target?.location === "table" && target.book.serialNumber === book.serialNumber;
      const coverColor = highlighted ? HIGHLIGHT_COLOR : getBookAppearanceColor(resolveBookAppearance(book));
      const pageColor = PAGE_COLORS[hashNumber(book.serialNumber, 0x5a17) % PAGE_COLORS.length];
      const spineDepth = profile.binding === "hardcover" ? 0.034 : 0.024;
      const pageHeightInset = profile.binding === "hardcover" ? 0.044 : 0.018;
      const pageWidthInset = profile.binding === "hardcover" ? profile.coverThickness * 2.35 : 0.012;
      const boardX = profile.width / 2 - profile.coverThickness / 2;
      const hitData = { tableBookIndex: index };
      return <group key={book.serialNumber} position={[0, centreY, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh
          geometry={geometries.pages}
          scale={[profile.width - pageWidthInset, profile.height - pageHeightInset, profile.depth - profile.pageInset]}
          position={[0, 0, -profile.pageInset / 2]}
          userData={hitData}
          receiveShadow
        >
          <meshStandardMaterial color={pageColor} roughness={0.92} metalness={0} />
        </mesh>
        <mesh
          geometry={geometries.spine}
          scale={[profile.width, profile.height, spineDepth]}
          position={[0, 0, profile.depth / 2 - spineDepth / 2 + 0.001]}
          userData={hitData}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={coverColor} roughness={0.64} metalness={0.015} />
        </mesh>
        {[-boardX, boardX].map((x) => <mesh
          key={x}
          geometry={geometries.boards}
          scale={[profile.coverThickness, profile.height, profile.depth]}
          position={[x, 0, 0]}
          userData={hitData}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={coverColor} roughness={0.74} metalness={0.01} />
        </mesh>)}
      </group>;
    })}
  </group>;
}

function RealisticBooks({ items, tableBooks, matchingSerials, config, onSelect, onTarget, target }: {
  items: ProfiledBook[];
  tableBooks: Book[];
  matchingSerials: Set<number>;
  config: BookRenderConfig;
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
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const geometries = useMemo(() => ({
    spine: new RoundedBoxGeometry(1, 1, 1, 2, 0.045),
    pages: new RoundedBoxGeometry(1, 1, 1, 1, 0.03),
    boards: new RoundedBoxGeometry(1, 1, 1, 1, 0.025),
  }), []);

  useEffect(() => () => {
    geometries.spine.dispose();
    geometries.pages.dispose();
    geometries.boards.dispose();
  }, [geometries]);

  const setCoverColor = (index: number, value: string) => {
    const color = new THREE.Color(value);
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

    const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    const pageColor = new THREE.Color();
    const coverColor = new THREE.Color();
    items.forEach((item, index) => {
      const { profile, book } = item;
      const matches = matchingSerials.has(book.serialNumber);
      const spineDepth = profile.binding === "hardcover" ? 0.034 : 0.024;
      const pageHeightInset = profile.binding === "hardcover" ? 0.044 : 0.018;
      const pageWidthInset = profile.binding === "hardcover" ? profile.coverThickness * 2.35 : 0.012;
      const pageDimensions: [number, number, number] = [
        profile.width - pageWidthInset,
        profile.height - pageHeightInset,
        profile.depth - profile.pageInset,
      ];
      const pageOffset: [number, number, number] = [0, pageHeightInset / 2, -profile.pageInset / 2];
      const spineDimensions: [number, number, number] = [profile.width, profile.height, spineDepth];
      const spineOffset: [number, number, number] = [0, 0, profile.depth / 2 - spineDepth / 2 + 0.001];
      const spineMatrix = layerMatrix(item, config, spineDimensions, spineOffset);
      const pageMatrix = layerMatrix(item, config, pageDimensions, pageOffset);
      matchingSpine.setMatrixAt(index, matches ? spineMatrix : hiddenMatrix);
      filteredSpine.setMatrixAt(index, matches ? hiddenMatrix : spineMatrix);
      matchingPages.setMatrixAt(index, matches ? pageMatrix : hiddenMatrix);
      filteredPages.setMatrixAt(index, matches ? hiddenMatrix : pageMatrix);

      coverColor.set(getBookAppearanceColor(resolveBookAppearance(book)));
      pageColor.set(PAGE_COLORS[hashNumber(book.serialNumber, 0x5a17) % PAGE_COLORS.length]);
      matchingSpine.setColorAt(index, coverColor);
      filteredSpine.setColorAt(index, coverColor);
      matchingPages.setColorAt(index, pageColor);
      filteredPages.setColorAt(index, pageColor);

      const boardDimensions: [number, number, number] = [profile.coverThickness, profile.height, profile.depth];
      const boardX = profile.width / 2 - profile.coverThickness / 2;
      const leftBoardMatrix = layerMatrix(item, config, boardDimensions, [-boardX, 0, 0]);
      const rightBoardMatrix = layerMatrix(item, config, boardDimensions, [boardX, 0, 0]);
      matchingBoards.setMatrixAt(index * 2, matches ? leftBoardMatrix : hiddenMatrix);
      matchingBoards.setMatrixAt(index * 2 + 1, matches ? rightBoardMatrix : hiddenMatrix);
      filteredBoards.setMatrixAt(index * 2, matches ? hiddenMatrix : leftBoardMatrix);
      filteredBoards.setMatrixAt(index * 2 + 1, matches ? hiddenMatrix : rightBoardMatrix);
      [matchingBoards, filteredBoards].forEach((boards) => {
        boards.setColorAt(index * 2, coverColor);
        boards.setColorAt(index * 2 + 1, coverColor);
      });
    });

    matchingSpine.count = matchingPages.count = filteredSpine.count = filteredPages.count = items.length;
    matchingBoards.count = filteredBoards.count = items.length * 2;
    [matchingSpine, matchingPages, matchingBoards, filteredSpine, filteredPages, filteredBoards].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [config, items, matchingSerials]);

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
  }, [items, matchingSerials, onTarget, tableBooks]);

  useFrame(() => {
    const matchingSpine = matchingSpineRef.current;
    const filteredSpine = filteredSpineRef.current;
    if (!matchingSpine || !filteredSpine) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const targets: THREE.Object3D[] = [matchingSpine, filteredSpine];
    if (tableGroupRef.current) targets.push(tableGroupRef.current);
    const hit = raycaster.intersectObjects(targets, true)[0];
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
    <TableBookStack books={tableBooks} target={target} groupRef={tableGroupRef} geometries={geometries} />
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
  const items = useMemo(() => getProfiledBooks(books, capacity), [books, capacity]);
  return <>
    <RealisticBooks items={items} tableBooks={tableBooks} matchingSerials={matchingSerials} config={config} onSelect={onSelect} onTarget={onTarget} target={target} />
    <BookTitles items={items} matchingSerials={matchingSerials} config={config} />
  </>;
}
