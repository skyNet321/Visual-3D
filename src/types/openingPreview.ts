export type InlineOpeningMode = "side" | "tilt" | "slide" | "double";

export interface OpeningPreviewState {
  enabled: boolean;
  mode: InlineOpeningMode;
  progress: number;
  openingPanels: number;
}
