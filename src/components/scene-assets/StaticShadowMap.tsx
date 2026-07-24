"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function StaticShadowMap({
  enabled,
  revision,
}: {
  enabled: boolean;
  revision: unknown;
}) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    if (!enabled) return;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [enabled, gl, invalidate, revision]);

  return null;
}
