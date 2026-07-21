"use client";

import { useMemo } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { BookRenderProfile } from "@/types/library";
import { TABLE_BOOK_STACK_POSITION } from "@/components/scene-assets/furnitureLayout";
import { getBookAppearanceColor, resolveBookAppearance } from "@/components/scene-assets/books/bookAppearance";
import {
  getBookPageColor,
  HIGHLIGHT_COLOR,
  resolveBookLayerGeometry,
  resolveBookRenderProfile,
} from "@/components/scene-assets/books/bookVisuals";
import type { BookGeometrySet, BookVisualData } from "@/components/scene-assets/books/types";

interface BookVolumeProps {
  book: BookVisualData;
  profile: BookRenderProfile;
  geometries: BookGeometrySet;
  highlighted?: boolean;
  userData?: Record<string, unknown>;
}

export function BookVolume({ book, profile, geometries, highlighted = false, userData }: BookVolumeProps) {
  const { pageDimensions, spineDimensions, spineOffset, boardDimensions, boardX } = resolveBookLayerGeometry(profile);
  const coverColor = highlighted ? HIGHLIGHT_COLOR : getBookAppearanceColor(resolveBookAppearance(book));
  const pageColor = getBookPageColor(book);
  return <>
    <mesh
      geometry={geometries.pages}
      scale={pageDimensions}
      position={[0, 0, -profile.pageInset / 2]}
      userData={userData}
      receiveShadow
    >
      <meshStandardMaterial color={pageColor} roughness={0.92} metalness={0} />
    </mesh>
    <mesh
      geometry={geometries.spine}
      scale={spineDimensions}
      position={spineOffset}
      userData={userData}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={coverColor} roughness={0.64} metalness={0.015} />
    </mesh>
    {[-boardX, boardX].map((x) => <mesh
      key={x}
      geometry={geometries.boards}
      scale={boardDimensions}
      position={[x, 0, 0]}
      userData={userData}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={coverColor} roughness={0.74} metalness={0.01} />
    </mesh>)}
  </>;
}

export function BookStack({ books, highlightedSerialNumber, groupRef, geometries, bookUserData }: {
  books: BookVisualData[];
  highlightedSerialNumber?: number;
  groupRef?: RefObject<THREE.Group>;
  geometries: BookGeometrySet;
  bookUserData?: (book: BookVisualData, index: number) => Record<string, unknown>;
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

  return <group ref={groupRef} position={TABLE_BOOK_STACK_POSITION}>
    {entries.map(({ book, profile, centreY }, index) => <group
      key={book.serialNumber}
      position={[0, centreY, 0]}
      rotation={[0, 0, -Math.PI / 2]}
    >
      <BookVolume
        book={book}
        profile={profile}
        geometries={geometries}
        highlighted={highlightedSerialNumber === book.serialNumber}
        userData={bookUserData?.(book, index)}
      />
    </group>)}
  </group>;
}
