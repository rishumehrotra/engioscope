import { Build } from '../types-azure';
import { TopLevelIndicator } from '../../../shared/types';
import {
  assertDefined, isMaster, minutes, shortDateFormat, statsStrings
} from '../../utils';

type BuildStats = {
  count: number,
  success: number,
  duration: number[],
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed', since: Date }
};

const repoId = (build: Build) => build.repository?.id ?? '<unknown>';
const defaultBuildStats: BuildStats = {
  count: 0, success: 0, duration: [], status: { type: 'unknown' }
};
const [timeRange, averageTime] = statsStrings('-', minutes);

const topLevelIndicator = (stats: BuildStats): TopLevelIndicator => ({
  name: 'Builds',
  count: stats.count,
  indicators: [
    {
      name: 'Total successful',
      value: stats.success
    },
    {
      name: 'Number of executions',
      value: stats.count
    },
    {
      name: 'Success rate',
      value: `${stats.count === 0 ? 0 : Math.round((stats.success * 100) / stats.count)}%`
    },
    {
      name: 'Average duration',
      value: averageTime(stats.duration),
      additionalValue: timeRange(stats.duration)
    },
    {
      name: 'Current status',
      value: stats.status.type,
      additionalValue: stats.status.type === 'failed' ? `Since ${shortDateFormat(stats.status.since)}` : undefined
    }
  ]
});

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

// TODO: remove eslint-disable Not sure why eslint is messing up the indentation onSave
/* eslint-disable @typescript-eslint/indent */
export default (builds: Build[]) => {
  type AggregatedBuilds = {
    buildStats: Record<string, BuildStats>;
    latestMasterBuilds: Record<string, Record<number, Build | undefined>>
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
    buildByRepoId: (id?: string): TopLevelIndicator => {
      if (!id) return topLevelIndicator(defaultBuildStats);
      if (!buildStats[id]) return topLevelIndicator(defaultBuildStats);
      return topLevelIndicator(buildStats[id]);
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
/* eslint-enable @typescript-eslint/indent */
