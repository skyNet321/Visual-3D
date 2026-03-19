"use client";

import { useEffect, useMemo, useState } from "react";

export function useIsMobileDevice() {
  const [width, setWidth] = useState<number>(0);
  const [coarsePointer, setCoarsePointer] = useState<boolean>(true);

  useEffect(() => {
    const update = () => {
      setWidth(window.innerWidth);
      setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return useMemo(() => {
    return coarsePointer && width > 0 && width <= 1024;
  }, [coarsePointer, width]);
}
