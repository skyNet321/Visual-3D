import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/backend/supabaseServer";
import type { LeadPayload, LeadSubmissionResult } from "@/types/leads";

export const runtime = "nodejs";

interface StoredLead {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  category: string;
  model_id: string;
  model_name: string;
  color_id: string;
  color_name: string;
  message: string | null;
  cta_type: string | null;
  preview_url: string | null;
  created_at: string;
}

function parsePayload(raw: unknown): LeadPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as LeadPayload;

  if (
    typeof payload.fullName !== "string" ||
    typeof payload.phone !== "string" ||
    typeof payload.city !== "string" ||
    typeof payload.category !== "string" ||
    typeof payload.modelId !== "string" ||
    typeof payload.modelName !== "string" ||
    typeof payload.colorId !== "string" ||
    typeof payload.colorName !== "string"
  ) {
    return null;
  }

  if (!payload.fullName.trim() || !payload.phone.trim() || !payload.city.trim()) {
    return null;
  }

  return payload;
}

function parsePreviewDataUrl(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) {
    return null;
  }

  try {
    return Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
}

async function saveLeadToFile(record: StoredLead) {
  const dirPath = join(process.cwd(), "tmp");
  const filePath = join(dirPath, "leads-dev.json");

  await mkdir(dirPath, { recursive: true });

  let leads: StoredLead[] = [];

  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      leads = parsed as StoredLead[];
    }
  } catch {
    leads = [];
  }

  leads.unshift(record);
  await writeFile(filePath, JSON.stringify(leads.slice(0, 200), null, 2), "utf-8");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = parsePayload(body);

  if (!payload) {
    return NextResponse.json<LeadSubmissionResult>(
      {
        ok: false,
        error: "Некорректные данные формы.",
      },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const normalized: StoredLead = {
    id,
    full_name: payload.fullName.trim(),
    phone: payload.phone.trim(),
    city: payload.city.trim(),
    category: payload.category,
    model_id: payload.modelId,
    model_name: payload.modelName,
    color_id: payload.colorId,
    color_name: payload.colorName,
    message: payload.message?.trim() || null,
    cta_type: payload.ctaType || null,
    preview_url: null,
    created_at: now,
  };

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    await saveLeadToFile(normalized);

    return NextResponse.json<LeadSubmissionResult>({
      ok: true,
      leadId: normalized.id,
      mode: "file-fallback",
      previewUrl: null,
    });
  }

  let previewUrl: string | null = null;

  if (payload.previewDataUrl) {
    const buffer = parsePreviewDataUrl(payload.previewDataUrl);

    if (buffer) {
      const bucketName = process.env.SUPABASE_PREVIEW_BUCKET || "lead-previews";
      const objectPath = `previews/${new Date().toISOString().slice(0, 10)}/${id}.png`;

      const upload = await supabase.storage
        .from(bucketName)
        .upload(objectPath, buffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (!upload.error) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
        previewUrl = data.publicUrl || objectPath;
      }
    }
  }

  const tableName = process.env.SUPABASE_LEADS_TABLE || "leads";

  const insertResult = await supabase
    .from(tableName)
    .insert({
      id: normalized.id,
      full_name: normalized.full_name,
      phone: normalized.phone,
      city: normalized.city,
      category: normalized.category,
      model_id: normalized.model_id,
      model_name: normalized.model_name,
      color_id: normalized.color_id,
      color_name: normalized.color_name,
      message: normalized.message,
      cta_type: normalized.cta_type,
      preview_url: previewUrl,
      created_at: normalized.created_at,
    })
    .select("id")
    .single();

  if (insertResult.error) {
    return NextResponse.json<LeadSubmissionResult>(
      {
        ok: false,
        error: `Ошибка сохранения заявки: ${insertResult.error.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json<LeadSubmissionResult>({
    ok: true,
    leadId: insertResult.data.id,
    mode: "supabase",
    previewUrl,
  });
}
