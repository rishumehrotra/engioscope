import prettyMilliseconds from 'pretty-ms';
import { add } from 'rambda';
import type { Build } from '../types-azure';
import type { UIBuildPipeline, UIBuilds } from '../../../shared/types';
import { exists, isMaster } from '../../utils';

type BuildStats = {
  count: number;
  name: string;
  url: string;
  success: number;
  duration: number[];
  status:
  | { type: 'unknown' }
  | { type: 'succeeded'; latest: Date }
  | { type: 'failed'; since: Date};
};

const repoId = (build: Build) => build.repository?.id ?? '<unknown>';
const defaultBuildStats: BuildStats = {
  count: 0, name: 'unknown', url: '', success: 0, duration: [], status: { type: 'unknown' }
};

const status = (a: BuildStats, b: BuildStats): BuildStats['status'] => {
  if (a.status.type === 'unknown') return b.status;
  if (b.status.type === 'unknown') return a.status;
  if (a.status.type === 'succeeded' && b.status.type === 'succeeded') {
    return a.status.latest < b.status.latest ? b.status : a.status;
  }
  if (a.status.type === 'succeeded' && b.status.type === 'failed') {
    return a.status.latest < b.status.since ? b.status : a.status;
  }
  if (a.status.type === 'failed' && b.status.type === 'succeeded') {
    return a.status.since < b.status.latest ? b.status : a.status;
  }
  if (a.status.type === 'failed' && b.status.type === 'failed') {
    return a.status.since < b.status.since ? a.status : b.status;
  }
  return b.status;
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
    allMasterBuilds: Record<string, Record<number, Build[] | undefined>>;
  };

  const { buildStats, allMasterBuilds } = [...builds]
    .sort((a, b) => b.finishTime.getTime() - a.finishTime.getTime())
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
              success: build.result !== 'failed' ? 1 : 0,
              duration: [(new Date(build.finishTime)).getTime() - (new Date(build.startTime).getTime())],
              status: build.result !== 'failed'
                ? { type: 'succeeded', latest: build.finishTime }
                : { type: 'failed', since: build.finishTime }
            }, acc.buildStats[rId]?.[build.definition.id] || undefined)
          }
        },
        allMasterBuilds: {
          ...acc.allMasterBuilds,
          [rId]: {
            ...acc.allMasterBuilds[rId],
            ...(
              isMaster(build.sourceBranch)
                ? { [build.definition.id]: [...(acc.allMasterBuilds[rId]?.[build.definition.id] || []), build] }
                : {}
            )
          }
        }
      };
    }, { buildStats: {}, allMasterBuilds: {} });

  return {
    buildsByRepoId: (id?: string): UIBuilds => {
      if (!id) return null;
      if (!buildStats[id]) return null;

      const pipelines: UIBuildPipeline[] = Object.entries(buildStats[id])
        .map(([definitionId, buildStats]) => ({
          count: buildStats.count,
          name: buildStats.name,
          url: buildStats.url,
          success: buildStats.success,
          definitionId,
          duration: {
            average: prettyMilliseconds(
              buildStats.duration.reduce(add, 0) / buildStats.duration.length
            ),
            min: prettyMilliseconds(Math.min(...buildStats.duration)),
            max: prettyMilliseconds(Math.max(...buildStats.duration))
          },
          status: buildStats.status.type === 'succeeded' || buildStats.status.type === 'unknown'
            ? buildStats.status
            : { type: 'failed', since: buildStats.status.since } as UIBuildPipeline['status']

        }));

      return {
        count: pipelines.reduce((acc, p) => acc + p.count, 0),
        pipelines
      };
    },
    allMasterBuilds: (repoId?: string) => (
      repoId
        ? Object.values(allMasterBuilds[repoId] || {})
        : []
    ).filter(exists)
  };
};
