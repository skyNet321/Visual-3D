"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("Браузер не поддерживает доступ к камере.");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        setStatus("error");
        setError("Видео элемент не готов.");
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("ready");
    } catch (caughtError) {
      const errorInstance = caughtError as DOMException;

      if (errorInstance.name === "NotAllowedError") {
        setStatus("denied");
        setError("Доступ к камере отклонен. Разрешите камеру в настройках браузера.");
        return;
      }

      setStatus("error");
      setError(
        errorInstance.message || "Не удалось запустить камеру. Повторите попытку.",
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    startCamera,
    stopCamera,
  };
}
