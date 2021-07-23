import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import { Build } from '../types-azure';
import { UIBuildPipeline, UIBuilds } from '../../../shared/types';
import { assertDefined, isMaster, shortDateFormat } from '../../utils';

type BuildStats = {
  count: number;
  name: string;
  url: string;
  success: number;
  duration: number[];
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed'; since: Date };
};

const repoId = (build: Build) => build.repository?.id ?? '<unknown>';
const defaultBuildStats: BuildStats = {
  count: 0, name: 'unknown', url: '', success: 0, duration: [], status: { type: 'unknown' }
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
  name: incoming.name,
  url: incoming.url,
  success: existing.success + incoming.success,
  duration: [...existing.duration, ...incoming.duration],
  status: status(incoming, existing)
});

export default (builds: Build[]) => {
  type AggregatedBuilds = {
    buildStats: Record<string, Record<number, BuildStats>>;
    latestMasterBuilds: Record<string, Record<number, Build | undefined>>;
  };

  const { buildStats, latestMasterBuilds } = builds
    .reduce<AggregatedBuilds>((acc, build) => {
      const rId = repoId(build);

      return {
        buildStats: {
          ...acc.buildStats,
          [rId]: {
            ...acc.buildStats[rId],
            [build.definition.id]: combineStats({
              count: 1,
              name: build.definition.name,
              url: build.definition.url
                .replace('_apis/build/Definitions/', '_build/definition?definitionId=')
                .replace(/\?revision=.*/, ''),
              success: build.result === 'succeeded' ? 1 : 0,
              duration: [(new Date(build.finishTime)).getTime() - (new Date(build.startTime).getTime())],
              status: build.result === 'succeeded'
                ? { type: 'succeeded' }
                : { type: 'failed', since: build.finishTime }
            }, acc.buildStats[rId]?.[build.definition.id] || undefined)
          }
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

      const pipelines = Object.entries(b).reduce((acc, [definitionId, buildStats]) => [
        ...acc,
        {
          count: buildStats.count,
          name: buildStats.name,
          url: buildStats.url,
          success: buildStats.success,
          definitionId,
          duration: {
            average: prettyMilliseconds(buildStats.duration.reduce(add, 0) / buildStats.duration.length),
            min: prettyMilliseconds(Math.min(...buildStats.duration)),
            max: prettyMilliseconds(Math.max(...buildStats.duration))
          },
          status: buildStats.status.type === 'succeeded' || buildStats.status.type === 'unknown'
            ? buildStats.status
            : { type: 'failed', since: shortDateFormat(buildStats.status.since) } as UIBuildPipeline['status']
        }
      ], [] as UIBuildPipeline[]);

      return {
        count: pipelines.reduce((acc, p) => acc + p.count, 0),
        pipelines
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
