import * as THREE from "three";

export interface TileTextureOptions {
  columns: number;
  rows: number;
  brickCentre?: boolean;
}

export function createTileTexture({ columns, rows, brickCentre = false }: TileTextureOptions) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create room decor tile texture");

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
