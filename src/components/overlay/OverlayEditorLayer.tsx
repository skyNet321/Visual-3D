"use client";

import type { Quad } from "@/types/geometry";
import type { PointerBindings } from "@/hooks/useOverlayEditor";

interface OverlayEditorLayerProps {
  quad: Quad | null;
  visible: boolean;
  cornerEditMode: boolean;
  activeCorner: number | null;
  bindings: PointerBindings;
}

function buildPolygonPath(quad: Quad) {
  return quad.map((point) => `${point.x},${point.y}`).join(" ");
}

export function OverlayEditorLayer({
  quad,
  visible,
  cornerEditMode,
  activeCorner,
  bindings,
}: OverlayEditorLayerProps) {
  return (
    <div
      className={`absolute inset-0 z-30 ${visible ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ touchAction: "none" }}
      {...bindings}
    >
      {quad && visible ? (
        <>
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <polygon
              points={buildPolygonPath(quad)}
              fill="rgba(97, 167, 255, 0.08)"
              stroke={cornerEditMode ? "rgba(255, 211, 123, 0.96)" : "rgba(116, 196, 255, 0.92)"}
              strokeWidth={2}
              strokeDasharray={cornerEditMode ? "5 5" : "10 6"}
            />
          </svg>

          {cornerEditMode
            ? quad.map((point, index) => (
                <div
                  key={`${index}-${point.x.toFixed(0)}-${point.y.toFixed(0)}`}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: point.x, top: point.y }}
                >
                  <span
                    className={`block h-6 w-6 rounded-full border-2 ${
                      activeCorner === index
                        ? "border-[#082b4a] bg-[#ffd082]"
                        : "border-white bg-[#4ea4ff]"
                    }`}
                  />
                </div>
              ))
            : null}
        </>
      ) : null}
    </div>
  );
}
