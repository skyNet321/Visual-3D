"use client";

import { useState } from "react";
import type { ProductCategory } from "@/types/products";
import type { LeadPayload } from "@/types/leads";

interface LeadFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Omit<LeadPayload, "fullName" | "phone" | "city" | "message"> & {
    fullName: string;
    phone: string;
    city: string;
    message?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  defaults: {
    category: ProductCategory;
    modelId: string;
    modelName: string;
    colorId: string;
    colorName: string;
    previewDataUrl?: string;
    ctaType?: string;
  };
}

function categoryLabel(category: ProductCategory) {
  return category === "windows" ? "ПВХ окна" : "ПВХ двери";
}

function ctaDefaultMessage(ctaType?: string) {
  if (ctaType === "offer") {
    return "Нужен расчет и коммерческое предложение.";
  }

  if (ctaType === "measurement") {
    return "Хочу записаться на замер в удобное время.";
  }

  if (ctaType === "inquiry") {
    return "Прошу консультацию по выбранной модели.";
  }

  return "";
}

export function LeadFormSheet({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  submitError,
  defaults,
}: LeadFormSheetProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const defaultMessage = ctaDefaultMessage(defaults.ctaType);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim() || !phone.trim() || !city.trim()) {
      setValidationError("Заполните имя, телефон и город.");
      return;
    }

    if (!/^[0-9+()\-\s]{7,20}$/.test(phone.trim())) {
      setValidationError("Проверьте номер телефона.");
      return;
    }

    setValidationError(null);

    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      message: message.trim() || defaultMessage || undefined,
      category: defaults.category,
      modelId: defaults.modelId,
      modelName: defaults.modelName,
      colorId: defaults.colorId,
      colorName: defaults.colorName,
      previewDataUrl: defaults.previewDataUrl,
      ctaType: defaults.ctaType,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-[rgba(4,10,18,0.58)]">
      <div className="max-h-[88vh] w-full overflow-auto rounded-t-[30px] bg-white px-4 pb-8 pt-4 shadow-[0_-10px_40px_rgba(5,18,34,0.3)]">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#d4e0ef]" />

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#102e4f]">Оставить заявку</h2>
          <button
            type="button"
            className="rounded-lg border border-[#d7e2f0] px-3 py-2 text-xs font-semibold text-[#395778]"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-[#f2f8ff] p-3 text-xs text-[#254468]">
          <p className="font-semibold">Выбор клиента</p>
          <p className="mt-1">Категория: {categoryLabel(defaults.category)}</p>
          <p>Модель: {defaults.modelName}</p>
          <p>Цвет: {defaults.colorName}</p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#1f3c5f]">
            ФИО
            <input
              className="mt-1 w-full rounded-xl border border-[#ceddee] px-3 py-3 text-sm outline-none focus:border-[#4f8fcd]"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Иван Иванов"
              autoComplete="name"
            />
          </label>

          <label className="block text-sm font-medium text-[#1f3c5f]">
            Телефон
            <input
              className="mt-1 w-full rounded-xl border border-[#ceddee] px-3 py-3 text-sm outline-none focus:border-[#4f8fcd]"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>

          <label className="block text-sm font-medium text-[#1f3c5f]">
            Город / населенный пункт
            <input
              className="mt-1 w-full rounded-xl border border-[#ceddee] px-3 py-3 text-sm outline-none focus:border-[#4f8fcd]"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Москва"
              autoComplete="address-level2"
            />
          </label>

          <label className="block text-sm font-medium text-[#1f3c5f]">
            Сообщение (необязательно)
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-xl border border-[#ceddee] px-3 py-3 text-sm outline-none focus:border-[#4f8fcd]"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={defaultMessage || "Когда удобно связаться?"}
            />
          </label>

          {validationError ? (
            <p className="text-sm font-medium text-[#b13f34]">{validationError}</p>
          ) : null}

          {submitError ? (
            <p className="text-sm font-medium text-[#b13f34]">{submitError}</p>
          ) : null}

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[#1f74c5] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Отправка..." : "Отправить заявку"}
          </button>
        </form>
      </div>
    </div>
  );
}
