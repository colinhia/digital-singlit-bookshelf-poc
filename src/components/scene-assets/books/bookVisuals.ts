"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import type { BookRenderProfile } from "@/types/library";
import type { BookGeometrySet, BookVisualData } from "@/components/scene-assets/books/types";

export const HIGHLIGHT_COLOR = "#75412a";
export const FILTERED_BOOK_OPACITY = 0.25;
const PAGE_COLORS = ["#eadfce", "#f2e8d8", "#ded1be", "#e7dac7"];

export function hashBookNumber(serialNumber: number, salt: number) {
  let value = (Math.trunc(serialNumber) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function noise(serialNumber: number, salt: number) {
  return hashBookNumber(serialNumber, salt) / 0xffffffff;
}

export function resolveBookRenderProfile(book: Pick<BookVisualData, "serialNumber">): BookRenderProfile {
  const serialNumber = book.serialNumber;
  const binding = hashBookNumber(serialNumber, 0x71a9) % 5 === 0 ? "paperback" : "hardcover";
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

export function getBookPageColor(book: Pick<BookVisualData, "serialNumber">) {
  return PAGE_COLORS[hashBookNumber(book.serialNumber, 0x5a17) % PAGE_COLORS.length];
}

export function resolveBookLayerGeometry(profile: BookRenderProfile) {
  const spineDepth = profile.binding === "hardcover" ? 0.034 : 0.024;
  const pageHeightInset = profile.binding === "hardcover" ? 0.044 : 0.018;
  const pageWidthInset = profile.binding === "hardcover" ? profile.coverThickness * 2.35 : 0.012;
  return {
    pageDimensions: [
      profile.width - pageWidthInset,
      profile.height - pageHeightInset,
      profile.depth - profile.pageInset,
    ] as [number, number, number],
    pageOffset: [0, pageHeightInset / 2, -profile.pageInset / 2] as [number, number, number],
    spineDimensions: [profile.width, profile.height, spineDepth] as [number, number, number],
    spineOffset: [0, 0, profile.depth / 2 - spineDepth / 2 + 0.001] as [number, number, number],
    boardDimensions: [profile.coverThickness, profile.height, profile.depth] as [number, number, number],
    boardX: profile.width / 2 - profile.coverThickness / 2,
  };
}

export function useBookGeometries(): BookGeometrySet {
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

  return geometries;
}
