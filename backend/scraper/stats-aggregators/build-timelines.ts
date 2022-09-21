import type { BuildTimeline } from '../../models/build-timeline.js';
import type { Build, Timeline } from '../types-azure.js';

export default async (
  builds: Build[],
  missingTimelines: (buildIds: number[]) => Promise<number[]>,
  getBuildTimeline: (buildId: number) => Promise<Timeline | null>,
  saveBuildTimeline: (timeline: Omit<BuildTimeline, 'collectionName' | 'project'>) => Promise<any>
) => {
  const missingBuildIds = await missingTimelines(
    builds
      .filter(b => b.result !== 'canceled')
      .map(b => b.id)
  );

  return Promise.all(missingBuildIds.map(async buildId => {
    const timeline = await getBuildTimeline(buildId);
    if (!timeline) return;
    return saveBuildTimeline({
      buildId,
      records: timeline.records.map(record => ({
        name: record.name,
        order: record.order,
        type: record.type,
        result: record.result,
        errorCount: record.errorCount,
        warningCount: record.warningCount,
        startTime: record.startTime,
        finishTime: record.finishTime
      }))
    });
  }));
};
