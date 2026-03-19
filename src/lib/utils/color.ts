export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const parsed = Number.parseInt(value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

export function rgbToCss(r: number, g: number, b: number, alpha = 1) {
  const safeAlpha = Math.max(0, Math.min(alpha, 1));
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${safeAlpha})`;
}

export function shadeHex(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const ratio = Math.max(-1, Math.min(amount, 1));

  const target = ratio < 0 ? 0 : 255;
  const factor = Math.abs(ratio);

  const nextR = r + (target - r) * factor;
  const nextG = g + (target - g) * factor;
  const nextB = b + (target - b) * factor;

  return rgbToCss(nextR, nextG, nextB, 1);
}
