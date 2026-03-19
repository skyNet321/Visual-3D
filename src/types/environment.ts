export interface EnvironmentLight {
  luma: number;
  contrast: number;
  direction: number;
  warmth: number;
}

export const DEFAULT_ENVIRONMENT_LIGHT: EnvironmentLight = {
  luma: 0.56,
  contrast: 0.3,
  direction: 0,
  warmth: 0.5,
};
