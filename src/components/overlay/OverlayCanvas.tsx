"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ColorPreset } from "@/types/colors";
import type { Quad } from "@/types/geometry";
import type { EnvironmentLight } from "@/types/environment";
import type { OpeningPreviewState } from "@/types/openingPreview";
import type { ProductTemplate } from "@/types/products";
import { renderOverlay } from "@/lib/render/overlayRenderer";

interface OverlayCanvasProps {
  quad: Quad | null;
  template: ProductTemplate;
  color: ColorPreset;
  hidden?: boolean;
  opacity?: number;
  openingPreview?: OpeningPreviewState;
  environmentLight?: EnvironmentLight;
}

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

export const OverlayCanvas = forwardRef<HTMLCanvasElement, OverlayCanvasProps>(
  function OverlayCanvas(
    {
      quad,
      template,
      color,
      hidden = false,
      opacity = 0.95,
      openingPreview,
      environmentLight,
    },
    forwardedRef,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0, dpr: 1 });

    useImperativeHandle(forwardedRef, () => canvasRef.current as HTMLCanvasElement, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;

      if (!canvas || !parent) {
        return;
      }

      const updateSize = () => {
        const nextWidth = Math.max(Math.round(parent.clientWidth), 1);
        const nextHeight = Math.max(Math.round(parent.clientHeight), 1);
        const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(nextWidth * nextDpr);
        canvas.height = Math.round(nextHeight * nextDpr);
        canvas.style.width = `${nextWidth}px`;
        canvas.style.height = `${nextHeight}px`;

        setSize({ width: nextWidth, height: nextHeight, dpr: nextDpr });
      };

      updateSize();

      const observer = new ResizeObserver(() => updateSize());
      observer.observe(parent);

      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      context.clearRect(0, 0, size.width, size.height);

      if (!quad || hidden) {
        return;
      }

      renderOverlay({
        context,
        quad,
        template,
        color,
        opacity,
        openingPreview,
        environmentLight,
      });
    }, [size, quad, template, color, hidden, opacity, openingPreview, environmentLight]);

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20 h-full w-full"
        aria-hidden="true"
      />
    );
  },
);
