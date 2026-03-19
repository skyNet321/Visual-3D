"use client";

import { useState } from "react";
import type { ColorPreset } from "@/types/colors";
import type { InlineOpeningMode } from "@/types/openingPreview";
import type { ProductCategory, ProductTemplate } from "@/types/products";

export type LeadActionType = "offer" | "measurement" | "inquiry";

interface CategoryOption {
  id: ProductCategory;
  label: string;
}

interface BottomToolbarProps {
  categories: readonly CategoryOption[];
  selectedCategory: ProductCategory;
  onCategoryChange: (category: ProductCategory) => void;
  templates: ProductTemplate[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  colors: ColorPreset[];
  selectedColorId: string;
  onColorChange: (colorId: string) => void;
  onCaptureBasePhoto: () => void;
  basePhotoActive: boolean;
  onClearBasePhoto: () => void;
  onCapture: () => void;
  captureBaseDisabled: boolean;
  captureResultDisabled: boolean;
  onOpen3D: () => void;
  onResetPlacement: () => void;
  openingPreviewEnabled: boolean;
  onToggleOpeningPreview: () => void;
  openingMode: InlineOpeningMode;
  onOpeningModeChange: (mode: InlineOpeningMode) => void;
  openingPanels: number;
  maxOpeningPanels: number;
  onOpeningPanelsChange: (value: number) => void;
  openingProgress: number;
  onOpeningProgressChange: (value: number) => void;
  onLeadAction: (action: LeadActionType) => void;
  hasPreview: boolean;
  onShareWeb: () => void;
  onShareWhatsApp: () => void;
  onShareEmail: () => void;
}

const OPENING_MODE_OPTIONS: Array<{ id: InlineOpeningMode; label: string }> = [
  { id: "side", label: "Поворот" },
  { id: "tilt", label: "Откид" },
  { id: "slide", label: "Раздвиж" },
  { id: "double", label: "Двухстворч." },
];

export function BottomToolbar({
  categories,
  selectedCategory,
  onCategoryChange,
  templates,
  selectedTemplateId,
  onTemplateChange,
  colors,
  selectedColorId,
  onColorChange,
  onCaptureBasePhoto,
  basePhotoActive,
  onClearBasePhoto,
  onCapture,
  captureBaseDisabled,
  captureResultDisabled,
  onOpen3D,
  onResetPlacement,
  openingPreviewEnabled,
  onToggleOpeningPreview,
  openingMode,
  onOpeningModeChange,
  openingPanels,
  maxOpeningPanels,
  onOpeningPanelsChange,
  openingProgress,
  onOpeningProgressChange,
  onLeadAction,
  hasPreview,
  onShareWeb,
  onShareWhatsApp,
  onShareEmail,
}: BottomToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative z-50 mt-auto rounded-t-[30px] border border-[#d5e5f6] bg-[linear-gradient(180deg,rgba(8,20,37,0.9)_0%,rgba(10,25,45,0.96)_100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2 shadow-[0_-18px_45px_rgba(0,0,0,0.42)] backdrop-blur-md">
      <button
        type="button"
        className="mx-auto mb-2 block h-1.5 w-14 rounded-full bg-[rgba(189,214,240,0.75)]"
        onClick={() => setExpanded((previous) => !previous)}
        aria-label="Переключить расширенные настройки"
      />

      <div className="mb-3 grid grid-cols-3 items-center gap-2">
        <button
          type="button"
          className="rounded-xl border border-[rgba(145,175,210,0.65)] bg-[rgba(17,43,76,0.9)] px-2 py-3 text-xs font-semibold text-[#e4efff] disabled:opacity-55"
          disabled={captureBaseDisabled}
          onClick={onCaptureBasePhoto}
        >
          Фото основы
        </button>

        <button
          type="button"
          className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 border-[rgba(229,241,255,0.95)] bg-[#3e89d5] text-[11px] font-bold tracking-wide text-white shadow-[0_0_20px_rgba(69,155,241,0.55)] disabled:opacity-60"
          disabled={captureResultDisabled}
          onClick={onCapture}
        >
          Снять
        </button>

        <button
          type="button"
          className="rounded-xl border border-[rgba(145,175,210,0.65)] bg-[rgba(17,43,76,0.9)] px-2 py-3 text-xs font-semibold text-[#e4efff]"
          onClick={onOpen3D}
        >
          3D модалка
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-[rgba(132,162,194,0.7)] bg-[rgba(17,43,76,0.78)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#d8e8fb]"
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? "Свернуть" : "Настройки"}
        </button>

        <button
          type="button"
          className="rounded-lg border border-[rgba(132,162,194,0.7)] bg-[rgba(17,43,76,0.78)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#d8e8fb]"
          onClick={onResetPlacement}
        >
          Сброс позиции
        </button>
      </div>

      {basePhotoActive ? (
        <button
          type="button"
          className="mb-2 w-full rounded-xl border border-[#b89764] bg-[#ffedcb] px-3 py-2 text-xs font-semibold text-[#7a4f1d]"
          onClick={onClearBasePhoto}
        >
          Удалить фото основы
        </button>
      ) : null}

      {expanded ? (
        <div className="space-y-3 rounded-2xl border border-[rgba(148,183,221,0.4)] bg-[rgba(11,30,53,0.72)] p-3">
          <div className="rounded-xl border border-[rgba(128,161,196,0.5)] bg-[rgba(18,42,73,0.65)] p-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ebee2]">
                3D эффект на фото
              </p>
              <button
                type="button"
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                  openingPreviewEnabled
                    ? "bg-[#4f8dcb] text-white"
                    : "bg-[rgba(26,58,95,0.9)] text-[#c7daf1]"
                }`}
                onClick={onToggleOpeningPreview}
              >
                {openingPreviewEnabled ? "ВКЛ" : "ВЫКЛ"}
              </button>
            </div>

            <div className="mb-2 grid grid-cols-4 gap-1">
              {OPENING_MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                    openingMode === option.id
                      ? "bg-[#4f8dcb] text-white"
                      : "bg-[rgba(22,56,95,0.88)] text-[#c7daf1]"
                  }`}
                  onClick={() => onOpeningModeChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9ebee2]">
              Количество открываний: {Math.min(openingPanels, maxOpeningPanels)}
              <input
                type="range"
                min={1}
                max={Math.max(1, maxOpeningPanels)}
                value={Math.min(openingPanels, maxOpeningPanels)}
                onChange={(event) => onOpeningPanelsChange(Number(event.target.value))}
                className="mt-1 h-2 w-full accent-[#4f8dcb]"
              />
            </label>

            <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9ebee2]">
              Степень открытия: {Math.round(openingProgress * 100)}%
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(openingProgress * 100)}
                onChange={(event) => onOpeningProgressChange(Number(event.target.value) / 100)}
                className="mt-1 h-2 w-full accent-[#4f8dcb]"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ebee2]">
              Категория
            </p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    selectedCategory === category.id
                      ? "bg-[#4f8dcb] text-white"
                      : "bg-[rgba(22,56,95,0.88)] text-[#c7daf1]"
                  }`}
                  onClick={() => onCategoryChange(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ebee2]">
              Модель
            </p>
            <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${
                    selectedTemplateId === template.id
                      ? "bg-[#4f8dcb] text-white"
                      : "bg-[rgba(22,56,95,0.88)] text-[#c7daf1]"
                  }`}
                  onClick={() => onTemplateChange(template.id)}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9ebee2]">
              Цвет
            </p>
            <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
              {colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`min-w-[92px] rounded-xl border px-2 py-2 text-xs font-semibold ${
                    selectedColorId === color.id
                      ? "border-[#7eb3eb] bg-[#295f95] text-white"
                      : "border-[rgba(128,161,196,0.62)] bg-[rgba(22,56,95,0.88)] text-[#c7daf1]"
                  }`}
                  onClick={() => onColorChange(color.id)}
                >
                  <span
                    className="mb-1 block h-5 w-full rounded-md border border-[rgba(0,0,0,0.2)]"
                    style={{
                      background: `linear-gradient(125deg, ${color.hex} 0%, ${color.accentHex} 75%)`,
                    }}
                  />
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#1f7f64] px-2 py-2 text-xs font-semibold text-white"
              onClick={() => onLeadAction("offer")}
            >
              Оффер
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#1f7f64] px-2 py-2 text-xs font-semibold text-white"
              onClick={() => onLeadAction("measurement")}
            >
              Замер
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#1f7f64] px-2 py-2 text-xs font-semibold text-white"
              onClick={() => onLeadAction("inquiry")}
            >
              Запрос
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="rounded-lg border border-[rgba(126,168,209,0.75)] bg-[rgba(17,43,76,0.88)] px-2 py-2 text-xs font-semibold text-[#d7e8fb] disabled:opacity-40"
              disabled={!hasPreview}
              onClick={onShareWeb}
            >
              Share
            </button>
            <button
              type="button"
              className="rounded-lg border border-[rgba(126,168,209,0.75)] bg-[rgba(17,43,76,0.88)] px-2 py-2 text-xs font-semibold text-[#d7e8fb] disabled:opacity-40"
              disabled={!hasPreview}
              onClick={onShareWhatsApp}
            >
              WhatsApp
            </button>
            <button
              type="button"
              className="rounded-lg border border-[rgba(126,168,209,0.75)] bg-[rgba(17,43,76,0.88)] px-2 py-2 text-xs font-semibold text-[#d7e8fb] disabled:opacity-40"
              disabled={!hasPreview}
              onClick={onShareEmail}
            >
              Email
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
