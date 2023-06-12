import { passInputTo, t } from './trpc.js';
import {
  aggregateBuildTimelineStats,
  aggregateBuildTimelineStatsInputParser,
  allBuildTimelineStats,
  allBuildTimelineStatsInputParser,
} from '../../models/build-timeline.js';
import {
  centralTemplateOptions,
  centralTemplateOptionsInputParser,
} from '../../models/build-reports.js';
import {
  getBuildsOverviewForRepository,
  getBuildsOverviewForRepositoryInputParser,
  getNonYamlPipeLineBuildStats,
  getPipeLineBuildStatsForRepo,
  NonYamlPipeLineBuildStatsInputParser,
  pipeLineBuildStatsInputParser,
} from '../../models/builds.js';

export default t.router({
  timelineStats: t.procedure
    .input(aggregateBuildTimelineStatsInputParser)
    .query(passInputTo(aggregateBuildTimelineStats)),

  allTimelineStats: t.procedure
    .input(allBuildTimelineStatsInputParser)
    .query(passInputTo(allBuildTimelineStats)),

  centralTemplateOptions: t.procedure
    .input(centralTemplateOptionsInputParser)
    .query(passInputTo(centralTemplateOptions)),

  getBuildsOverviewForRepository: t.procedure
    .input(getBuildsOverviewForRepositoryInputParser)
    .query(passInputTo(getBuildsOverviewForRepository)),

  getNonYamlPipeLineBuildStats: t.procedure
    .input(NonYamlPipeLineBuildStatsInputParser)
    .query(passInputTo(getNonYamlPipeLineBuildStats)),

  getPipeLineBuildStatsForRepo: t.procedure
    .input(pipeLineBuildStatsInputParser)
    .query(passInputTo(getPipeLineBuildStatsForRepo)),
});
