"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  DEFAULT_ENVIRONMENT_LIGHT,
  type EnvironmentLight,
} from "@/types/environment";

interface UseEnvironmentLightOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  basePhotoDataUrl: string | null;
  enabled: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function analyzeImageData(imageData: ImageData): EnvironmentLight {
  const { data, width, height } = imageData;

  let sumLuma = 0;
  let sumLumaSquared = 0;
  let sumLeft = 0;
  let sumRight = 0;
  let sumRed = 0;
  let sumBlue = 0;
  let leftCount = 0;
  let rightCount = 0;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

      sumLuma += luma;
      sumLumaSquared += luma * luma;
      sumRed += red;
      sumBlue += blue;
      count += 1;

      if (x < width / 2) {
        sumLeft += luma;
        leftCount += 1;
      } else {
        sumRight += luma;
        rightCount += 1;
      }
    }
  }

  if (!count) {
    return DEFAULT_ENVIRONMENT_LIGHT;
  }

  const avgLuma = sumLuma / count;
  const variance = Math.max(0, sumLumaSquared / count - avgLuma * avgLuma);
  const stdDev = Math.sqrt(variance);

  const leftLuma = leftCount ? sumLeft / leftCount : avgLuma;
  const rightLuma = rightCount ? sumRight / rightCount : avgLuma;

  const lumaNormalized = clamp(avgLuma / 255, 0, 1);
  const contrastNormalized = clamp(stdDev / 120, 0, 1);
  const direction = clamp((rightLuma - leftLuma) / 80, -1, 1);

  const avgRed = sumRed / count;
  const avgBlue = sumBlue / count;
  const warmth = clamp((avgRed - avgBlue) / 120 + 0.5, 0, 1);

  return {
    luma: lumaNormalized,
    contrast: contrastNormalized,
    direction,
    warmth,
  };
}

export function useEnvironmentLight({
  videoRef,
  basePhotoDataUrl,
  enabled,
}: UseEnvironmentLightOptions): EnvironmentLight {
  const [environmentLight, setEnvironmentLight] = useState<EnvironmentLight>(
    DEFAULT_ENVIRONMENT_LIGHT,
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 96;
      canvasRef.current = canvas;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const updateFromVideo = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const next = analyzeImageData(imageData);

      if (!cancelled) {
        setEnvironmentLight(next);
      }
    };

    if (basePhotoDataUrl) {
      const image = new Image();
      image.onload = () => {
        if (cancelled) {
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        setEnvironmentLight(analyzeImageData(imageData));
      };
      image.src = basePhotoDataUrl;
    } else {
      updateFromVideo();
      intervalId = window.setInterval(updateFromVideo, 800);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [videoRef, basePhotoDataUrl, enabled]);

  return environmentLight;
}
