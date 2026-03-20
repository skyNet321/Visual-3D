import type { ColorPreset } from "@/types/colors";

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "white",
    name: "Белый",
    hex: "#f8f8f7",
    shadowHex: "#b5bcc6",
    accentHex: "#ffffff",
  },
  {
    id: "anthracite",
    name: "Антрацит",
    hex: "#474e58",
    shadowHex: "#30353d",
    accentHex: "#616a77",
  },
  {
    id: "walnut",
    name: "Орех",
    hex: "#7d5b43",
    shadowHex: "#5f4331",
    accentHex: "#9a765c",
  },
  {
    id: "golden-oak",
    name: "Золотой дуб",
    hex: "#b5844f",
    shadowHex: "#8b6137",
    accentHex: "#d3a56e",
  },
  {
    id: "dark-oak",
    name: "Темный дуб",
    hex: "#5f4334",
    shadowHex: "#422e23",
    accentHex: "#7d5a47",
  },
];

export function getColorPreset(colorId: string) {
  return COLOR_PRESETS.find((item) => item.id === colorId) ?? COLOR_PRESETS[0];
}
