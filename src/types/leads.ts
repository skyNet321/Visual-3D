import type { ProductCategory } from "./products";

export interface LeadPayload {
  fullName: string;
  phone: string;
  city: string;
  category: ProductCategory;
  modelId: string;
  modelName: string;
  colorId: string;
  colorName: string;
  message?: string;
  ctaType?: string;
  previewDataUrl?: string;
}

export interface LeadSubmissionResult {
  ok: boolean;
  leadId?: string;
  previewUrl?: string | null;
  mode?: "supabase" | "file-fallback";
  error?: string;
}
