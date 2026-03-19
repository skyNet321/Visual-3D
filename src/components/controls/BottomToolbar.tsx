"use client";

import type { ColorPreset } from "@/types/colors";
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
  onLeadAction: (action: LeadActionType) => void;
  hasPreview: boolean;
  onShareWeb: () => void;
  onShareWhatsApp: () => void;
  onShareEmail: () => void;
}

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
  onLeadAction,
  hasPreview,
  onShareWeb,
  onShareWhatsApp,
  onShareEmail,
}: BottomToolbarProps) {
  return (
    <section className="relative z-50 mt-4 rounded-[28px] border border-[#d3e1f2] bg-[linear-gradient(180deg,#f6fbff_0%,#ebf4ff_100%)] p-4 shadow-[0_22px_44px_rgba(7,29,55,0.18)]">
      <div className="mb-3 flex rounded-2xl bg-[#dce9f8] p-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              selectedCategory === category.id
                ? "bg-white text-[#123359] shadow"
                : "text-[#3b5b7f]"
            }`}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f7d9f]">
          Модель
        </p>
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                selectedTemplateId === template.id
                  ? "bg-[#1d5c98] text-white"
                  : "bg-white text-[#2d4665]"
              }`}
              onClick={() => onTemplateChange(template.id)}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f7d9f]">
          Цвет профиля
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`min-w-[90px] rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                selectedColorId === color.id
                  ? "border-[#1d5c98] bg-[#edf5ff] text-[#12365e]"
                  : "border-[#c9d9eb] bg-white text-[#334f72]"
              }`}
              onClick={() => onColorChange(color.id)}
            >
              <span
                className="mb-1 block h-5 w-full rounded-md border border-[rgba(0,0,0,0.15)]"
                style={{
                  background: `linear-gradient(125deg, ${color.hex} 0%, ${color.accentHex} 75%)`,
                }}
              />
              {color.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl bg-[#335f87] px-3 py-3 text-xs font-semibold text-white disabled:opacity-60"
          disabled={captureBaseDisabled}
          onClick={onCaptureBasePhoto}
        >
          Фото основы
        </button>
        <button
          type="button"
          className="rounded-xl bg-[#1f74c5] px-3 py-3 text-xs font-semibold text-white disabled:opacity-60"
          disabled={captureResultDisabled}
          onClick={onCapture}
        >
          Снять результат
        </button>
        <button
          type="button"
          className="rounded-xl bg-[#0f3c64] px-3 py-3 text-xs font-semibold text-white"
          onClick={onOpen3D}
        >
          Открыть в 3D
        </button>
        <button
          type="button"
          className="rounded-xl bg-[#355d84] px-3 py-3 text-xs font-semibold text-white"
          onClick={onResetPlacement}
        >
          Сброс позиции
        </button>
      </div>

      {basePhotoActive ? (
        <button
          type="button"
          className="mb-3 w-full rounded-xl border border-[#d4c097] bg-[#fff8eb] px-3 py-2 text-xs font-semibold text-[#87581e]"
          onClick={onClearBasePhoto}
        >
          Удалить фото основы и вернуться к live-камере
        </button>
      ) : null}

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          className="rounded-xl bg-[#0d6b55] px-3 py-3 text-sm font-semibold text-white"
          onClick={() => onLeadAction("offer")}
        >
          Запросить оффер
        </button>
        <button
          type="button"
          className="rounded-xl bg-[#1c7f5f] px-3 py-3 text-sm font-semibold text-white"
          onClick={() => onLeadAction("measurement")}
        >
          Записаться на замер
        </button>
        <button
          type="button"
          className="rounded-xl bg-[#2f915f] px-3 py-3 text-sm font-semibold text-white"
          onClick={() => onLeadAction("inquiry")}
        >
          Отправить запрос
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="rounded-lg border border-[#bfd2e7] bg-white px-3 py-2 text-xs font-semibold text-[#355a82] disabled:opacity-45"
          disabled={!hasPreview}
          onClick={onShareWeb}
        >
          Поделиться
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#bfd2e7] bg-white px-3 py-2 text-xs font-semibold text-[#355a82] disabled:opacity-45"
          disabled={!hasPreview}
          onClick={onShareWhatsApp}
        >
          WhatsApp
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#bfd2e7] bg-white px-3 py-2 text-xs font-semibold text-[#355a82] disabled:opacity-45"
          disabled={!hasPreview}
          onClick={onShareEmail}
        >
          Email
        </button>
      </div>
    </section>
  );
}
