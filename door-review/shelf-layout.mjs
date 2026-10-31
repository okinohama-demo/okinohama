const clamp = (value, max) => Math.max(0, Math.min(max, value));

export function shelfLayout({ items, width, scrollWidth, scrollLeft, padding = 0 }) {
  const max = Math.max(0, scrollWidth - width);
  const position = clamp(scrollLeft, max);
  const stops = [];
  for (const [index, item] of items.entries()) {
    const left = clamp(item.left - padding, max);
    if (!stops.length || Math.abs(left - stops.at(-1).left) > 1) stops.push({ left, index });
  }
  let nearest = 0;
  stops.forEach((stop, index) => {
    if (Math.abs(stop.left - position) < Math.abs(stops[nearest].left - position)) nearest = index;
  });
  // Count readable cards, excluding a narrow glimpse of the next product.
  const visible = items.flatMap((item, index) => {
    const overlap = Math.min(item.left + item.width, position + width) - Math.max(item.left, position);
    return overlap >= Math.min(item.width, width) / 2 ? [index] : [];
  });
  return { max, position, stops, nearest, first: visible[0] ?? 0, last: visible.at(-1) ?? 0 };
}

export function nextShelfStop(layout, step, pending = null) {
  let from = layout.nearest;
  if (pending !== null) {
    from = layout.stops.reduce((best, stop, index) =>
      Math.abs(stop.left - pending) < Math.abs(layout.stops[best].left - pending) ? index : best, 0);
  }
  return layout.stops[Math.max(0, Math.min(layout.stops.length - 1, from + step))];
}
