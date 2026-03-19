export type ProductCategory = "windows" | "doors";

export type OpeningStyle =
  | "fixed"
  | "side-opening"
  | "tilt-and-turn"
  | "fixed-plus-opening"
  | "single-door-opening"
  | "double-door-opening"
  | "sliding-window"
  | "sliding-door"
  | "balcony-door";

export type PanelKind = "fixed" | "opening" | "sliding";
export type HingeSide = "left" | "right";
export type SlideDirection = "left" | "right";

export interface PanelTemplate {
  id: string;
  label: string;
  kind: PanelKind;
  widthRatio: number;
  hingeSide?: HingeSide;
  slideDirection?: SlideDirection;
  supportsTilt?: boolean;
}

export interface FrameStyleMetadata {
  frameThickness: number;
  mullionThickness: number;
  glassOpacity: number;
  cornerRadius: number;
  depthHint: number;
}

export interface ProductTemplate {
  id: string;
  category: ProductCategory;
  name: string;
  panels: number;
  openingStyle: OpeningStyle;
  defaultProportions: {
    width: number;
    height: number;
  };
  frameStyle: FrameStyleMetadata;
  panelLayout: PanelTemplate[];
  marketingTagline: string;
}
