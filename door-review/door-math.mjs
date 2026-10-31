// Perspective projection, with the viewer at the top edge of the viewport.
export const MAX_ANGLE = 64 * Math.PI / 180;
export const CAMERA = 2.4;
export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
export const projectedY = (progress, localY, camera = CAMERA, depth = 0) => {
  const a = clamp(progress) * MAX_ANGLE, arm = 1 - localY;
  return (1 - arm * Math.cos(a) + depth * Math.sin(a)) / (1 - (arm * Math.sin(a) + depth * Math.cos(a)) / camera);
};
export const localYAt = (progress, screenY, camera = CAMERA, depth = 0) => {
  const a = clamp(progress) * MAX_ANGLE;
  return clamp(1 - (1 + depth * Math.sin(a) - screenY * (1 - depth * Math.cos(a) / camera)) / (Math.cos(a) - screenY * Math.sin(a) / camera), 0, .97);
};
export const progressAt = (screenY, localY, camera = CAMERA, depth = 0) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (projectedY(mid, localY, camera, depth) < screenY) lo = mid; else hi = mid;
  }
  return clamp((lo + hi) / 2);
};
