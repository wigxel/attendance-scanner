export type EdgeOpacities = {
  left: number;
  right: number;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Opacity for the fade at each edge of a horizontal scroll viewport.
 * Fades are full until `edgeRatio` of the viewport from the edge, then ramp
 * down to zero exactly at the edge.
 */
export function edgeOpacities({
  scrollLeft,
  clientWidth,
  scrollWidth,
  edgeRatio = 0.2,
}: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  edgeRatio?: number;
}): EdgeOpacities {
  if (clientWidth <= 0 || scrollWidth <= clientWidth + 1) {
    return { left: 0, right: 0 };
  }

  const margin = Math.max(1, edgeRatio * clientWidth);
  const remaining = scrollWidth - clientWidth - scrollLeft;

  return {
    left: clamp(scrollLeft / margin),
    right: clamp(remaining / margin),
  };
}
