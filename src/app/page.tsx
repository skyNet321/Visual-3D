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
import type { ProductCategory } from "@/types/products";
import type { Quad } from "@/types/geometry";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "PVC Visual Configurator AR";

interface ViewportSize {
  width: number;
  height: number;
}

export default function HomePage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { videoRef, status: cameraStatus, error: cameraError, startCamera } = useCamera();
  const { state: leadState, error: leadError, submitLead } = useLeadSubmission();

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("windows");
  const [selectedTemplateId, setSelectedTemplateId] = useState("window-single-sash");
  const [selectedColorId, setSelectedColorId] = useState("white");

  const [quad, setQuad] = useState<Quad | null>(null);
  const [cornerEditMode, setCornerEditMode] = useState(false);
  const [beforeMode, setBeforeMode] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });

  const [basePhotoDataUrl, setBasePhotoDataUrl] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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

    const timeout = window.setTimeout(() => setInfoMessage(null), 3600);
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

  const handleAutoAlign = async () => {
    if (!videoRef.current || !viewport.width || !viewport.height) {
      return;
    }

    const ratio = aspectRatioFromTemplateSize(
      selectedTemplate.defaultProportions.width,
      selectedTemplate.defaultProportions.height,
    );

    setAligning(true);
    await new Promise((resolve) => window.setTimeout(resolve, 32));

    const detection = suggestOpeningQuad({
      video: videoRef.current,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      expectedAspectRatio: ratio,
    });

    setQuad(detection.quad);
    setAligning(false);

    if (detection.method === "edge") {
      setInfoMessage("Проем найден автоматически. При необходимости подправьте углы.");
    } else {
      setInfoMessage("Не удалось точно определить проем. Выставлена безопасная позиция.");
    }
  };

  const handleCaptureBasePhoto = () => {
    if (!videoRef.current) {
      setInfoMessage("Сначала включите камеру.");
      return;
    }

    const still = captureStillFromVideo(videoRef.current);

    if (!still) {
      setInfoMessage("Не удалось сделать фото. Повторите попытку.");
      return;
    }

    setBasePhotoDataUrl(still);
    setInfoMessage("Фото основы сохранено. Теперь можно точно подогнать новое окно/дверь.");
  };

  const handleClearBasePhoto = () => {
    setBasePhotoDataUrl(null);
    setInfoMessage("Режим фото основы отключен. Снова используется live-камера.");
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

    setInfoMessage("Снимок сохранен. Можно отправить заявку или поделиться.");
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-[radial-gradient(circle_at_top,#d6e7fb_0%,#edf4fc_34%,#f7fbff_100%)] px-3 pb-4 pt-3 text-[#0f2a47]">
      <header className="mb-3 rounded-[24px] border border-[#d2e3f4] bg-white/92 p-4 shadow-[0_12px_30px_rgba(14,38,65,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f7ea2]">
          Мобильный AR‑конфигуратор
        </p>
        <h1 className="mt-1 text-xl font-semibold leading-tight text-[#0f2f54]">
          PVC Visual Configurator AR
        </h1>
        <p className="mt-2 text-sm text-[#3a587b]">
          Наведите камеру на старое окно или дверь, либо сделайте фото основы,
          затем наложите ПВХ модель с реалистичным предпросмотром.
        </p>
      </header>

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
        showOverlay={!beforeMode}
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
      />

      {capturedPreview ? (
        <section className="mt-3 rounded-2xl border border-[#c9dced] bg-white p-3 shadow-[0_8px_20px_rgba(13,37,64,0.1)]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.11em] text-[#607da0]">
            Последний снимок
          </p>
          <Image
            src={capturedPreview}
            alt="Сохраненный предпросмотр"
            width={1000}
            height={560}
            unoptimized
            className="h-[160px] w-full rounded-xl object-cover"
          />
        </section>
      ) : null}

      {infoMessage ? (
        <div className="mt-3 rounded-xl border border-[#c7dcf2] bg-[#eff7ff] px-3 py-2 text-sm font-medium text-[#2e5278]">
          {infoMessage}
        </div>
      ) : null}

      <BottomToolbar
        categories={PRODUCT_CATEGORIES}
        selectedCategory={selectedCategory}
        onCategoryChange={(category) => {
          setSelectedCategory(category);
          const nextTemplates = getTemplatesByCategory(category);
          if (!nextTemplates.some((template) => template.id === selectedTemplate.id)) {
            setSelectedTemplateId(nextTemplates[0]?.id ?? selectedTemplate.id);
          }
        }}
        templates={templates}
        selectedTemplateId={selectedTemplate.id}
        onTemplateChange={(templateId) => setSelectedTemplateId(templateId)}
        colors={COLOR_PRESETS}
        selectedColorId={selectedColor.id}
        onColorChange={(colorId) => setSelectedColorId(colorId)}
        onCaptureBasePhoto={handleCaptureBasePhoto}
        basePhotoActive={Boolean(basePhotoDataUrl)}
        onClearBasePhoto={handleClearBasePhoto}
        onCapture={handleCapture}
        captureBaseDisabled={cameraStatus !== "ready"}
        captureResultDisabled={cameraStatus !== "ready" && !basePhotoDataUrl}
        onOpen3D={() => setShow3DModal(true)}
        onResetPlacement={centerOverlay}
        onLeadAction={openLeadForm}
        hasPreview={Boolean(capturedPreview)}
        onShareWeb={handleShareWeb}
        onShareWhatsApp={handleShareWhatsApp}
        onShareEmail={handleShareEmail}
      />

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
