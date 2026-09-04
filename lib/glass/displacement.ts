export type SurfaceType = "convex" | "concave" | "lip";
export type GlassShape = "circle" | "roundedRect";

export type DisplacementOptions = {
  samples?: number;
  refractiveIndex?: number;
  surfaceType?: SurfaceType;
  shape?: GlassShape;
  borderRadius?: number;
  bezelWidth?: number;
};

function convexSquircle(x: number): number {
  return Math.pow(1 - Math.pow(1 - x, 4), 0.25);
}

function surfaceHeight(x: number, type: SurfaceType): number {
  const convex = convexSquircle(x);
  if (type === "convex") return convex;
  if (type === "concave") return 1 - convex;
  const t = x * x * x * (x * (x * 6 - 15) + 10);
  return convex * (1 - t) + (1 - convex) * t;
}

function refractAngle(theta1: number, n1: number, n2: number): number {
  const sinTheta2 = (n1 / n2) * Math.sin(theta1);
  if (Math.abs(sinTheta2) > 1) return Math.PI / 2;
  return Math.asin(sinTheta2);
}

export function computeDisplacementMagnitudes(
  options: DisplacementOptions = {},
): { magnitudes: number[]; maximumDisplacement: number } {
  const samples = options.samples ?? 127;
  const n1 = 1;
  const n2 = options.refractiveIndex ?? 1.5;
  const surfaceType = options.surfaceType ?? "convex";
  const magnitudes: number[] = [];

  for (let i = 0; i <= samples; i++) {
    const x = i / samples;
    const delta = 0.001;
    const y1 = surfaceHeight(Math.max(0, x - delta), surfaceType);
    const y2 = surfaceHeight(Math.min(1, x + delta), surfaceType);
    const derivative = (y2 - y1) / (2 * delta);
    const normalAngle = Math.atan2(1, -derivative);
    const incidentAngle = Math.abs(normalAngle);
    const refracted = refractAngle(incidentAngle, n1, n2);
    const displacement = Math.tan(refracted - incidentAngle) * y2;
    magnitudes.push(Math.max(0, displacement));
  }

  const maximumDisplacement = Math.max(...magnitudes, 1);
  return { magnitudes, maximumDisplacement };
}

function roundedRectSDF(
  px: number,
  py: number,
  halfW: number,
  halfH: number,
  radius: number,
): number {
  const qx = Math.abs(px) - halfW + radius;
  const qy = Math.abs(py) - halfH + radius;
  const outside = Math.sqrt(
    Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2,
  );
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

function getBorderDistance(
  x: number,
  y: number,
  width: number,
  height: number,
  shape: GlassShape,
  borderRadius: number,
): number {
  const cx = width / 2;
  const cy = height / 2;
  const px = x - cx;
  const py = y - cy;

  if (shape === "circle") {
    const maxRadius = Math.min(cx, cy);
    return Math.min(Math.sqrt(px * px + py * py) / maxRadius, 1);
  }

  const halfW = width / 2;
  const halfH = height / 2;
  const radius = Math.min(borderRadius, halfW, halfH);
  const sdf = roundedRectSDF(px, py, halfW, halfH, radius);
  const bezelWidth = Math.min(width, height) * 0.18;
  const distToBorder = Math.max(0, -sdf);
  return Math.min(distToBorder / bezelWidth, 1);
}

function getDisplacementVector(
  x: number,
  y: number,
  width: number,
  height: number,
  magnitudes: number[],
  maximumDisplacement: number,
  shape: GlassShape,
  borderRadius: number,
): { x: number; y: number } {
  const cx = width / 2;
  const cy = height / 2;
  const px = x - cx;
  const py = y - cy;
  const normalized = getBorderDistance(x, y, width, height, shape, borderRadius);
  const sampleIndex = Math.min(
    magnitudes.length - 1,
    Math.floor(normalized * (magnitudes.length - 1)),
  );
  const mag = magnitudes[sampleIndex]! / maximumDisplacement;

  if (shape === "circle") {
    const angle = Math.atan2(py, px);
    return { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag };
  }

  const halfW = width / 2;
  const halfH = height / 2;
  const radius = Math.min(borderRadius, halfW, halfH);
  const eps = 1;
  const dx =
    roundedRectSDF(px + eps, py, halfW, halfH, radius) -
    roundedRectSDF(px - eps, py, halfW, halfH, radius);
  const dy =
    roundedRectSDF(px, py + eps, halfW, halfH, radius) -
    roundedRectSDF(px, py - eps, halfW, halfH, radius);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: (-dx / len) * mag, y: (-dy / len) * mag };
}

export function createDisplacementMapDataUrl(
  width: number,
  height: number,
  options: DisplacementOptions = {},
): { dataUrl: string; maximumDisplacement: number } {
  const { magnitudes, maximumDisplacement } = computeDisplacementMagnitudes(options);
  const shape = options.shape ?? "roundedRect";
  const borderRadius = options.borderRadius ?? Math.min(width, height) * 0.12;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: "", maximumDisplacement };
  }

  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { x: dispX, y: dispY } = getDisplacementVector(
        x,
        y,
        width,
        height,
        magnitudes,
        maximumDisplacement,
        shape,
        borderRadius,
      );
      const idx = (y * width + x) * 4;
      imageData.data[idx] = 128 + dispX * 127;
      imageData.data[idx + 1] = 128 + dispY * 127;
      imageData.data[idx + 2] = 128;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return { dataUrl: canvas.toDataURL(), maximumDisplacement };
}

export function createSpecularMapDataUrl(
  width: number,
  height: number,
  options: DisplacementOptions = {},
  lightAngle = -Math.PI / 3,
): string {
  const shape = options.shape ?? "roundedRect";
  const borderRadius = options.borderRadius ?? Math.min(width, height) * 0.12;
  const bezelWidth = Math.min(width, height) * 0.18;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = width / 2;
      const cy = height / 2;
      const px = x - cx;
      const py = y - cy;

      let edge = 0;
      if (shape === "circle") {
        const maxRadius = Math.min(cx, cy);
        const dist = Math.sqrt(px * px + py * py);
        edge = 1 - Math.min(dist / maxRadius, 1);
      } else {
        const halfW = width / 2;
        const halfH = height / 2;
        const radius = Math.min(borderRadius, halfW, halfH);
        const sdf = roundedRectSDF(px, py, halfW, halfH, radius);
        const distToBorder = Math.max(0, -sdf);
        edge = 1 - Math.min(distToBorder / bezelWidth, 1);
      }

      const normalAngle = Math.atan2(py, px);
      const spec =
        Math.pow(Math.max(0, Math.cos(normalAngle - lightAngle)), 4) *
        Math.pow(edge, 2.5);
      const v = Math.floor(spec * 200);
      const idx = (y * width + x) * 4;
      imageData.data[idx] = v;
      imageData.data[idx + 1] = v;
      imageData.data[idx + 2] = v;
      imageData.data[idx + 3] = Math.floor(spec * 100);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}
