import type { ObjectId } from 'mongoose';
import type { Build, Timeline } from '../types-azure.js';

type SaveBuildTimeline = (
  buildId: number,
  buildDefinitionId: number,
  buildTimeline: Timeline | null
) => Promise<ObjectId | null>;

export default async (
  builds: Build[],
  missingTimelines: (buildIds: number[]) => Promise<number[]>,
  getBuildTimeline: (buildId: number) => Promise<Timeline | null>,
  saveBuildTimeline: SaveBuildTimeline
) => {
  const missingBuildIds = await missingTimelines(
    builds.filter(b => b.result !== 'canceled').map(b => b.id)
  );

  return Promise.all(
    missingBuildIds.map(async buildId => {
      const timeline = await getBuildTimeline(buildId);
      if (!timeline) return;
      return saveBuildTimeline(
        buildId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        builds.find(b => b.id === buildId)!.definition.id,
        timeline
      );
    })
  );
};
