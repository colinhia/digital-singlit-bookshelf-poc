"use client";

import { useEffect, useState } from "react";
import type { BookVisualData } from "@/components/scene-assets/books/types";

const TITLE_CHARACTER_LIMIT = 20;
export const TITLE_ATLAS_COLUMNS = 30;
export const TITLE_CELL_WIDTH = 128;
export const TITLE_CELL_HEIGHT = 384;
export const TITLE_MAX_FONT_SIZE = 48;
const TITLE_MIN_FONT_SIZE = 40;
const TITLE_FONT_WEIGHT = 700;
export const TITLE_ACCENT_COLOR = "#c7a46b";
export const TITLE_TEXT_COLOR = "#d8cfbf";
const FALLBACK_FONT_FAMILY = "Arial, sans-serif";

export type SpineFontFamilies = Record<BookVisualData["language"], string>;

const FALLBACK_FONT_FAMILIES: SpineFontFamilies = {
  Chinese: FALLBACK_FONT_FAMILY,
  English: FALLBACK_FONT_FAMILY,
  Malay: FALLBACK_FONT_FAMILY,
  Tamil: FALLBACK_FONT_FAMILY,
};

const FONT_VARIABLES: Record<BookVisualData["language"], string> = {
  Chinese: "--font-spine-chinese",
  English: "--font-spine-latin",
  Malay: "--font-spine-latin",
  Tamil: "--font-spine-tamil",
};

const graphemeSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

function splitGraphemes(value: string) {
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment)
    : Array.from(value);
}

export function spineTitle(title: string) {
  const graphemes = splitGraphemes(title);
  return graphemes.length <= TITLE_CHARACTER_LIMIT
    ? title
    : `${graphemes.slice(0, TITLE_CHARACTER_LIMIT - 1).join("").trimEnd()}…`;
}

function resolveSpineFontFamilies() {
  const scope = document.querySelector<HTMLElement>("[data-spine-font-scope]")
    ?? document.documentElement;
  const styles = getComputedStyle(scope);
  return Object.fromEntries(Object.entries(FONT_VARIABLES).map(([language, variable]) => {
    const family = styles.getPropertyValue(variable).trim();
    return [language, family ? `${family}, ${FALLBACK_FONT_FAMILY}` : FALLBACK_FONT_FAMILY];
  })) as SpineFontFamilies;
}

export function fontDeclaration(fontSize: number, family: string) {
  return `${TITLE_FONT_WEIGHT} ${fontSize}px ${family}`;
}

export function useSpineFontFamilies(items: Array<{ book: BookVisualData }>) {
  const [fontFamilies, setFontFamilies] = useState<SpineFontFamilies>(FALLBACK_FONT_FAMILIES);

  useEffect(() => {
    let active = true;
    const resolvedFamilies = resolveSpineFontFamilies();
    const loads = (Object.keys(resolvedFamilies) as BookVisualData["language"][]).map((language) => {
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

export function fitSpineTitle(
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
