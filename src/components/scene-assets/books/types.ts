import type * as THREE from "three";
import type { Language } from "@/types/library";

export interface BookVisualData {
  serialNumber: number;
  title: string;
  author: string;
  language: Language;
}

export interface BookGeometrySet {
  spine: THREE.BufferGeometry;
  pages: THREE.BufferGeometry;
  boards: THREE.BufferGeometry;
}
