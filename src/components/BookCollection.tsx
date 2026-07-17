"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import type { Book, BookRenderProfile, BookSlot } from "@/types/library";
import { bookSlots } from "@/data/room";
import { getBookAppearanceColor, resolveBookAppearance } from "@/data/bookAppearance";

const TITLE_CHARACTER_LIMIT = 20;
const TITLE_ATLAS_COLUMNS = 30;
const TITLE_CELL_WIDTH = 64;
const TITLE_CELL_HEIGHT = 192;
const HIGHLIGHT_COLOR = "#f0c98e";
const PAGE_COLORS = ["#eadfce", "#f2e8d8", "#ded1be", "#e7dac7"];

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

function spineTitle(title: string) {
  return title.length <= TITLE_CHARACTER_LIMIT
    ? title
    : `${title.slice(0, TITLE_CHARACTER_LIMIT - 1).trimEnd()}…`;
}

function wrapSpineTitle(context: CanvasRenderingContext2D, title: string, maximumWidth: number) {
  if (context.measureText(title).width <= maximumWidth) return [title];

  const midpoint = title.length / 2;
  const spaces = title.split("").reduce<number[]>((indices, character, index) => {
    if (/\s/.test(character)) indices.push(index);
    return indices;
  }, []);
  const splitAt = spaces.length > 0
    ? spaces.reduce((closest, index) => Math.abs(index - midpoint) < Math.abs(closest - midpoint) ? index : closest)
    : Math.ceil(midpoint);

  return [title.slice(0, splitAt).trim(), title.slice(splitAt).trim()].filter(Boolean);
}

function spineTypographyColors(book: Book) {
  const bookColor = getBookAppearanceColor(resolveBookAppearance(book));
  if (bookColor === "#a95147") return { text: "#e2d2c4", accent: "#eaad77" };
  if (bookColor === "#eaad77") return { text: "#38231b", accent: "#f6f5f3" };
  return { text: "#33251f", accent: "#a95147" };
}

