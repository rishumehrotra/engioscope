import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import { Build } from '../types-azure';
import { UIBuilds } from '../../../shared/types';
import { assertDefined, isMaster, shortDateFormat } from '../../utils';

type BuildStats = {
  count: number;
  success: number;
  duration: number[];
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed'; since: Date };
};

const repoId = (build: Build) => build.repository?.id ?? '<unknown>';
const defaultBuildStats: BuildStats = {
  count: 0, success: 0, duration: [], status: { type: 'unknown' }
};

const status = (incoming: BuildStats, existing: BuildStats): BuildStats['status'] => {
  if (existing.status.type === 'unknown') return incoming.status;
  if (existing.status.type === 'succeeded') return existing.status;
  if (incoming.status.type === 'succeeded') return existing.status;
  return incoming.status;
};

const combineStats = (
  incoming: BuildStats,
  existing = defaultBuildStats
): BuildStats => ({
  count: existing.count + incoming.count,
  success: existing.success + incoming.success,
  duration: [...existing.duration, ...incoming.duration],
  status: status(incoming, existing)
});

export default (builds: Build[]) => {
  type AggregatedBuilds = {
    buildStats: Record<string, BuildStats>;
    latestMasterBuilds: Record<string, Record<number, Build | undefined>>;
  };

  const { buildStats, latestMasterBuilds } = builds
    .reduce<AggregatedBuilds>((acc, build) => {
      const rId = repoId(build);

      return {
        buildStats: {
          ...acc.buildStats,
          [rId]: combineStats({
            count: 1,
            success: build.result === 'succeeded' ? 1 : 0,
            duration: [(new Date(build.finishTime)).getTime() - (new Date(build.startTime).getTime())],
            status: build.result === 'succeeded'
              ? { type: 'succeeded' }
              : { type: 'failed', since: build.finishTime }
          }, acc.buildStats[rId])
        },
        latestMasterBuilds: {
          ...acc.latestMasterBuilds,
          [rId]: {
            ...acc.latestMasterBuilds[rId],
            [build.definition.id]:
              // eslint-disable-next-line no-nested-ternary
              acc.latestMasterBuilds[rId] && acc.latestMasterBuilds[rId][build.definition.id]
                ? acc.latestMasterBuilds[rId][build.definition.id]
                : isMaster(build.sourceBranch) ? build : undefined
          }
        }
      };
    }, { buildStats: {}, latestMasterBuilds: {} });

  return {
    buildsByRepoId: (id?: string): UIBuilds => {
      if (!id) return null;
      if (!buildStats[id]) return null;

      const b = buildStats[id];
      return {
        count: b.count,
        success: b.success,
        duration: {
          average: prettyMilliseconds(b.duration.reduce(add, 0) / b.duration.length),
          min: prettyMilliseconds(Math.min(...b.duration)),
          max: prettyMilliseconds(Math.max(...b.duration))
        },
        status: b.status.type === 'succeeded' || b.status.type === 'unknown'
          ? b.status
          : { type: 'failed', since: shortDateFormat(b.status.since) }
      };
    },
    latestMasterBuilds: (repoId?: string) => (
      repoId
        ? Object.values(latestMasterBuilds[repoId] || {})
        : []
    )
      .filter(Boolean)
      .map(assertDefined)
  };
};
