import type { Point2D, Quad } from "@/types/geometry";

export interface Size2D {
  width: number;
  height: number;
}

export function cloneQuad(quad: Quad): Quad {
  return quad.map((point) => ({ ...point })) as Quad;
}

export function createCenteredQuad(
  viewport: Size2D,
  aspectRatio: number,
  fillFactor = 0.64,
): Quad {
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const maxWidth = viewport.width * fillFactor;
  const maxHeight = viewport.height * fillFactor;

  let width = maxWidth;
  let height = width / safeAspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * safeAspectRatio;
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    { x: centerX - halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY + halfHeight },
    { x: centerX - halfWidth, y: centerY + halfHeight },
  ];
}

export function translateQuad(quad: Quad, deltaX: number, deltaY: number): Quad {
  return quad.map((point) => ({
    x: point.x + deltaX,
    y: point.y + deltaY,
  })) as Quad;
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleBetween(a: Point2D, b: Point2D): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function midpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function transformQuadByPinchRotate(
  startQuad: Quad,
  startA: Point2D,
  startB: Point2D,
  currentA: Point2D,
  currentB: Point2D,
): Quad {
  const fromCenter = midpoint(startA, startB);
  const toCenter = midpoint(currentA, currentB);

  const startDistance = Math.max(distance(startA, startB), 1);
  const currentDistance = Math.max(distance(currentA, currentB), 1);

  const scale = currentDistance / startDistance;
  const angle = angleBetween(currentA, currentB) - angleBetween(startA, startB);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return startQuad.map((point) => {
    const offsetX = (point.x - fromCenter.x) * scale;
    const offsetY = (point.y - fromCenter.y) * scale;

    const rotatedX = offsetX * cos - offsetY * sin;
    const rotatedY = offsetX * sin + offsetY * cos;

    return {
      x: toCenter.x + rotatedX,
      y: toCenter.y + rotatedY,
    };
  }) as Quad;
}

export function findClosestCorner(
  quad: Quad,
  point: Point2D,
  maxDistance = 36,
): number | null {
  let bestIndex: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  quad.forEach((corner, index) => {
    const cornerDistance = distance(corner, point);
    if (cornerDistance < bestDistance) {
      bestDistance = cornerDistance;
      bestIndex = index;
    }
  });

  if (bestDistance > maxDistance) {
    return null;
  }

  return bestIndex;
}

export function clampQuadToBounds(quad: Quad, viewport: Size2D, margin = 6): Quad {
  return quad.map((point) => ({
    x: Math.min(Math.max(point.x, margin), viewport.width - margin),
    y: Math.min(Math.max(point.y, margin), viewport.height - margin),
  })) as Quad;
}

export function getCentroid(quad: Quad): Point2D {
  const sum = quad.reduce(
    (accumulator, point) => {
      return {
        x: accumulator.x + point.x,
        y: accumulator.y + point.y,
      };
    },
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / quad.length,
    y: sum.y / quad.length,
  };
}

export function interpolateQuadPoint(quad: Quad, u: number, v: number): Point2D {
  const [p0, p1, p2, p3] = quad;
  return {
    x:
      (1 - u) * (1 - v) * p0.x +
      u * (1 - v) * p1.x +
      u * v * p2.x +
      (1 - u) * v * p3.x,
    y:
      (1 - u) * (1 - v) * p0.y +
      u * (1 - v) * p1.y +
      u * v * p2.y +
      (1 - u) * v * p3.y,
  };
}

export function aspectRatioFromTemplateSize(width: number, height: number): number {
  if (!height || !Number.isFinite(width / height)) {
    return 1;
  }
  return width / height;
}
