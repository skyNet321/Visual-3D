import type { Point2D, Quad } from "@/types/geometry";
import { createCenteredQuad } from "@/lib/utils/geometry";

type DetectionSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

interface DetectionOptions {
  source: DetectionSource;
  viewportWidth: number;
  viewportHeight: number;
  expectedAspectRatio: number;
  focusPoint?: Point2D;
}

export interface DetectionResult {
  quad: Quad;
  confidence: number;
  method: "edge" | "fallback";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fallbackResult(
  viewportWidth: number,
  viewportHeight: number,
  expectedAspectRatio: number,
  confidence = 0,
): DetectionResult {
  return {
    quad: createCenteredQuad(
      { width: viewportWidth, height: viewportHeight },
      expectedAspectRatio,
    ),
    confidence,
    method: "fallback",
  };
}

function findPeakIndex(values: ArrayLike<number>, start: number, end: number) {
  let maxValue = Number.NEGATIVE_INFINITY;
  let maxIndex = start;

  for (let index = start; index <= end; index += 1) {
    if (values[index] > maxValue) {
      maxValue = values[index];
      maxIndex = index;
    }
  }

  return { index: maxIndex, value: maxValue };
}

function getSourceDimensions(source: DetectionSource) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }

  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }

  return { width: source.width, height: source.height };
}

function drawSourceCover(
  context: CanvasRenderingContext2D,
  source: DetectionSource,
  width: number,
  height: number,
) {
  const { width: sourceWidth, height: sourceHeight } = getSourceDimensions(source);
  if (!sourceWidth || !sourceHeight) {
    return false;
  }

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  context.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
  return true;
}

function fitRectToAspectSoft(
  left: number,
  top: number,
  right: number,
  bottom: number,
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  let width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return {
      left: viewportWidth * 0.2,
      top: viewportHeight * 0.2,
      right: viewportWidth * 0.8,
      bottom: viewportHeight * 0.8,
    };
  }

  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  const currentAspect = width / height;
  const minAspect = Math.max(0.22, aspectRatio * 0.55);
  const maxAspect = Math.max(minAspect + 0.1, aspectRatio * 1.85);

  if (currentAspect < minAspect) {
    width = height * minAspect;
  } else if (currentAspect > maxAspect) {
    width = height * maxAspect;
  }

  const boundedWidth = Math.min(width, viewportWidth * 0.92);
  const boundedHeight = Math.min(height, viewportHeight * 0.92);

  const finalWidth = Math.max(70, boundedWidth);
  const finalHeight = Math.max(70, boundedHeight);

  return {
    left: Math.max(8, centerX - finalWidth / 2),
    top: Math.max(8, centerY - finalHeight / 2),
    right: Math.min(viewportWidth - 8, centerX + finalWidth / 2),
    bottom: Math.min(viewportHeight - 8, centerY + finalHeight / 2),
  };
}

