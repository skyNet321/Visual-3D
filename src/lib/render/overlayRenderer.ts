import type { ColorPreset } from "@/types/colors";
import type { EnvironmentLight } from "@/types/environment";
import type { Point2D, Quad } from "@/types/geometry";
import type { OpeningPreviewState } from "@/types/openingPreview";
import type { ProductTemplate } from "@/types/products";
import { interpolateQuadPoint } from "@/lib/utils/geometry";
import { shadeHex } from "@/lib/utils/color";

interface OverlayRenderOptions {
  context: CanvasRenderingContext2D;
  quad: Quad;
  template: ProductTemplate;
  color: ColorPreset;
  opacity?: number;
  openingPreview?: OpeningPreviewState;
  environmentLight?: EnvironmentLight;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawPolygon(context: CanvasRenderingContext2D, points: Point2D[]) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function fillPolygon(
  context: CanvasRenderingContext2D,
  points: Point2D[],
  fillStyle: string | CanvasGradient,
) {
  drawPolygon(context, points);
  context.fillStyle = fillStyle;
  context.fill();
}

function panelPolygon(
  quad: Quad,
  left: number,
  right: number,
  top: number,
  bottom: number,
): Point2D[] {
  return [
    interpolateQuadPoint(quad, left, top),
    interpolateQuadPoint(quad, right, top),
    interpolateQuadPoint(quad, right, bottom),
    interpolateQuadPoint(quad, left, bottom),
  ];
}

function midpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function polygonBounds(points: Point2D[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function averageEdgeLength(quad: Quad) {
  const edges = [
    Math.hypot(quad[0].x - quad[1].x, quad[0].y - quad[1].y),
    Math.hypot(quad[1].x - quad[2].x, quad[1].y - quad[2].y),
    Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y),
    Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y),
  ];

  return edges.reduce((sum, value) => sum + value, 0) / edges.length;
}

function pointAdd(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

function pointSub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function pointScale(a: Point2D, factor: number): Point2D {
  return { x: a.x * factor, y: a.y * factor };
}

function pointLerp(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function normalize(vector: Point2D): Point2D {
  const length = Math.hypot(vector.x, vector.y);
  if (!length) {
    return { x: 0, y: 0 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function shiftPolygon(points: Point2D[], delta: Point2D): Point2D[] {
  return points.map((point) => pointAdd(point, delta));
}

function transformHingedPolygon(
  points: Point2D[],
  hingeSide: "left" | "right",
  progress: number,
): Point2D[] {
  const [tl, tr, br, bl] = points;
  const t = clamp(progress, 0, 1);

  const sideVector = normalize(pointSub(bl, tl));
  const normal = { x: sideVector.y, y: -sideVector.x };

  const depth = Math.hypot(tr.x - tl.x, tr.y - tl.y) * (0.18 * t);
  const squash = 0.62 * t;

  if (hingeSide === "left") {
    const movedTop = pointAdd(pointLerp(tr, tl, squash), pointScale(normal, depth));
    const movedBottom = pointAdd(pointLerp(br, bl, squash), pointScale(normal, depth));
    return [tl, movedTop, movedBottom, bl];
  }

  const movedTop = pointAdd(pointLerp(tl, tr, squash), pointScale(normal, -depth));
  const movedBottom = pointAdd(pointLerp(bl, br, squash), pointScale(normal, -depth));
  return [movedTop, tr, br, movedBottom];
}

function transformTiltPolygon(points: Point2D[], progress: number): Point2D[] {
  const [tl, tr, br, bl] = points;
  const t = clamp(progress, 0, 1);

  const center = midpoint(midpoint(tl, tr), midpoint(bl, br));
  const loweredLeft = pointLerp(tl, bl, 0.24 * t);
  const loweredRight = pointLerp(tr, br, 0.24 * t);

  const soften = (point: Point2D) => pointLerp(point, center, 0.08 * t);

  return [soften(loweredLeft), soften(loweredRight), br, bl];
}

function transformSlidingPolygon(
  points: Point2D[],
  direction: 1 | -1,
  progress: number,
): Point2D[] {
  const [tl, tr] = points;
  const axis = normalize(pointSub(tr, tl));
  const width = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const delta = pointScale(axis, direction * width * clamp(progress, 0, 1) * 0.64);
  return shiftPolygon(points, delta);
}

function openingPanelIndexes(
  template: ProductTemplate,
  openingPreview: OpeningPreviewState | undefined,
): Set<number> {
  if (!openingPreview?.enabled) {
    return new Set<number>();
  }

  const candidates = template.panelLayout
    .map((panel, index) => ({ panel, index }))
    .filter((item) => item.panel.kind !== "fixed")
    .map((item) => item.index);

  if (!candidates.length) {
    return new Set<number>();
  }

  const count = clamp(openingPreview.openingPanels, 1, candidates.length);

  if (openingPreview.mode === "double" && candidates.length >= 2) {
    const pair = [candidates[0], candidates[candidates.length - 1]].slice(0, count);
    return new Set<number>(pair);
  }

  return new Set<number>(candidates.slice(0, count));
}

function drawFrameSegment(
  context: CanvasRenderingContext2D,
  points: Point2D[],
  outerColor: string,
  innerColor: string,
  alpha = 1,
) {
  const outerMid = midpoint(points[0], points[1]);
  const innerMid = midpoint(points[2], points[3]);

  const gradient = context.createLinearGradient(outerMid.x, outerMid.y, innerMid.x, innerMid.y);
  gradient.addColorStop(0, outerColor);
  gradient.addColorStop(1, innerColor);

  context.save();
  context.globalAlpha = alpha;
  fillPolygon(context, points, gradient);
  context.restore();
}

function drawPanelHandle(
  context: CanvasRenderingContext2D,
  points: Point2D[],
  hingeSide: "left" | "right",
  lineWidth: number,
) {
  const [tl, tr, br, bl] = points;
  const sideA = hingeSide === "left" ? tr : tl;
  const sideB = hingeSide === "left" ? br : bl;

  const handleTop = pointLerp(sideA, sideB, 0.36);
  const handleBottom = pointLerp(sideA, sideB, 0.64);

  const metallic = context.createLinearGradient(
    handleTop.x,
    handleTop.y,
    handleBottom.x,
    handleBottom.y,
  );
  metallic.addColorStop(0, "rgba(244, 247, 252, 0.95)");
  metallic.addColorStop(0.5, "rgba(182, 193, 206, 0.98)");
  metallic.addColorStop(1, "rgba(117, 129, 144, 0.98)");

  context.save();
  context.beginPath();
  context.moveTo(handleTop.x, handleTop.y);
  context.lineTo(handleBottom.x, handleBottom.y);
  context.lineCap = "round";
  context.lineWidth = lineWidth;
  context.strokeStyle = metallic;
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = Math.max(2, lineWidth * 0.8);
  context.stroke();
  context.restore();
}

function drawGlass(
  context: CanvasRenderingContext2D,
  polygon: Point2D[],
  glassOpacity: number,
  environment: EnvironmentLight,
) {
  const bounds = polygonBounds(polygon);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  const luma = environment.luma;
  const direction = environment.direction;
  const warmth = environment.warmth;

  context.save();
  drawPolygon(context, polygon);
  context.clip();

  const baseGradient = context.createLinearGradient(
    bounds.minX,
    bounds.minY,
    bounds.maxX,
    bounds.maxY,
  );
  const blueBias = clamp(0.74 - warmth * 0.1 + (1 - luma) * 0.08, 0.6, 0.9);
  baseGradient.addColorStop(0, `rgba(186, 216, 242, ${glassOpacity + 0.12})`);
  baseGradient.addColorStop(0.5, `rgba(${Math.round(105 * blueBias)}, ${Math.round(147 * blueBias)}, ${Math.round(183 * blueBias)}, ${glassOpacity + 0.02})`);
  baseGradient.addColorStop(1, `rgba(58, 92, 122, ${glassOpacity - 0.03})`);

  context.fillStyle = baseGradient;
  context.fillRect(bounds.minX, bounds.minY, width, height);

  const reflFromLeft = direction <= 0;
  const reflection = context.createLinearGradient(
    reflFromLeft ? bounds.minX : bounds.maxX,
    bounds.minY,
    reflFromLeft ? bounds.maxX : bounds.minX,
    bounds.minY + height * (0.42 + Math.abs(direction) * 0.16),
  );

  const reflAlpha = clamp(0.22 + luma * 0.24 + (1 - environment.contrast) * 0.08, 0.2, 0.56);
  reflection.addColorStop(0, `rgba(255, 255, 255, ${reflAlpha})`);
  reflection.addColorStop(0.36, `rgba(255, 255, 255, ${reflAlpha * 0.45})`);
  reflection.addColorStop(1, "rgba(255, 255, 255, 0.02)");

  context.fillStyle = reflection;
  context.fillRect(bounds.minX, bounds.minY, width, height * 0.72);

  context.globalAlpha = 0.12 + Math.abs(direction) * 0.08;
  for (let index = 0; index < 3; index += 1) {
    const factor = index / 3;
    const x = bounds.minX + width * (0.16 + factor * 0.28);
    const streak = context.createLinearGradient(x, bounds.minY, x + width * 0.1, bounds.maxY);
    streak.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    streak.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = streak;
    context.fillRect(x, bounds.minY, width * 0.1, height);
  }

  context.restore();
}

function seededNoise(seed: number) {
  const x = Math.sin(seed * 128.53) * 43758.5453;
  return x - Math.floor(x);
}

function drawWoodTexture(context: CanvasRenderingContext2D, polygon: Point2D[], density: number) {
  const bounds = polygonBounds(polygon);
  const width = bounds.maxX - bounds.minX;

  context.save();
  drawPolygon(context, polygon);
  context.clip();

  const lines = Math.max(8, Math.round(width * density));
  for (let index = 0; index < lines; index += 1) {
    const offset = index / lines;
    const x = bounds.minX + width * offset;
    const wave = Math.sin(offset * 22) * 2.4;
    context.strokeStyle = `rgba(48, 29, 17, ${0.08 + (index % 3) * 0.03})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x + wave, bounds.minY);
    context.lineTo(x - wave, bounds.maxY);
    context.stroke();
  }

  context.restore();
}

function drawMicroTexture(
  context: CanvasRenderingContext2D,
  polygon: Point2D[],
  intensity: number,
  stableSeed: number,
) {
  const bounds = polygonBounds(polygon);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const dots = Math.max(120, Math.round((width * height) / 220));

  context.save();
  drawPolygon(context, polygon);
  context.clip();

  for (let index = 0; index < dots; index += 1) {
    const nx = seededNoise(stableSeed + index * 1.73);
    const ny = seededNoise(stableSeed + index * 2.97);
    const nr = seededNoise(stableSeed + index * 5.11);

    const x = bounds.minX + nx * width;
    const y = bounds.minY + ny * height;
    const radius = nr > 0.84 ? 0.82 : 0.5;
    const alpha = (0.012 + nr * 0.03) * intensity;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(14, 18, 25, ${alpha})`;
    context.fill();
  }

  context.restore();
}

function drawGasket(context: CanvasRenderingContext2D, polygon: Point2D[], width: number) {
  context.save();
  drawPolygon(context, polygon);
  context.lineWidth = width;
  context.strokeStyle = "rgba(20, 26, 33, 0.68)";
  context.stroke();

  context.lineWidth = Math.max(0.4, width * 0.38);
  context.strokeStyle = "rgba(255, 255, 255, 0.14)";
  context.stroke();
  context.restore();
}

function withAdaptiveShade(base: string, amount: number) {
  return shadeHex(base, clamp(amount, -0.65, 0.65));
}

export function renderOverlay({
  context,
  quad,
  template,
  color,
  opacity = 0.95,
  openingPreview,
  environmentLight,
}: OverlayRenderOptions) {
  const environment: EnvironmentLight = environmentLight ?? {
    luma: 0.56,
    contrast: 0.3,
    direction: 0,
    warmth: 0.5,
  };

  const avgEdge = averageEdgeLength(quad);
  const frameStroke = Math.max(1.5, Math.min(8, avgEdge * 0.012));
  const outer = panelPolygon(quad, 0, 1, 0, 1);

  const frame = template.frameStyle.frameThickness;
  const innerLeft = frame;
  const innerRight = 1 - frame;
  const innerTop = frame;
  const innerBottom = 1 - frame;
  const inner = panelPolygon(quad, innerLeft, innerRight, innerTop, innerBottom);

  const luma = environment.luma;
  const contrast = environment.contrast;
  const direction = environment.direction;

  const lightBoost = clamp(0.08 + luma * 0.22 + (1 - contrast) * 0.1, 0.08, 0.38);
  const darkBoost = clamp(0.12 + (1 - luma) * 0.26 + contrast * 0.16, 0.1, 0.44);

  const frameDark = withAdaptiveShade(color.hex, -darkBoost);
  const frameMedium = withAdaptiveShade(color.hex, -darkBoost * 0.38);
  const frameLight = withAdaptiveShade(color.hex, lightBoost);
  const frameHighlight = withAdaptiveShade(color.accentHex, lightBoost + 0.12);

  const openingIndexes = openingPanelIndexes(template, openingPreview);
  const progress = clamp(openingPreview?.progress ?? 0, 0, 1);

  context.save();
  context.globalAlpha = opacity;

  context.save();
  drawPolygon(context, outer);
  const shadowStrength = clamp(0.2 + (1 - luma) * 0.3 + contrast * 0.12, 0.16, 0.52);
  context.shadowColor = `rgba(0, 0, 0, ${shadowStrength})`;
  context.shadowBlur = Math.max(12, avgEdge * (0.05 + contrast * 0.03));
  context.shadowOffsetX = Math.max(1, avgEdge * (0.008 + direction * 0.004));
  context.shadowOffsetY = Math.max(3, avgEdge * 0.014);
  context.fillStyle = "rgba(10, 16, 24, 0.2)";
  context.fill();
  context.restore();

  fillPolygon(context, outer, frameDark);

  const topStrip = [outer[0], outer[1], inner[1], inner[0]];
  const rightStrip = [outer[1], outer[2], inner[2], inner[1]];
  const bottomStrip = [outer[2], outer[3], inner[3], inner[2]];
  const leftStrip = [outer[3], outer[0], inner[0], inner[3]];

  const leftLight = clamp(lightBoost + direction * -0.12, 0.04, 0.42);
  const rightLight = clamp(lightBoost + direction * 0.12, 0.04, 0.42);

  drawFrameSegment(context, topStrip, frameLight, frameMedium, 0.96);
  drawFrameSegment(context, leftStrip, withAdaptiveShade(color.hex, leftLight), frameMedium, 0.92);
  drawFrameSegment(context, bottomStrip, frameMedium, frameDark, 0.95);
  drawFrameSegment(context, rightStrip, withAdaptiveShade(color.hex, rightLight), frameDark, 0.95);

  context.save();
  drawPolygon(context, inner);
  const cavity = context.createLinearGradient(inner[0].x, inner[0].y, inner[2].x, inner[2].y);
  cavity.addColorStop(0, "rgba(64, 88, 111, 0.22)");
  cavity.addColorStop(1, "rgba(16, 24, 33, 0.3)");
  context.fillStyle = cavity;
  context.fill();
  context.lineWidth = Math.max(1.2, frameStroke * 0.35);
  context.strokeStyle = "rgba(6, 10, 16, 0.3)";
  context.stroke();
  context.restore();

  const mullion = template.frameStyle.mullionThickness;
  let offset = innerLeft;

  for (let index = 0; index < template.panelLayout.length; index += 1) {
    const panel = template.panelLayout[index];
    const panelWidth = (innerRight - innerLeft) * panel.widthRatio;

    const left = offset;
    const right = offset + panelWidth;

    const panelInset = Math.max(0.012, mullion * 0.45);

    let panelOuter = panelPolygon(quad, left, right, innerTop, innerBottom);
    let panelInner = panelPolygon(
      quad,
      left + panelInset,
      right - panelInset,
      innerTop + panelInset,
      innerBottom - panelInset,
    );
    let glassArea = panelPolygon(
      quad,
      left + panelInset * 1.08,
      right - panelInset * 1.08,
      innerTop + panelInset * 1.08,
      innerBottom - panelInset * 1.08,
    );

    const animated = openingIndexes.has(index) && panel.kind !== "fixed";

    if (animated && openingPreview?.enabled) {
      if (openingPreview.mode === "slide") {
        const directionSign = panel.slideDirection === "left" ? -1 : panel.slideDirection === "right" ? 1 : index % 2 === 0 ? 1 : -1;
        panelOuter = transformSlidingPolygon(panelOuter, directionSign, progress);
        panelInner = transformSlidingPolygon(panelInner, directionSign, progress);
        glassArea = transformSlidingPolygon(glassArea, directionSign, progress);
      } else if (openingPreview.mode === "tilt") {
        panelOuter = transformTiltPolygon(panelOuter, progress);
        panelInner = transformTiltPolygon(panelInner, progress);
        glassArea = transformTiltPolygon(glassArea, progress);
      } else {
        const hinge =
          openingPreview.mode === "double"
            ? index % 2 === 0
              ? "left"
              : "right"
            : panel.hingeSide ?? "left";

        panelOuter = transformHingedPolygon(panelOuter, hinge, progress);
        panelInner = transformHingedPolygon(panelInner, hinge, progress);
        glassArea = transformHingedPolygon(glassArea, hinge, progress);
      }

      context.save();
      const shadowOffset = pointScale(normalize(pointSub(panelOuter[3], panelOuter[0])), 6.8 * progress);
      const shadowPoly = shiftPolygon(panelOuter, shadowOffset);
      fillPolygon(context, shadowPoly, `rgba(2, 5, 10, ${0.16 + 0.16 * progress})`);
      context.restore();
    }

    const panelTop = [panelOuter[0], panelOuter[1], panelInner[1], panelInner[0]];
    const panelRight = [panelOuter[1], panelOuter[2], panelInner[2], panelInner[1]];
    const panelBottom = [panelOuter[2], panelOuter[3], panelInner[3], panelInner[2]];
    const panelLeft = [panelOuter[3], panelOuter[0], panelInner[0], panelInner[3]];

    drawFrameSegment(context, panelTop, frameHighlight, frameMedium, 0.96);
    drawFrameSegment(context, panelLeft, frameHighlight, frameMedium, 0.92);
    drawFrameSegment(context, panelBottom, frameMedium, frameDark, 0.95);
    drawFrameSegment(context, panelRight, frameMedium, frameDark, 0.95);

    drawGlass(context, glassArea, template.frameStyle.glassOpacity, environment);
    drawGasket(context, glassArea, Math.max(0.9, frameStroke * 0.22));

    context.save();
    drawPolygon(context, glassArea);
    context.lineWidth = Math.max(1, frameStroke * 0.28);
    context.strokeStyle = "rgba(28, 36, 46, 0.55)";
    context.stroke();
    context.restore();

    if (panel.kind === "opening") {
      drawPanelHandle(
        context,
        panelInner,
        panel.hingeSide ?? "left",
        Math.max(2, frameStroke * 0.5),
      );
    }

    if (panel.kind === "sliding") {
      const trackStart = pointLerp(panelInner[3], panelInner[2], 0.08);
      const trackEnd = pointLerp(panelInner[3], panelInner[2], 0.92);
      const trackGradient = context.createLinearGradient(
        trackStart.x,
        trackStart.y,
        trackEnd.x,
        trackEnd.y,
      );
      trackGradient.addColorStop(0, "rgba(239, 245, 251, 0.85)");
      trackGradient.addColorStop(1, "rgba(125, 145, 168, 0.86)");

      context.beginPath();
      context.moveTo(trackStart.x, trackStart.y);
      context.lineTo(trackEnd.x, trackEnd.y);
      context.lineCap = "round";
      context.lineWidth = Math.max(2, frameStroke * 0.38);
      context.strokeStyle = trackGradient;
      context.stroke();
    }

    offset = right;

    if (index < template.panelLayout.length - 1) {
      const mullionStrip = panelPolygon(
        quad,
        offset - mullion / 2,
        offset + mullion / 2,
        innerTop,
        innerBottom,
      );

      drawFrameSegment(
        context,
        [mullionStrip[0], mullionStrip[1], mullionStrip[2], mullionStrip[3]],
        frameLight,
        frameDark,
        0.95,
      );
    }
  }

  const stableSeed =
    (Math.round(outer[0].x + outer[1].y + outer[2].x) * 0.017 +
      Math.round(outer[3].y) * 0.009) %
    1000;

  if (color.id === "white" || color.id === "anthracite") {
    drawMicroTexture(context, outer, color.id === "white" ? 0.58 : 0.86, stableSeed);
  }

  if (color.id === "walnut" || color.id === "golden-oak" || color.id === "dark-oak") {
    drawWoodTexture(context, outer, 0.05);
  }

  drawPolygon(context, outer);
  context.lineWidth = frameStroke;
  context.strokeStyle = "rgba(248, 252, 255, 0.48)";
  context.stroke();

  context.restore();
}
