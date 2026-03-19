import type { Quad } from "@/types/geometry";
import { createCenteredQuad } from "@/lib/utils/geometry";

interface DetectionOptions {
  video: HTMLVideoElement;
  viewportWidth: number;
  viewportHeight: number;
  expectedAspectRatio: number;
}

export interface DetectionResult {
  quad: Quad;
  confidence: number;
  method: "edge" | "fallback";
}

function findPeakIndex(values: number[], start: number, end: number) {
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

function fitRectToAspect(
  left: number,
  top: number,
  right: number,
  bottom: number,
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  let width = right - left;
  let height = bottom - top;

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

  if (currentAspect > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  const boundedWidth = Math.min(width, viewportWidth * 0.9);
  const boundedHeight = Math.min(height, viewportHeight * 0.9);

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
  video,
  viewportWidth,
  viewportHeight,
  expectedAspectRatio,
}: DetectionOptions): DetectionResult {
  if (!video.videoWidth || !video.videoHeight) {
    return {
      quad: createCenteredQuad(
        { width: viewportWidth, height: viewportHeight },
        expectedAspectRatio,
      ),
      confidence: 0,
      method: "fallback",
    };
  }

  const sampleWidth = 256;
  const sampleHeight = Math.max(192, Math.round((sampleWidth * viewportHeight) / viewportWidth));

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return {
      quad: createCenteredQuad(
        { width: viewportWidth, height: viewportHeight },
        expectedAspectRatio,
      ),
      confidence: 0,
      method: "fallback",
    };
  }

  context.drawImage(video, 0, 0, sampleWidth, sampleHeight);

  const image = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const gray = new Float32Array(sampleWidth * sampleHeight);

  for (let index = 0; index < image.data.length; index += 4) {
    const pixelIndex = index / 4;
    const r = image.data[index];
    const g = image.data[index + 1];
    const b = image.data[index + 2];
    gray[pixelIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const columnScores = new Float32Array(sampleWidth);
  const rowScores = new Float32Array(sampleHeight);

  let magnitudeSum = 0;

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

      const magnitude = Math.abs(gx) + Math.abs(gy);
      columnScores[x] += magnitude;
      rowScores[y] += magnitude;
      magnitudeSum += magnitude;
    }
  }

  const baseline = magnitudeSum / (sampleWidth * sampleHeight);

  const leftPeak = findPeakIndex(
    Array.from(columnScores),
    Math.floor(sampleWidth * 0.08),
    Math.floor(sampleWidth * 0.46),
  );
  const rightPeak = findPeakIndex(
    Array.from(columnScores),
    Math.floor(sampleWidth * 0.54),
    Math.floor(sampleWidth * 0.92),
  );
  const topPeak = findPeakIndex(
    Array.from(rowScores),
    Math.floor(sampleHeight * 0.08),
    Math.floor(sampleHeight * 0.44),
  );
  const bottomPeak = findPeakIndex(
    Array.from(rowScores),
    Math.floor(sampleHeight * 0.56),
    Math.floor(sampleHeight * 0.92),
  );

  const confidence =
    ((leftPeak.value / sampleHeight +
      rightPeak.value / sampleHeight +
      topPeak.value / sampleWidth +
      bottomPeak.value / sampleWidth) /
      4) /
    Math.max(8, baseline);

  const separationOkay =
    rightPeak.index - leftPeak.index > sampleWidth * 0.22 &&
    bottomPeak.index - topPeak.index > sampleHeight * 0.22;

  if (!separationOkay || confidence < 1.35) {
    return {
      quad: createCenteredQuad(
        { width: viewportWidth, height: viewportHeight },
        expectedAspectRatio,
      ),
      confidence,
      method: "fallback",
    };
  }

  const left = ((leftPeak.index + 2) / sampleWidth) * viewportWidth;
  const right = ((rightPeak.index - 2) / sampleWidth) * viewportWidth;
  const top = ((topPeak.index + 2) / sampleHeight) * viewportHeight;
  const bottom = ((bottomPeak.index - 2) / sampleHeight) * viewportHeight;

  const fitted = fitRectToAspect(
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
