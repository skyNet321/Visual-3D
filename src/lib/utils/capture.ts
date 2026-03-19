import type { ProductTemplate } from "@/types/products";
import type { ColorPreset } from "@/types/colors";

interface CaptureOptions {
  videoElement?: HTMLVideoElement | null;
  overlayCanvas: HTMLCanvasElement;
  template: ProductTemplate;
  color: ColorPreset;
  companyName?: string;
  backgroundDataUrl?: string | null;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось загрузить фото основы."));
    image.src = dataUrl;
  });
}

export function captureStillFromVideo(videoElement: HTMLVideoElement): string | null {
  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight;

  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(videoElement, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.93);
}

export async function captureCompositePreview({
  videoElement,
  overlayCanvas,
  template,
  color,
  companyName = "PVC Visual Configurator AR",
  backgroundDataUrl,
}: CaptureOptions): Promise<string> {
  const backgroundImage = backgroundDataUrl
    ? await loadImage(backgroundDataUrl).catch(() => null)
    : null;

  const width =
    backgroundImage?.naturalWidth ||
    videoElement?.videoWidth ||
    overlayCanvas.width ||
    Math.max(overlayCanvas.clientWidth, 720);

  const height =
    backgroundImage?.naturalHeight ||
    videoElement?.videoHeight ||
    overlayCanvas.height ||
    Math.max(overlayCanvas.clientHeight, 1280);

  const brandBarHeight = Math.max(Math.round(height * 0.14), 120);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height + brandBarHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas контекст недоступен");
  }

  if (backgroundImage) {
    context.drawImage(backgroundImage, 0, 0, width, height);
  } else if (videoElement) {
    context.drawImage(videoElement, 0, 0, width, height);
  } else {
    context.fillStyle = "#0f2238";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(overlayCanvas, 0, 0, width, height);

  const gradient = context.createLinearGradient(0, height, width, height + brandBarHeight);
  gradient.addColorStop(0, "rgba(9, 20, 34, 0.92)");
  gradient.addColorStop(1, "rgba(22, 45, 74, 0.94)");
  context.fillStyle = gradient;
  context.fillRect(0, height, width, brandBarHeight);

  context.fillStyle = "#f8fbff";
  context.font = "600 28px 'Segoe UI', sans-serif";
  context.fillText(companyName, 26, height + 44);

  context.font = "500 21px 'Segoe UI', sans-serif";
  context.fillStyle = "#c9d7ea";
  context.fillText(`Модель: ${template.name}`, 26, height + 80);
  context.fillText(`Цвет: ${color.name}`, 26, height + 110);

  const now = new Date();
  context.textAlign = "right";
  context.fillStyle = "#d7e4f5";
  context.fillText(
    `Создано ${now.toLocaleString("ru-RU")}`,
    width - 26,
    height + brandBarHeight - 24,
  );

  return canvas.toDataURL("image/png", 0.94);
}
