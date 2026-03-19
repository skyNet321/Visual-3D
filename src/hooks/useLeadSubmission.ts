"use client";

import { useState } from "react";
import type { LeadPayload, LeadSubmissionResult } from "@/types/leads";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function useLeadSubmission() {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  const submitLead = async (payload: LeadPayload): Promise<LeadSubmissionResult> => {
    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as LeadSubmissionResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Не удалось отправить заявку.");
      }

      setState("success");
      return result;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Ошибка отправки заявки. Попробуйте позже.";
      setState("error");
      setError(message);
      return {
        ok: false,
        error: message,
      };
    }
  };

  return {
    state,
    error,
    submitLead,
  };
}
