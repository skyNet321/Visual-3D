"use client";

import Image from "next/image";
import type { RefObject } from "react";
import type { CameraStatus } from "@/hooks/useCamera";
import type { ColorPreset } from "@/types/colors";
import type { Quad } from "@/types/geometry";
import type { ProductTemplate } from "@/types/products";
import type { PointerBindings } from "@/hooks/useOverlayEditor";
import { OverlayCanvas } from "@/components/overlay/OverlayCanvas";
import { OverlayEditorLayer } from "@/components/overlay/OverlayEditorLayer";

interface CameraStageProps {
  stageRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  onEnableCamera: () => void;
  template: ProductTemplate;
  color: ColorPreset;
  quad: Quad | null;
  showOverlay: boolean;
  cornerEditMode: boolean;
  activeCorner: number | null;
  bindings: PointerBindings;
  beforeMode: boolean;
  onToggleBeforeAfter: () => void;
  onToggleCornerMode: () => void;
  onAutoAlign: () => void;
  assistedDetectionEnabled: boolean;
  isAutoAligning: boolean;
  basePhotoDataUrl: string | null;
  onClearBasePhoto: () => void;
}

function statusLabel(status: CameraStatus) {
  if (status === "requesting") {
    return "Запрашиваем доступ к камере...";
  }
  if (status === "denied") {
    return "Нет доступа к камере";
  }
  if (status === "unsupported") {
    return "Браузер не поддерживает камеру";
  }
  if (status === "error") {
    return "Ошибка камеры";
  }
  return "";
}

export function CameraStage({
  stageRef,
  videoRef,
  overlayCanvasRef,
  cameraStatus,
  cameraError,
  onEnableCamera,
  template,
  color,
  quad,
  showOverlay,
  cornerEditMode,
  activeCorner,
  bindings,
  beforeMode,
  onToggleBeforeAfter,
  onToggleCornerMode,
  onAutoAlign,
  assistedDetectionEnabled,
  isAutoAligning,
  basePhotoDataUrl,
  onClearBasePhoto,
}: CameraStageProps) {
  const needsButton =
    cameraStatus === "idle" ||
    cameraStatus === "denied" ||
    cameraStatus === "unsupported" ||
    cameraStatus === "error";

  const photoFrozen = Boolean(basePhotoDataUrl);

  return (
    <section className="relative min-h-[55vh] flex-1 overflow-hidden rounded-[26px] border border-[#c4d6eb] bg-[#0f243d] shadow-[0_30px_70px_rgba(3,14,30,0.35)]">
      <div ref={stageRef} className="absolute inset-0">
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${photoFrozen ? "opacity-0" : "opacity-100"}`}
          autoPlay
          muted
          playsInline
        />

        {basePhotoDataUrl ? (
          <Image
            src={basePhotoDataUrl}
            alt="Фото основы"
            fill
            unoptimized
            className="absolute inset-0 z-10 object-cover"
          />
        ) : null}

        <OverlayCanvas
          ref={overlayCanvasRef}
          quad={quad}
          template={template}
          color={color}
          hidden={!showOverlay}
        />

        <OverlayEditorLayer
          quad={quad}
          visible={showOverlay && (cameraStatus === "ready" || photoFrozen)}
          cornerEditMode={cornerEditMode}
          activeCorner={activeCorner}
          bindings={bindings}
        />
      </div>

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-40 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[rgba(4,12,25,0.6)] px-3 py-1 text-[11px] font-medium tracking-wide text-[#d8e7ff]">
          {photoFrozen
            ? "Режим фото основы"
            : cameraStatus === "ready"
              ? "Камера активна"
              : statusLabel(cameraStatus)}
        </span>
        <span className="rounded-full bg-[rgba(4,12,25,0.6)] px-3 py-1 text-[11px] font-semibold text-[#f7f9ff]">
          {template.name}
        </span>
      </div>

      <div className="absolute left-3 right-3 top-12 z-40 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-3 py-2 text-xs font-semibold text-white shadow ${
            beforeMode ? "bg-[#1f4f7f]" : "bg-[rgba(8,22,43,0.78)]"
          }`}
          onClick={onToggleBeforeAfter}
        >
          {beforeMode ? "Режим: До" : "Режим: После"}
        </button>

        <button
          type="button"
          className={`rounded-full px-3 py-2 text-xs font-semibold text-white shadow ${
            cornerEditMode ? "bg-[#c57f24]" : "bg-[rgba(8,22,43,0.78)]"
          }`}
          onClick={onToggleCornerMode}
        >
          {cornerEditMode ? "Углы: ВКЛ" : "Углы: ВЫКЛ"}
        </button>

        {assistedDetectionEnabled ? (
          <button
            type="button"
            className="rounded-full bg-[rgba(8,22,43,0.78)] px-3 py-2 text-xs font-semibold text-white shadow disabled:opacity-60"
            disabled={isAutoAligning || cameraStatus !== "ready"}
            onClick={onAutoAlign}
          >
            {isAutoAligning ? "Поиск проема..." : "Автовыравнивание"}
          </button>
        ) : null}

        {photoFrozen ? (
          <button
            type="button"
            className="rounded-full bg-[rgba(197,127,36,0.95)] px-3 py-2 text-xs font-semibold text-white shadow"
            onClick={onClearBasePhoto}
          >
            Переснять фото
          </button>
        ) : null}
      </div>

      {needsButton ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[rgba(5,14,27,0.72)] px-6 text-center">
          <p className="mb-3 text-sm leading-6 text-[#d8e6fa]">
            {cameraError ||
              "Разрешите доступ к камере, чтобы наложить ПВХ окно или дверь на текущий проем."}
          </p>
          {cameraStatus !== "unsupported" ? (
            <button
              type="button"
              className="rounded-2xl bg-[#55a2ff] px-5 py-3 text-sm font-semibold text-[#0a1a30]"
              onClick={onEnableCamera}
            >
              Включить камеру
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
