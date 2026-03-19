export async function sharePreviewWithWebShare(
  dataUrl: string,
  modelName: string,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "pvc-preview.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "PVC Visual Configurator AR",
        text: `Визуализация: ${modelName}`,
        files: [file],
      });
      return true;
    }

    await navigator.share({
      title: "PVC Visual Configurator AR",
      text: `Визуализация: ${modelName}`,
      url: window.location.href,
    });
    return true;
  } catch {
    return false;
  }
}

export function buildWhatsAppShareUrl(modelName: string, colorName: string) {
  const text = encodeURIComponent(
    `Здравствуйте! Я создал(а) визуализацию в PVC Visual Configurator AR. Модель: ${modelName}, цвет: ${colorName}. Нужен расчет стоимости.`,
  );
  return `https://wa.me/?text=${text}`;
}

export function buildEmailShareUrl(modelName: string, colorName: string) {
  const subject = encodeURIComponent("Запрос по ПВХ окнам/дверям");
  const body = encodeURIComponent(
    `Здравствуйте! Я создал(а) визуализацию в PVC Visual Configurator AR.\n\nМодель: ${modelName}\nЦвет: ${colorName}\n\nПрошу связаться со мной для консультации и расчета.`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}
