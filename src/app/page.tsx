"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CameraStage } from "@/components/camera/CameraStage";
import {
  BottomToolbar,
  type LeadActionType,
} from "@/components/controls/BottomToolbar";
import { LeadFormSheet } from "@/components/lead/LeadFormSheet";
import { Opening3DModal } from "@/components/three/Opening3DModal";
import { useCamera } from "@/hooks/useCamera";
import { useEnvironmentLight } from "@/hooks/useEnvironmentLight";
import { useIsMobileDevice } from "@/hooks/useIsMobileDevice";
import { useLeadSubmission } from "@/hooks/useLeadSubmission";
import { useOverlayEditor } from "@/hooks/useOverlayEditor";
import { FEATURES } from "@/lib/config/features";
import { COLOR_PRESETS, getColorPreset } from "@/lib/data/colorPresets";
import {
  getTemplateById,
  getTemplatesByCategory,
  PRODUCT_CATEGORIES,
} from "@/lib/data/productTemplates";
import { suggestOpeningQuad } from "@/lib/vision/assistedDetection";
import { captureCompositePreview, captureStillFromVideo } from "@/lib/utils/capture";
import { aspectRatioFromTemplateSize, createCenteredQuad } from "@/lib/utils/geometry";
import {
  buildEmailShareUrl,
  buildWhatsAppShareUrl,
  sharePreviewWithWebShare,
} from "@/lib/utils/share";
import { savePreviewLocally } from "@/lib/utils/storage";
import type { LeadPayload } from "@/types/leads";
import type { OpeningPreviewState, InlineOpeningMode } from "@/types/openingPreview";
import type { ProductCategory, ProductTemplate } from "@/types/products";
import type { Quad } from "@/types/geometry";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "PVC Visual Configurator AR";

interface ViewportSize {
  width: number;
  height: number;
}

function quadBounds(quad: Quad) {
  const xs = quad.map((point) => point.x);
  const ys = quad.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function isQuadMostlyVisible(quad: Quad, viewport: ViewportSize) {
  if (!viewport.width || !viewport.height) {
    return false;
  }

  const bounds = quadBounds(quad);
  const quadWidth = Math.max(1, bounds.maxX - bounds.minX);
  const quadHeight = Math.max(1, bounds.maxY - bounds.minY);

  const overlapX = Math.max(
    0,
    Math.min(bounds.maxX, viewport.width) - Math.max(bounds.minX, 0),
  );
  const overlapY = Math.max(
    0,
    Math.min(bounds.maxY, viewport.height) - Math.max(bounds.minY, 0),
  );

  const visibilityRatio = (overlapX * overlapY) / (quadWidth * quadHeight);
  return visibilityRatio >= 0.3;
}

function defaultOpeningMode(template: ProductTemplate): InlineOpeningMode {
  if (template.openingStyle === "tilt-and-turn") {
    return "tilt";
  }

  if (template.openingStyle === "sliding-window" || template.openingStyle === "sliding-door") {
    return "slide";
  }

  if (template.openingStyle === "double-door-opening") {
    return "double";
  }

  return "side";
}

async function waitForVideoFrame(video: HTMLVideoElement, timeoutMs = 1800) {
  if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const done = (value: boolean) => {
      if (resolved) {
        return;
      }
      resolved = true;
      cleanup();
      resolve(value);
    };

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        done(true);
      }
    };

    const timer = window.setTimeout(() => done(false), timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("playing", onReady);
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", onReady);
  });
}

