import { lens } from '@rakeshpai/lens.ts';
import { applySpec, pipe } from 'rambda';

export type OTWBuild = [
  total: number,
  successful: number,
  duration: 0 | [average: string, min: string, max: string],
  status: 0 | 1 | string
];

export type UIBuild = {
  total: number;
  successful: number;
  duration: null | { average: string, min: string, max: string };
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed', since: string };
};

const buildLens = lens<OTWBuild>();

const totalLens = buildLens[0];
const successfulLens = buildLens[1];
const durationLens = lens<OTWBuild, UIBuild['duration']>(
  build => {
    const duration = build[2];
    if (!duration) return null;
    return { average: duration[0], min: duration[1], max: duration[2] };
  },
  value => build => {
    const b: OTWBuild = [...build];
    if (!value) b[2] = 0;
    else b[2] = [value.average, value.min, value.max];
    return b;
  }
);
const statusLens = lens<OTWBuild, UIBuild['status']>(
  build => {
    const status = build[3];
    if (typeof status === 'undefined') return { type: 'unknown' };
    if (status === 0) return { type: 'unknown' };
    if (status === 1) return { type: 'succeeded' };
    return { type: 'failed', since: status };
  },
  value => build => {
    const b: OTWBuild = [...build];
    if (value.type === 'succeeded') b[3] = 's';
    else if (value.type === 'unknown') b[3] = 'u';
    else if (value.type === 'failed') b[3] = value.since;
    return b;
  }
);

const percent = <T>(numeratorFn: (x: T) => number, denominatorFn: (x: T) => number) => (
  (value: T) => `${((numeratorFn(value) * 100) / denominatorFn(value)).toFixed(2)}%`
);

export const viewBuild = applySpec<UIBuild>({
  total: totalLens.get(),
  successful: successfulLens.get(),
  duration: durationLens.get(),
  status: statusLens.get(),
  successRate: percent(successfulLens.get(), totalLens.get())
});

export const setBuild = (build: UIBuild) => pipe(
  totalLens.set(build.total),
  successfulLens.set(build.successful),
  durationLens.set(build.duration),
  statusLens.set(build.status)
);