function BookTitles({ items, visibleSerials, config }: { items: ProfiledBook[]; visibleSerials: Set<number>; config: BookRenderConfig }) {
  const texture = useMemo(() => {
    const rows = Math.max(1, Math.ceil(items.length / TITLE_ATLAS_COLUMNS));
    const canvas = document.createElement("canvas");
    canvas.width = TITLE_ATLAS_COLUMNS * TITLE_CELL_WIDTH;
    canvas.height = rows * TITLE_CELL_HEIGHT;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = "600 22px Georgia, serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      items.forEach(({ book }, index) => {
        const column = index % TITLE_ATLAS_COLUMNS;
        const row = Math.floor(index / TITLE_ATLAS_COLUMNS);
        const centerX = column * TITLE_CELL_WIDTH + TITLE_CELL_WIDTH / 2;
        const centerY = row * TITLE_CELL_HEIGHT + TITLE_CELL_HEIGHT / 2;
        const title = spineTitle(book.title);
        const colors = spineTypographyColors(book);
        const labelWidth = TITLE_CELL_HEIGHT;
        const labelHeight = 42;
        const outerRuleOffset = labelWidth / 2 - 9;
        const innerRuleOffset = labelWidth / 2 - 17;
        const maximumTextWidth = innerRuleOffset * 2 - 14;
        const titleLines = wrapSpineTitle(context, title, maximumTextWidth);
        context.save();
        context.translate(centerX, centerY);
        context.rotate(-Math.PI / 2);
        context.fillStyle = colors.accent;
        context.globalAlpha = 0.72;
        [-outerRuleOffset, -innerRuleOffset, innerRuleOffset, outerRuleOffset].forEach((offset) => {
          context.fillRect(offset - 1.5, -labelHeight / 2, 3, labelHeight);
        });
        context.globalAlpha = 1;
        context.fillStyle = colors.text;
        const lineHeight = 21;
        const firstLineY = -((titleLines.length - 1) * lineHeight) / 2;
        titleLines.forEach((line, lineIndex) => {
          context.fillText(line, 0, firstLineY + lineIndex * lineHeight, maximumTextWidth);
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
  }, [items]);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const rows = Math.max(1, Math.ceil(items.length / TITLE_ATLAS_COLUMNS));
    const vertex = new THREE.Vector3();
    items.forEach((item, index) => {
      if (!visibleSerials.has(item.book.serialNumber)) return;
      const { profile } = item;
      const transform = baseMatrix(item, config);
      const firstVertex = positions.length / 3;
      const halfWidth = profile.width * 0.38;
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
  }, [config, items, visibleSerials]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} renderOrder={3}>
    <meshBasicMaterial map={texture} transparent alphaTest={0.12} depthWrite={false} toneMapped={false} side={THREE.FrontSide} />
  </mesh>;
}

function RealisticBooks({ items, visibleSerials, config, onSelect, onTarget }: {
  items: ProfiledBook[];
  visibleSerials: Set<number>;
  config: BookRenderConfig;
  onSelect: (book: Book) => void;
  onTarget: (book: Book | null) => void;
}) {
  const spineRef = useRef<THREE.InstancedMesh>(null);
  const pagesRef = useRef<THREE.InstancedMesh>(null);
  const boardsRef = useRef<THREE.InstancedMesh>(null);
  const targetRef = useRef<Book | null>(null);
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
    spineRef.current?.setColorAt(index, color);
    boardsRef.current?.setColorAt(index * 2, color);
    boardsRef.current?.setColorAt(index * 2 + 1, color);
  };

  useEffect(() => {
    const spine = spineRef.current;
    const pages = pagesRef.current;
    const boards = boardsRef.current;
    if (!spine || !pages || !boards) return;
    const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    const pageColor = new THREE.Color();
    items.forEach((item, index) => {
      const { profile, book } = item;
      const visible = visibleSerials.has(book.serialNumber);
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
      spine.setMatrixAt(index, visible ? layerMatrix(item, config, spineDimensions, spineOffset) : hiddenMatrix);
      pages.setMatrixAt(index, visible ? layerMatrix(item, config, pageDimensions, pageOffset) : hiddenMatrix);
      const coverColor = getBookAppearanceColor(resolveBookAppearance(book));
      spine.setColorAt(index, new THREE.Color(coverColor));
      pages.setColorAt(index, pageColor.set(PAGE_COLORS[hashNumber(book.serialNumber, 0x5a17) % PAGE_COLORS.length]));

      const boardHeight = profile.height;
      const boardDepth = profile.depth;
      const boardDimensions: [number, number, number] = [profile.coverThickness, boardHeight, boardDepth];
      const boardX = profile.width / 2 - profile.coverThickness / 2;
      const showBoards = visible && profile.binding === "hardcover";
      boards.setMatrixAt(index * 2, showBoards ? layerMatrix(item, config, boardDimensions, [-boardX, 0, 0]) : hiddenMatrix);
      boards.setMatrixAt(index * 2 + 1, showBoards ? layerMatrix(item, config, boardDimensions, [boardX, 0, 0]) : hiddenMatrix);
      boards.setColorAt(index * 2, new THREE.Color(coverColor));
      boards.setColorAt(index * 2 + 1, new THREE.Color(coverColor));
    });

    spine.count = pages.count = items.length;
    boards.count = items.length * 2;
    [spine, pages, boards].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      const material = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      material.forEach((item) => { item.needsUpdate = true; });
      mesh.computeBoundingSphere();
    });
  }, [config, items, visibleSerials]);

  useFrame(() => {
    const spine = spineRef.current;
    if (!spine) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hit = raycaster.intersectObject(spine, false)[0];
    const nextIndex = hit?.instanceId ?? null;
    const nextItem = nextIndex !== null ? items[nextIndex] : null;
    const next = nextItem && visibleSerials.has(nextItem.book.serialNumber) ? nextItem.book : null;
    if (next?.serialNumber === targetRef.current?.serialNumber) return;

    if (targetIndexRef.current !== null) {
      const previous = items[targetIndexRef.current];
      if (previous) setCoverColor(targetIndexRef.current, getBookAppearanceColor(resolveBookAppearance(previous.book)));
    }
    targetIndexRef.current = next ? nextIndex : null;
    if (targetIndexRef.current !== null) setCoverColor(targetIndexRef.current, HIGHLIGHT_COLOR);
    if (spine.instanceColor) spine.instanceColor.needsUpdate = true;
    if (boardsRef.current?.instanceColor) boardsRef.current.instanceColor.needsUpdate = true;
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
    <instancedMesh ref={pagesRef} args={[geometries.pages, undefined, items.length]} receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.92} metalness={0} />
    </instancedMesh>
    <instancedMesh ref={boardsRef} args={[geometries.boards, undefined, items.length * 2]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.74} metalness={0.01} />
    </instancedMesh>
    <instancedMesh ref={spineRef} args={[geometries.spine, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.64} metalness={0.015} />
    </instancedMesh>
  </>;
}

export default function BookCollection({ books, visibleSerials, onSelect, onTarget, shelfWidth, bookFace, tierY, slotsPerTier, capacity }: {
  books: Book[];
  visibleSerials: Set<number>;
  onSelect: (book: Book) => void;
  onTarget: (book: Book | null) => void;
  shelfWidth: number;
  bookFace: number;
  tierY: number[];
  slotsPerTier: number;
  capacity: number;
}) {
  const config = useMemo<BookRenderConfig>(() => ({ shelfWidth, bookFace, tierY, slotsPerTier, capacity }), [bookFace, capacity, shelfWidth, slotsPerTier, tierY]);
  const items = useMemo(() => getProfiledBooks(books, capacity), [books, capacity]);
  return <>
    <RealisticBooks items={items} visibleSerials={visibleSerials} config={config} onSelect={onSelect} onTarget={onTarget} />
    <BookTitles items={items} visibleSerials={visibleSerials} config={config} />
  </>;
}
