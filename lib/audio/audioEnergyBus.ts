type EnergyListener = (energy: number) => void;

const listeners = new Set<EnergyListener>();
let energy = 0;

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function publishAudioEnergy(value: number): void {
  const next = clamp(value);
  if (Math.abs(next - energy) < 0.004) return;
  energy = next;
  listeners.forEach((listener) => listener(next));
}

export function getAudioEnergy(): number {
  return energy;
}

export function subscribeAudioEnergy(listener: EnergyListener): () => void {
  listeners.add(listener);
  listener(energy);
  return () => {
    listeners.delete(listener);
  };
}
