import type { Theme } from "@/components/theme/ThemeProvider";

export interface HeroFractalCamera {
  readonly cameraRotation: readonly [number, number, number];
  readonly cameraDistance: readonly [number, number, number];
  readonly cameraTarget: readonly [number, number, number];
  readonly fov: number;
  readonly maxMouseRotation: number;
  readonly mouseLerp: number;
}
export interface HeroFractalMaterial {
  readonly baseColor: readonly [number, number, number];
  readonly roughness: number;
  readonly diffuseStrength: number;
  readonly specularStrength: number;
  readonly ambientStrength: number;
}
export interface HeroFractalGlass {
  readonly fractalScale: number;
  readonly orbScale: number;
  readonly orbOffsetY: number;
  readonly sphereMix: number;
  readonly ior: number;
  readonly reflectionStrength: number;
  readonly backOpacity: number;
  readonly absorption: readonly [number, number, number];
  readonly frostRadius: number;
  readonly dispersion: number;
  readonly iridescenceStrength: number;
  readonly iridescenceFrequency: number;
  readonly environmentRotation: readonly [number, number, number];
  readonly environmentExposure: number;
}

export const HERO_FRACTAL_CAMERA = {
  cameraRotation: [0, 0, 0],
  cameraDistance: [5.44, 1.33, 0.55],
  cameraTarget: [0, 0.16, 0],
  fov: 20,
  maxMouseRotation: 5,
  mouseLerp: 0.02,
} satisfies HeroFractalCamera;
export const HERO_FRACTAL_MATERIAL = {
  baseColor: [71 / 255, 71 / 255, 71 / 255],
  roughness: 0.18,
  diffuseStrength: 0.19,
  specularStrength: 0.06,
  ambientStrength: 0.34,
} satisfies HeroFractalMaterial;
export const HERO_ORB_MATERIAL = {
  baseColor: [1, 1, 1],
  roughness: 0.25,
  diffuseStrength: 0.08,
  specularStrength: 1.6,
  ambientStrength: 0,
} satisfies HeroFractalMaterial;
export const HERO_FRACTAL_GLASS = {
  fractalScale: 0.72,
  orbScale: 0.6,
  orbOffsetY: 0.08,
  sphereMix: 0,
  ior: 1.149,
  reflectionStrength: 0.71,
  backOpacity: 0.19,
  absorption: [74 / 255, 74 / 255, 74 / 255],
  frostRadius: 1.8,
  dispersion: 0.04,
  iridescenceStrength: 0.08,
  iridescenceFrequency: 2,
  environmentRotation: [0, -36, 0],
  environmentExposure: 1,
} satisfies HeroFractalGlass;

interface MutableGlass {
  absorption: [number, number, number];
  environmentExposure: number;
}

interface MutableMaterial {
  baseColor: [number, number, number];
  ambientStrength: number;
}

const THEME_GLASS: Record<Theme, { absorption: [number, number, number]; environmentExposure: number }> = {
  dark: {
    absorption: [74 / 255, 74 / 255, 74 / 255],
    environmentExposure: 1,
  },
  light: {
    absorption: [90 / 255, 90 / 255, 95 / 255],
    environmentExposure: 1.15,
  },
};

const THEME_FRACTAL_MATERIAL: Record<Theme, { baseColor: [number, number, number]; ambientStrength: number }> = {
  dark: {
    baseColor: [71 / 255, 71 / 255, 71 / 255],
    ambientStrength: 0.34,
  },
  light: {
    baseColor: [55 / 255, 55 / 255, 60 / 255],
    ambientStrength: 0.28,
  },
};

export function applyThemeToHeroGlass(
  theme: Theme,
  fractalMaterial: MutableMaterial,
  orbMaterial: MutableMaterial,
  glass: MutableGlass,
): void {
  const glassTheme = THEME_GLASS[theme];
  const fractalTheme = THEME_FRACTAL_MATERIAL[theme];
  glass.absorption = [...glassTheme.absorption];
  glass.environmentExposure = glassTheme.environmentExposure;
  fractalMaterial.baseColor = [...fractalTheme.baseColor];
  fractalMaterial.ambientStrength = fractalTheme.ambientStrength;
  orbMaterial.baseColor = theme === "dark" ? [1, 1, 1] : [0.95, 0.95, 0.98];
}
