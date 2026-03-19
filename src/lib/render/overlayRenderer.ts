import type { ColorPreset } from "@/types/colors";
import type { Point2D, Quad } from "@/types/geometry";
import type { ProductTemplate } from "@/types/products";
import { interpolateQuadPoint } from "@/lib/utils/geometry";
import { shadeHex } from "@/lib/utils/color";

interface OverlayRenderOptions {
  context: CanvasRenderingContext2D;
  quad: Quad;
  template: ProductTemplate;
  color: ColorPreset;
  opacity?: number;
}

function drawPolygon(context: CanvasRenderingContext2D, points: Point2D[]) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function fillPolygon(context: CanvasRenderingContext2D, points: Point2D[], fillStyle: string | CanvasGradient) {
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

function drawFrameSegment(
  context: CanvasRenderingContext2D,
  points: Point2D[],
  outerColor: string,
  innerColor: string,
  alpha = 1,
) {
  const outerMid = midpoint(points[0], points[1]);
  const innerMid = midpoint(points[2], points[3]);

  const gradient = context.createLinearGradient(
    outerMid.x,
    outerMid.y,
    innerMid.x,
    innerMid.y,
  );
  gradient.addColorStop(0, outerColor);
  gradient.addColorStop(1, innerColor);

  context.save();
  context.globalAlpha = alpha;
  fillPolygon(context, points, gradient);
  context.restore();
}

function drawPanelHandle(
  context: CanvasRenderingContext2D,
  quad: Quad,
  left: number,
  right: number,
  top: number,
  bottom: number,
  hingeSide: "left" | "right",
  lineWidth: number,
) {
  const handleU = hingeSide === "left" ? right - 0.028 : left + 0.028;

  const topPoint = interpolateQuadPoint(quad, handleU, top + 0.36 * (bottom - top));
  const bottomPoint = interpolateQuadPoint(quad, handleU, top + 0.64 * (bottom - top));

  const metallic = context.createLinearGradient(
    topPoint.x,
    topPoint.y,
    bottomPoint.x,
    bottomPoint.y,
  );
  metallic.addColorStop(0, "rgba(244, 247, 252, 0.95)");
  metallic.addColorStop(0.5, "rgba(182, 193, 206, 0.98)");
  metallic.addColorStop(1, "rgba(117, 129, 144, 0.98)");

  context.save();
  context.beginPath();
  context.moveTo(topPoint.x, topPoint.y);
  context.lineTo(bottomPoint.x, bottomPoint.y);
  context.lineCap = "round";
  context.lineWidth = lineWidth;
  context.strokeStyle = metallic;
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = Math.max(2, lineWidth * 0.8);
  context.stroke();

  context.beginPath();
  context.arc((topPoint.x + bottomPoint.x) / 2, bottomPoint.y, lineWidth * 0.32, 0, Math.PI * 2);
  context.fillStyle = "rgba(227, 235, 243, 0.94)";
  context.fill();
  context.restore();
}

function drawGlass(
  context: CanvasRenderingContext2D,
  polygon: Point2D[],
  glassOpacity: number,
) {
  const bounds = polygonBounds(polygon);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  context.save();
  drawPolygon(context, polygon);
  context.clip();

  const baseGradient = context.createLinearGradient(
    bounds.minX,
    bounds.minY,
    bounds.maxX,
    bounds.maxY,
  );
  baseGradient.addColorStop(0, `rgba(188, 218, 244, ${glassOpacity + 0.16})`);
  baseGradient.addColorStop(0.45, `rgba(141, 184, 216, ${glassOpacity + 0.08})`);
  baseGradient.addColorStop(1, `rgba(97, 139, 170, ${glassOpacity - 0.02})`);

  context.fillStyle = baseGradient;
  context.fillRect(bounds.minX, bounds.minY, width, height);

  const reflection = context.createLinearGradient(
    bounds.minX,
    bounds.minY,
    bounds.maxX,
    bounds.minY + height * 0.45,
  );
  reflection.addColorStop(0, "rgba(255, 255, 255, 0.42)");
  reflection.addColorStop(0.35, "rgba(255, 255, 255, 0.16)");
  reflection.addColorStop(1, "rgba(255, 255, 255, 0.02)");

  context.fillStyle = reflection;
  context.fillRect(bounds.minX, bounds.minY, width, height * 0.6);

  context.globalAlpha = 0.2;
  for (let index = 0; index < 4; index += 1) {
    const streakX = bounds.minX + width * (0.12 + index * 0.22);
    const streak = context.createLinearGradient(
      streakX,
      bounds.minY,
      streakX + width * 0.1,
      bounds.maxY,
    );
    streak.addColorStop(0, "rgba(255, 255, 255, 0.7)");
    streak.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = streak;
    context.fillRect(streakX, bounds.minY, width * 0.1, height);
  }

  context.restore();
}

function drawWoodTexture(
  context: CanvasRenderingContext2D,
  polygon: Point2D[],
  density: number,
) {
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

export function renderOverlay({
  context,
  quad,
  template,
  color,
  opacity = 0.94,
}: OverlayRenderOptions) {
  const avgEdge = averageEdgeLength(quad);
  const frameStroke = Math.max(1.5, Math.min(8, avgEdge * 0.012));
  const outer = panelPolygon(quad, 0, 1, 0, 1);

  const frame = template.frameStyle.frameThickness;
  const innerLeft = frame;
  const innerRight = 1 - frame;
  const innerTop = frame;
  const innerBottom = 1 - frame;
  const inner = panelPolygon(quad, innerLeft, innerRight, innerTop, innerBottom);

  const frameDark = shadeHex(color.hex, -0.26);
  const frameMedium = shadeHex(color.hex, -0.1);
  const frameLight = shadeHex(color.hex, 0.14);
  const frameHighlight = shadeHex(color.accentHex, 0.3);

  context.save();
  context.globalAlpha = opacity;

  context.save();
  drawPolygon(context, outer);
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = Math.max(12, avgEdge * 0.06);
  context.shadowOffsetX = Math.max(2, avgEdge * 0.008);
  context.shadowOffsetY = Math.max(4, avgEdge * 0.016);
  context.fillStyle = "rgba(12, 17, 24, 0.22)";
  context.fill();
  context.restore();

  fillPolygon(context, outer, frameDark);

  const topStrip = [outer[0], outer[1], inner[1], inner[0]];
  const rightStrip = [outer[1], outer[2], inner[2], inner[1]];
  const bottomStrip = [outer[2], outer[3], inner[3], inner[2]];
  const leftStrip = [outer[3], outer[0], inner[0], inner[3]];

  drawFrameSegment(context, topStrip, frameLight, frameMedium, 0.96);
  drawFrameSegment(context, leftStrip, frameLight, frameMedium, 0.92);
  drawFrameSegment(context, bottomStrip, frameMedium, frameDark, 0.95);
  drawFrameSegment(context, rightStrip, frameMedium, frameDark, 0.95);

  context.save();
  drawPolygon(context, inner);
  context.fillStyle = "rgba(45, 66, 88, 0.2)";
  context.fill();
  context.restore();

  const mullion = template.frameStyle.mullionThickness;
  let offset = innerLeft;

  for (let index = 0; index < template.panelLayout.length; index += 1) {
    const panel = template.panelLayout[index];
    const panelWidth = (innerRight - innerLeft) * panel.widthRatio;

    const left = offset;
    const right = offset + panelWidth;

    const panelOuter = panelPolygon(quad, left, right, innerTop, innerBottom);
    const panelInset = Math.max(0.012, mullion * 0.45);
    const panelInner = panelPolygon(
      quad,
      left + panelInset,
      right - panelInset,
      innerTop + panelInset,
      innerBottom - panelInset,
    );

    const panelTop = [panelOuter[0], panelOuter[1], panelInner[1], panelInner[0]];
    const panelRight = [panelOuter[1], panelOuter[2], panelInner[2], panelInner[1]];
    const panelBottom = [panelOuter[2], panelOuter[3], panelInner[3], panelInner[2]];
    const panelLeft = [panelOuter[3], panelOuter[0], panelInner[0], panelInner[3]];

    drawFrameSegment(context, panelTop, frameHighlight, frameMedium, 0.96);
    drawFrameSegment(context, panelLeft, frameHighlight, frameMedium, 0.92);
    drawFrameSegment(context, panelBottom, frameMedium, frameDark, 0.95);
    drawFrameSegment(context, panelRight, frameMedium, frameDark, 0.95);

    const glassInset = panelInset * 1.1;
    const glassArea = panelPolygon(
      quad,
      left + glassInset,
      right - glassInset,
      innerTop + glassInset,
      innerBottom - glassInset,
    );

    drawGlass(context, glassArea, template.frameStyle.glassOpacity);

    context.save();
    drawPolygon(context, glassArea);
    context.lineWidth = Math.max(1, frameStroke * 0.28);
    context.strokeStyle = "rgba(28, 36, 46, 0.55)";
    context.stroke();
    context.restore();

    if (panel.kind === "opening") {
      drawPanelHandle(
        context,
        quad,
        left,
        right,
        innerTop,
        innerBottom,
        panel.hingeSide ?? "left",
        Math.max(2, frameStroke * 0.52),
      );
    }

    if (panel.kind === "sliding") {
      const trackStart = interpolateQuadPoint(quad, left + 0.07 * (right - left), innerBottom - 0.018);
      const trackEnd = interpolateQuadPoint(quad, right - 0.07 * (right - left), innerBottom - 0.018);
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
        [
          mullionStrip[0],
          mullionStrip[1],
          mullionStrip[2],
          mullionStrip[3],
        ],
        frameLight,
        frameDark,
        0.95,
      );
    }
  }

  if (
    color.id === "walnut" ||
    color.id === "golden-oak" ||
    color.id === "dark-oak"
  ) {
    drawWoodTexture(context, outer, 0.05);
  }

  drawPolygon(context, outer);
  context.lineWidth = frameStroke;
  context.strokeStyle = "rgba(248, 252, 255, 0.5)";
  context.stroke();

  context.restore();
}
