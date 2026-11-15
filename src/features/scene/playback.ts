import { parseUtcInstant, toUtcIsoSeconds } from '../../../shared/time';

/** Uniform whole-second samples, including both user-selected endpoints. */
export function playbackInstants(start: string, end: string, count: number): string[] | null {
  const from = parseUtcInstant(`${start}Z`);
  const to = parseUtcInstant(`${end}Z`);
  if (!from.ok || !to.ok || !Number.isInteger(count) || count < 2 || count > 121) return null;
  const duration = to.instant.getTime() - from.instant.getTime();
  if (duration <= 0) return null;
  const samples = Math.min(count, duration / 1000 + 1);
  return Array.from({ length: samples }, (_, index) =>
    toUtcIsoSeconds(new Date(from.instant.getTime() + Math.round((duration / 1000) * index / (samples - 1)) * 1000)),
  );
}
