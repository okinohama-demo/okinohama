// Coordinates are fractions of viewport height; the camera stays still.
export const MAX_ANGLE = 76 * Math.PI / 180;
export const CAMERA = 8;
export const clamp = (x, lo = 0, hi = 1) => Math.max(lo,Math.min(hi,x));
export const projectedY = (progress, arm, depth, hinge) => {
  const a=clamp(progress)*MAX_ANGLE;
  return .5+(hinge-.5-arm*Math.cos(a)+depth*Math.sin(a))/(1-(arm*Math.sin(a)+depth*Math.cos(a))/CAMERA);
};
export const armAt = (progress, screenY, depth, hinge) => {
  const a=clamp(progress)*MAX_ANGLE, y=screenY-.5;
  return (hinge-.5+depth*Math.sin(a)-y*(1-depth*Math.cos(a)/CAMERA))/(Math.cos(a)-y*Math.sin(a)/CAMERA);
};
export const progressAt = (screenY, arm, depth, hinge) => {
  let lo=0,hi=1;
  for(let i=0;i<24;i++) {
    const mid=(lo+hi)/2;
    if(projectedY(mid,arm,depth,hinge)<screenY)lo=mid;else hi=mid;
  }
  return clamp((lo+hi)/2);
};