export default function HomePage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isMobile = useIsMobileDevice();
  const [allowDesktopPreview] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return new URLSearchParams(window.location.search).get("desktop") === "1";
  });

  const { videoRef, status: cameraStatus, error: cameraError, startCamera } = useCamera();
  const [basePhotoDataUrl, setBasePhotoDataUrl] = useState<string | null>(null);
  const environmentLight = useEnvironmentLight({
    videoRef,
    basePhotoDataUrl,
    enabled: cameraStatus === "ready" || Boolean(basePhotoDataUrl),
  });
  const { state: leadState, error: leadError, submitLead } = useLeadSubmission();

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("windows");
  const [selectedTemplateId, setSelectedTemplateId] = useState("window-single-sash");
  const [selectedColorId, setSelectedColorId] = useState("anthracite");

  const [quad, setQuad] = useState<Quad | null>(null);
  const [cornerEditMode, setCornerEditMode] = useState(false);
  const [beforeMode, setBeforeMode] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });

  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [openingPreviewEnabled, setOpeningPreviewEnabled] = useState(false);
  const [openingMode, setOpeningMode] = useState<InlineOpeningMode>("side");
  const [openingPanels, setOpeningPanels] = useState(1);
  const [openingProgress, setOpeningProgress] = useState(0.65);

  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadActionType, setLeadActionType] = useState<LeadActionType>("offer");
  const [show3DModal, setShow3DModal] = useState(false);

  const [aligning, setAligning] = useState(false);

  const templates = useMemo(
    () => getTemplatesByCategory(selectedCategory),
    [selectedCategory],
  );

  const selectedTemplate = useMemo(() => {
    return getTemplateById(selectedTemplateId) ?? templates[0];
  }, [selectedTemplateId, templates]);

  const selectedColor = useMemo(
    () => getColorPreset(selectedColorId),
    [selectedColorId],
  );

  const maxOpeningPanels = useMemo(() => {
    const count = selectedTemplate.panelLayout.filter((panel) => panel.kind !== "fixed").length;
    return Math.max(1, count);
  }, [selectedTemplate]);

  const openingPreviewState = useMemo<OpeningPreviewState>(() => {
    return {
      enabled: openingPreviewEnabled,
      mode: openingMode,
      progress: openingProgress,
      openingPanels: Math.min(Math.max(openingPanels, 1), maxOpeningPanels),
    };
  }, [openingPreviewEnabled, openingMode, openingProgress, openingPanels, maxOpeningPanels]);

  const activeQuad = useMemo(() => {
    if (quad) {
      return quad;
    }

    if (!selectedTemplate || !viewport.width || !viewport.height) {
      return null;
    }

    const ratio = aspectRatioFromTemplateSize(
      selectedTemplate.defaultProportions.width,
      selectedTemplate.defaultProportions.height,
    );

    return createCenteredQuad(viewport, ratio);
  }, [quad, selectedTemplate, viewport]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return;
    }

    const update = () => {
      setViewport({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!infoMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setInfoMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [infoMessage]);

  const { activeCorner, bindings } = useOverlayEditor({
    quad: activeQuad,
    onQuadChange: setQuad,
    cornerEditMode,
    viewport: {
      width: viewport.width || 1,
      height: viewport.height || 1,
    },
  });

  const centerOverlay = () => {
    if (!viewport.width || !viewport.height) {
      return;
    }

    const ratio = aspectRatioFromTemplateSize(
      selectedTemplate.defaultProportions.width,
      selectedTemplate.defaultProportions.height,
    );

    setQuad(createCenteredQuad(viewport, ratio));
    setInfoMessage("Позиция оверлея сброшена.");
  };

  const centerOverlayForTemplate = (template: ProductTemplate) => {
    if (!viewport.width || !viewport.height) {
      return;
    }

    const ratio = aspectRatioFromTemplateSize(
      template.defaultProportions.width,
      template.defaultProportions.height,
    );

    setQuad(createCenteredQuad(viewport, ratio));
  };

  const handleAutoAlign = async () => {
    if (!videoRef.current || !viewport.width || !viewport.height) {
      return;
    }

    const ratio = aspectRatioFromTemplateSize(
      selectedTemplate.defaultProportions.width,
      selectedTemplate.defaultProportions.height,
    );

    setAligning(true);
    await new Promise((resolve) => window.setTimeout(resolve, 30));

    const detection = suggestOpeningQuad({
      video: videoRef.current,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      expectedAspectRatio: ratio,
    });

    setQuad(detection.quad);
    setAligning(false);

    if (detection.method === "edge") {
      setInfoMessage("Проем найден автоматически. Подправьте углы при необходимости.");
    } else {
      setInfoMessage("Автодетекция не точна. Используйте ручную коррекцию.");
    }
  };

  const handleCaptureBasePhoto = async () => {
    if (!videoRef.current) {
      setInfoMessage("Сначала включите камеру.");
      return;
    }

    const ready = await waitForVideoFrame(videoRef.current);
    if (!ready) {
      setInfoMessage("Камера еще не готова. Подождите 1-2 секунды и повторите.");
      return;
    }

    const still = captureStillFromVideo(videoRef.current);

    if (!still) {
      setInfoMessage("Не удалось сделать фото. Повторите попытку.");
      return;
    }

    setBasePhotoDataUrl(still);
    centerOverlayForTemplate(selectedTemplate);
    setBeforeMode(false);
    setInfoMessage("Фото основы сохранено. Наложите новую конструкцию сверху.");
  };

  const handleClearBasePhoto = () => {
    setBasePhotoDataUrl(null);
    setInfoMessage("Возврат к live-камере выполнен.");
  };

  const handleCapture = async () => {
    if (!overlayCanvasRef.current || !selectedTemplate || !activeQuad) {
      return;
    }

    if (!videoRef.current && !basePhotoDataUrl) {
      setInfoMessage("Нет источника изображения для сохранения результата.");
      return;
    }

    if (beforeMode) {
      setBeforeMode(false);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }

    try {
      const preview = await captureCompositePreview({
        videoElement: videoRef.current,
        overlayCanvas: overlayCanvasRef.current,
        template: selectedTemplate,
        color: selectedColor,
        companyName: COMPANY_NAME,
        backgroundDataUrl: basePhotoDataUrl,
      });

      setCapturedPreview(preview);

      savePreviewLocally({
        id: crypto.randomUUID(),
        dataUrl: preview,
        modelName: selectedTemplate.name,
        colorName: selectedColor.name,
        createdAt: new Date().toISOString(),
      });

      setInfoMessage("Результат сохранен. Можно отправить заявку или поделиться.");
    } catch {
      setInfoMessage("Не удалось сохранить снимок. Попробуйте еще раз.");
    }
  };

  const handleShareWeb = async () => {
    if (!capturedPreview || !selectedTemplate) {
      return;
    }

    const shared = await sharePreviewWithWebShare(capturedPreview, selectedTemplate.name);

    if (!shared) {
      setInfoMessage("Web Share недоступен. Используйте WhatsApp или Email.");
    }
  };

  const handleShareWhatsApp = () => {
    if (!capturedPreview || !selectedTemplate) {
      return;
    }

    const url = buildWhatsAppShareUrl(selectedTemplate.name, selectedColor.name);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareEmail = () => {
    if (!capturedPreview || !selectedTemplate) {
      return;
    }

    window.location.href = buildEmailShareUrl(selectedTemplate.name, selectedColor.name);
  };

  const openLeadForm = (action: LeadActionType) => {
    setLeadActionType(action);
    setLeadFormOpen(true);
  };

  const handleLeadSubmit = async (payload: LeadPayload) => {
    const result = await submitLead(payload);

    if (result.ok) {
      setLeadFormOpen(false);
      setInfoMessage("Заявка отправлена. Менеджер свяжется с вами в ближайшее время.");
    }
  };

  if (!isMobile && !allowDesktopPreview) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,#e8f2ff_0%,#d8e8fa_40%,#d2e3f7_100%)] p-6 text-[#16395f]">
        <div className="max-w-md rounded-3xl border border-[#bad2eb] bg-white p-6 shadow-[0_24px_56px_rgba(10,35,64,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d8fb3]">
            Только мобильный режим
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#123a66]">PVC Visual Configurator AR</h1>
          <p className="mt-3 text-sm leading-6 text-[#345c86]">
            Этот интерфейс оптимизирован как камера-приложение для смартфона.
            Откройте ссылку на телефоне для корректного AR‑предпросмотра.
          </p>
          <p className="mt-3 rounded-xl bg-[#edf5ff] px-3 py-2 text-xs text-[#446992]">
            Для теста на ПК можно добавить к URL параметр: <b>?desktop=1</b>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#020a14] text-white">
      <CameraStage
        stageRef={stageRef}
        videoRef={videoRef}
        overlayCanvasRef={overlayCanvasRef}
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        onEnableCamera={startCamera}
        template={selectedTemplate}
        color={selectedColor}
        quad={activeQuad}
        environmentLight={environmentLight}
        openingPreview={openingPreviewState}
        showOverlay
        overlayOpacity={beforeMode ? 0.14 : 0.95}
        cornerEditMode={cornerEditMode}
        activeCorner={activeCorner}
        bindings={bindings}
        beforeMode={beforeMode}
        onToggleBeforeAfter={() => setBeforeMode((previous) => !previous)}
        onToggleCornerMode={() => setCornerEditMode((previous) => !previous)}
        onAutoAlign={handleAutoAlign}
        assistedDetectionEnabled={FEATURES.assistedDetection}
        isAutoAligning={aligning}
        basePhotoDataUrl={basePhotoDataUrl}
        onClearBasePhoto={handleClearBasePhoto}
        fullscreen
      />

      {capturedPreview ? (
        <button
          type="button"
          className="absolute right-3 top-[76px] z-[80] overflow-hidden rounded-xl border border-[rgba(191,216,242,0.65)] shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
          onClick={() => setInfoMessage("Последний сохраненный кадр готов к отправке.")}
          aria-label="Последний снимок"
        >
          <Image
            src={capturedPreview}
            alt="Сохраненный предпросмотр"
            width={112}
            height={84}
            unoptimized
            className="h-[76px] w-[112px] object-cover"
          />
        </button>
      ) : null}

      {infoMessage ? (
        <div className="pointer-events-none absolute left-1/2 top-[94px] z-[80] w-[92vw] max-w-[420px] -translate-x-1/2 rounded-xl border border-[rgba(182,212,242,0.72)] bg-[rgba(10,30,53,0.76)] px-3 py-2 text-center text-sm text-[#e1efff] shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
          {infoMessage}
        </div>
      ) : null}

      <div className="absolute bottom-0 left-0 right-0 z-[90]">
        <BottomToolbar
          categories={PRODUCT_CATEGORIES}
          selectedCategory={selectedCategory}
          onCategoryChange={(category) => {
            setSelectedCategory(category);
            const nextTemplates = getTemplatesByCategory(category);
            const nextTemplate = nextTemplates[0] ?? selectedTemplate;
            if (!nextTemplates.some((template) => template.id === selectedTemplate.id)) {
              setSelectedTemplateId(nextTemplate.id);
            }
            setOpeningMode(defaultOpeningMode(nextTemplate));
            setQuad((previous) => {
              if (previous && isQuadMostlyVisible(previous, viewport)) {
                return previous;
              }

              if (!viewport.width || !viewport.height) {
                return previous;
              }

              const ratio = aspectRatioFromTemplateSize(
                nextTemplate.defaultProportions.width,
                nextTemplate.defaultProportions.height,
              );
              return createCenteredQuad(viewport, ratio);
            });
          }}
          templates={templates}
          selectedTemplateId={selectedTemplate.id}
          onTemplateChange={(templateId) => {
            setSelectedTemplateId(templateId);
            const nextTemplate = getTemplateById(templateId) ?? selectedTemplate;
            setOpeningMode(defaultOpeningMode(nextTemplate));
            setQuad((previous) => {
              if (previous && isQuadMostlyVisible(previous, viewport)) {
                return previous;
              }

              if (!viewport.width || !viewport.height) {
                return previous;
              }

              const ratio = aspectRatioFromTemplateSize(
                nextTemplate.defaultProportions.width,
                nextTemplate.defaultProportions.height,
              );
              return createCenteredQuad(viewport, ratio);
            });
          }}
          colors={COLOR_PRESETS}
          selectedColorId={selectedColor.id}
          onColorChange={(colorId) => setSelectedColorId(colorId)}
          onCaptureBasePhoto={handleCaptureBasePhoto}
          basePhotoActive={Boolean(basePhotoDataUrl)}
          onClearBasePhoto={handleClearBasePhoto}
          onCapture={handleCapture}
          captureBaseDisabled={false}
          captureResultDisabled={false}
          onOpen3D={() => setShow3DModal(true)}
          onResetPlacement={centerOverlay}
          openingPreviewEnabled={openingPreviewEnabled}
          onToggleOpeningPreview={() => setOpeningPreviewEnabled((previous) => !previous)}
          openingMode={openingMode}
          onOpeningModeChange={setOpeningMode}
          openingPanels={openingPanels}
          maxOpeningPanels={maxOpeningPanels}
          onOpeningPanelsChange={setOpeningPanels}
          openingProgress={openingProgress}
          onOpeningProgressChange={setOpeningProgress}
          onLeadAction={openLeadForm}
          hasPreview={Boolean(capturedPreview)}
          onShareWeb={handleShareWeb}
          onShareWhatsApp={handleShareWhatsApp}
          onShareEmail={handleShareEmail}
        />
      </div>

      <LeadFormSheet
        open={leadFormOpen}
        onClose={() => setLeadFormOpen(false)}
        onSubmit={handleLeadSubmit}
        isSubmitting={leadState === "submitting"}
        submitError={leadState === "error" ? leadError : null}
        defaults={{
          category: selectedCategory,
          modelId: selectedTemplate.id,
          modelName: selectedTemplate.name,
          colorId: selectedColor.id,
          colorName: selectedColor.name,
          previewDataUrl: capturedPreview || undefined,
          ctaType: leadActionType,
        }}
      />

      <Opening3DModal
        open={show3DModal}
        onClose={() => setShow3DModal(false)}
        template={selectedTemplate}
        color={selectedColor}
      />
    </main>
  );
}