export function suggestOpeningQuad({
  source,
  viewportWidth,
  viewportHeight,
  expectedAspectRatio,
  focusPoint,
}: DetectionOptions): DetectionResult {
  const sourceSize = getSourceDimensions(source);

  if (!sourceSize.width || !sourceSize.height) {
    return fallbackResult(viewportWidth, viewportHeight, expectedAspectRatio);
  }

  const sampleWidth = 320;
  const sampleHeight = Math.max(
    220,
    Math.round((sampleWidth * viewportHeight) / Math.max(1, viewportWidth)),
  );

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return fallbackResult(viewportWidth, viewportHeight, expectedAspectRatio);
  }

  const drawn = drawSourceCover(context, source, sampleWidth, sampleHeight);
  if (!drawn) {
    return fallbackResult(viewportWidth, viewportHeight, expectedAspectRatio);
  }

  const image = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const gray = new Float32Array(sampleWidth * sampleHeight);

  for (let index = 0; index < image.data.length; index += 4) {
    const pixelIndex = index / 4;
    const r = image.data[index];
    const g = image.data[index + 1];
    const b = image.data[index + 2];
    gray[pixelIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const absGx = new Float32Array(sampleWidth * sampleHeight);
  const absGy = new Float32Array(sampleWidth * sampleHeight);

  const focusX = focusPoint
    ? clamp(
        (focusPoint.x / Math.max(1, viewportWidth)) * sampleWidth,
        sampleWidth * 0.18,
        sampleWidth * 0.82,
      )
    : sampleWidth / 2;

  const focusY = focusPoint
    ? clamp(
        (focusPoint.y / Math.max(1, viewportHeight)) * sampleHeight,
        sampleHeight * 0.18,
        sampleHeight * 0.82,
      )
    : sampleHeight / 2;

  const halfRoiWidth = focusPoint ? sampleWidth * 0.28 : sampleWidth * 0.4;
  const halfRoiHeight = focusPoint ? sampleHeight * 0.34 : sampleHeight * 0.42;

  const roiLeft = Math.floor(clamp(focusX - halfRoiWidth, 1, sampleWidth - 2));
  const roiRight = Math.floor(clamp(focusX + halfRoiWidth, 1, sampleWidth - 2));
  const roiTop = Math.floor(clamp(focusY - halfRoiHeight, 1, sampleHeight - 2));
  const roiBottom = Math.floor(clamp(focusY + halfRoiHeight, 1, sampleHeight - 2));

  let roiBaselineSum = 0;
  let roiPixels = 0;

  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const i = y * sampleWidth + x;

      const gx =
        -gray[i - sampleWidth - 1] -
        2 * gray[i - 1] -
        gray[i + sampleWidth - 1] +
        gray[i - sampleWidth + 1] +
        2 * gray[i + 1] +
        gray[i + sampleWidth + 1];

      const gy =
        -gray[i - sampleWidth - 1] -
        2 * gray[i - sampleWidth] -
        gray[i - sampleWidth + 1] +
        gray[i + sampleWidth - 1] +
        2 * gray[i + sampleWidth] +
        gray[i + sampleWidth + 1];

      const gxAbs = Math.abs(gx);
      const gyAbs = Math.abs(gy);

      absGx[i] = gxAbs;
      absGy[i] = gyAbs;

      if (x >= roiLeft && x <= roiRight && y >= roiTop && y <= roiBottom) {
        roiBaselineSum += gxAbs + gyAbs;
        roiPixels += 1;
      }
    }
  }

  const columnScores = new Float32Array(sampleWidth);
  const rowScores = new Float32Array(sampleHeight);

  for (let y = roiTop; y <= roiBottom; y += 1) {
    for (let x = roiLeft; x <= roiRight; x += 1) {
      const i = y * sampleWidth + x;
      columnScores[x] += absGx[i];
      rowScores[y] += absGy[i];
    }
  }

  const baseline = roiBaselineSum / Math.max(1, roiPixels);
  const centerX = Math.floor(focusX);
  const centerY = Math.floor(focusY);

  const minHorizontalSeparation = Math.max(18, Math.floor(sampleWidth * 0.08));
  const minVerticalSeparation = Math.max(22, Math.floor(sampleHeight * 0.09));

  const leftSearchStart = roiLeft;
  const leftSearchEnd = Math.floor(
    clamp(centerX - minHorizontalSeparation, roiLeft + 2, roiRight - 2),
  );
  const rightSearchStart = Math.floor(
    clamp(centerX + minHorizontalSeparation, roiLeft + 2, roiRight - 2),
  );
  const rightSearchEnd = roiRight;

  const topSearchStart = roiTop;
  const topSearchEnd = Math.floor(
    clamp(centerY - minVerticalSeparation, roiTop + 2, roiBottom - 2),
  );
  const bottomSearchStart = Math.floor(
    clamp(centerY + minVerticalSeparation, roiTop + 2, roiBottom - 2),
  );
  const bottomSearchEnd = roiBottom;

  const invalidSearchWindow =
    leftSearchEnd <= leftSearchStart ||
    rightSearchStart >= rightSearchEnd ||
    topSearchEnd <= topSearchStart ||
    bottomSearchStart >= bottomSearchEnd;

  if (invalidSearchWindow) {
    return fallbackResult(viewportWidth, viewportHeight, expectedAspectRatio);
  }

  const leftPeak = findPeakIndex(columnScores, leftSearchStart, leftSearchEnd);
  const rightPeak = findPeakIndex(columnScores, rightSearchStart, rightSearchEnd);
  const topPeak = findPeakIndex(rowScores, topSearchStart, topSearchEnd);
  const bottomPeak = findPeakIndex(rowScores, bottomSearchStart, bottomSearchEnd);

  const confidence =
    ((leftPeak.value / sampleHeight +
      rightPeak.value / sampleHeight +
      topPeak.value / sampleWidth +
      bottomPeak.value / sampleWidth) /
      4) /
    Math.max(10, baseline);

  const separationOkay =
    rightPeak.index - leftPeak.index > sampleWidth * 0.14 &&
    bottomPeak.index - topPeak.index > sampleHeight * 0.16;

  if (!separationOkay || confidence < 1.08) {
    return fallbackResult(viewportWidth, viewportHeight, expectedAspectRatio, confidence);
  }

  const left = ((leftPeak.index + 2) / sampleWidth) * viewportWidth;
  const right = ((rightPeak.index - 2) / sampleWidth) * viewportWidth;
  const top = ((topPeak.index + 2) / sampleHeight) * viewportHeight;
  const bottom = ((bottomPeak.index - 2) / sampleHeight) * viewportHeight;

  const fitted = fitRectToAspectSoft(
    left,
    top,
    right,
    bottom,
    expectedAspectRatio,
    viewportWidth,
    viewportHeight,
  );

  return {
    quad: [
      { x: fitted.left, y: fitted.top },
      { x: fitted.right, y: fitted.top },
      { x: fitted.right, y: fitted.bottom },
      { x: fitted.left, y: fitted.bottom },
    ],
    confidence,
    method: "edge",
  };
}
