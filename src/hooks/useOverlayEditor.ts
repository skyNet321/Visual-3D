"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point2D, Quad } from "@/types/geometry";
import {
  clampQuadToBounds,
  cloneQuad,
  findClosestCorner,
  transformQuadByPinchRotate,
  translateQuad,
  type Size2D,
} from "@/lib/utils/geometry";

type GestureState =
  | {
      mode: "drag";
      pointerId: number;
      startPoint: Point2D;
      startQuad: Quad;
    }
  | {
      mode: "pinch";
      pointerAId: number;
      pointerBId: number;
      startA: Point2D;
      startB: Point2D;
      startQuad: Quad;
    }
  | {
      mode: "corner";
      pointerId: number;
      cornerIndex: number;
      startQuad: Quad;
    }
  | {
      mode: "none";
    };

interface UseOverlayEditorOptions {
  quad: Quad | null;
  onQuadChange: (quad: Quad) => void;
  cornerEditMode: boolean;
  viewport: Size2D;
}

export interface PointerBindings {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

function getRelativePoint(event: ReactPointerEvent<HTMLDivElement>): Point2D {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function useOverlayEditor({
  quad,
  onQuadChange,
  cornerEditMode,
  viewport,
}: UseOverlayEditorOptions) {
  const [activeCorner, setActiveCorner] = useState<number | null>(null);

  const pointersRef = useRef<Map<number, Point2D>>(new Map());
  const gestureRef = useRef<GestureState>({ mode: "none" });
  const quadRef = useRef<Quad | null>(quad);

  useEffect(() => {
    quadRef.current = quad;
  }, [quad]);

  const clearGesture = () => {
    gestureRef.current = { mode: "none" };
    setActiveCorner(null);
  };

  const startPinchGesture = () => {
    const latestQuad = quadRef.current;
    if (!latestQuad || pointersRef.current.size < 2) {
      return;
    }

    const ids = Array.from(pointersRef.current.keys());
    const pointerAId = ids[0];
    const pointerBId = ids[1];

    const startA = pointersRef.current.get(pointerAId);
    const startB = pointersRef.current.get(pointerBId);

    if (!startA || !startB) {
      return;
    }

    gestureRef.current = {
      mode: "pinch",
      pointerAId,
      pointerBId,
      startA,
      startB,
      startQuad: cloneQuad(latestQuad),
    };
  };

  const startDragGesture = (pointerId: number) => {
    const latestQuad = quadRef.current;
    const pointer = pointersRef.current.get(pointerId);

    if (!latestQuad || !pointer) {
      return;
    }

    gestureRef.current = {
      mode: "drag",
      pointerId,
      startPoint: pointer,
      startQuad: cloneQuad(latestQuad),
    };
  };

  const bindings: PointerBindings = {
    onPointerDown: (event) => {
      const latestQuad = quadRef.current;
      if (!latestQuad) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const point = getRelativePoint(event);
      pointersRef.current.set(event.pointerId, point);

      if (cornerEditMode) {
        const cornerIndex = findClosestCorner(latestQuad, point, 44);
        if (cornerIndex !== null) {
          setActiveCorner(cornerIndex);
          gestureRef.current = {
            mode: "corner",
            pointerId: event.pointerId,
            cornerIndex,
            startQuad: cloneQuad(latestQuad),
          };
          return;
        }
      }

      if (pointersRef.current.size === 1) {
        startDragGesture(event.pointerId);
        return;
      }

      if (pointersRef.current.size >= 2) {
        startPinchGesture();
      }
    },
    onPointerMove: (event) => {
      const point = getRelativePoint(event);
      pointersRef.current.set(event.pointerId, point);

      const gesture = gestureRef.current;

      if (gesture.mode === "none") {
        return;
      }

      if (gesture.mode === "corner") {
        if (gesture.pointerId !== event.pointerId) {
          return;
        }

        const nextQuad = cloneQuad(gesture.startQuad);
        nextQuad[gesture.cornerIndex] = point;
        onQuadChange(clampQuadToBounds(nextQuad, viewport));
        return;
      }

      if (gesture.mode === "drag") {
        if (gesture.pointerId !== event.pointerId) {
          return;
        }

        const deltaX = point.x - gesture.startPoint.x;
        const deltaY = point.y - gesture.startPoint.y;
        const moved = translateQuad(gesture.startQuad, deltaX, deltaY);
        onQuadChange(clampQuadToBounds(moved, viewport));
        return;
      }

      if (gesture.mode === "pinch") {
        const currentA = pointersRef.current.get(gesture.pointerAId);
        const currentB = pointersRef.current.get(gesture.pointerBId);
        if (!currentA || !currentB) {
          return;
        }

        const transformed = transformQuadByPinchRotate(
          gesture.startQuad,
          gesture.startA,
          gesture.startB,
          currentA,
          currentB,
        );
        onQuadChange(clampQuadToBounds(transformed, viewport));
      }
    },
    onPointerUp: (event) => {
      pointersRef.current.delete(event.pointerId);

      if (pointersRef.current.size === 0) {
        clearGesture();
        return;
      }

      if (pointersRef.current.size === 1) {
        const remainingId = Array.from(pointersRef.current.keys())[0];
        startDragGesture(remainingId);
        return;
      }

      startPinchGesture();
    },
    onPointerCancel: (event) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) {
        clearGesture();
      }
    },
  };

  return {
    activeCorner,
    bindings,
  };
}
