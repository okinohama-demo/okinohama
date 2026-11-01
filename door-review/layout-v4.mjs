// Shared geometry for the responsive oven scene and its static previews.
export function getUnifiedLayout(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Viewport width and height must be positive finite numbers.');
  }
  const span = width / height;
  const jamb = Math.max(10, Math.min(22, width * .025)) / height;
  const header = .105;
  const sill = Math.max(20, Math.min(32, height * .028)) / height;
  const top = .5 - header;
  const bottom = -.5 + sill;
  const gap = .005;
  const openingWidth = span - jamb * 2;
  const openingHeight = top - bottom;
  const doorWidth = openingWidth - gap * 2;
  const doorHeight = openingHeight - gap * 2;
  const hinge = 1 - sill - gap;
  const arm = doorHeight * .905;
  const wx = doorWidth * .45;
  const wy1 = doorHeight * .095;
  const wy2 = doorHeight * .79;
  return { span, jamb, header, sill, top, bottom, gap, openingWidth, openingHeight, doorWidth, doorHeight, hinge, arm, wx, wy1, wy2 };
}

export function getUnifiedPresentation(opening, view) {
  const clamp = value => Math.max(0,Math.min(1,value));
  if(!Number.isFinite(opening)||!Number.isFinite(view)) throw new RangeError('Opening and view must be finite.');
  opening=clamp(opening);view=clamp(view);
  return {scale:.96+.025*opening+.055*view,reveal:clamp((view-.25)/.65),infoHidden:view<.85};
}
