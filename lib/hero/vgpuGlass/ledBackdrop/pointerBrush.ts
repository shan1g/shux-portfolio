import { canonicalTriangleGeometry } from "./settings";
import { DEFAULT_BRUSH, type BrushState } from "./settings";
import { brushState, simulationBrushState } from "./sim-sizing";

export function pointerToLedBrush(
  clientX: number,
  clientY: number,
  element: HTMLElement,
): BrushState {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (x < 0 || x > width || y < 0 || y > height) {
    return brushState(DEFAULT_BRUSH);
  }

  return simulationBrushState(
    DEFAULT_BRUSH,
    {
      x,
      y,
      active: true,
      inside: isPointInsideTriangle({ x, y }, { width, height }),
      isMouse: true,
    },
    height,
  );
}

function isPointInsideTriangle(
  point: { x: number; y: number },
  size: { width: number; height: number },
): boolean {
  const { top, left, right } = canonicalTriangleGeometry(size);
  const side = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
  const a = side(top, left);
  const b = side(left, right);
  const c = side(right, top);
  return (a <= 0 && b <= 0 && c <= 0) || (a >= 0 && b >= 0 && c >= 0);
}
