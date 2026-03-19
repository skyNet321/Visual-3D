const PREVIEW_KEY = "pvc_visual_previews";

export interface StoredPreview {
  id: string;
  dataUrl: string;
  modelName: string;
  colorName: string;
  createdAt: string;
}

export function savePreviewLocally(preview: StoredPreview) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getStoredPreviews();
  const next = [preview, ...current].slice(0, 12);
  window.localStorage.setItem(PREVIEW_KEY, JSON.stringify(next));
}

export function getStoredPreviews(): StoredPreview[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PREVIEW_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is StoredPreview =>
        typeof item?.id === "string" &&
        typeof item?.dataUrl === "string" &&
        typeof item?.modelName === "string" &&
        typeof item?.colorName === "string" &&
        typeof item?.createdAt === "string",
    );
  } catch {
    return [];
  }
}
