import { passInputTo, t } from './trpc.js';
import {
  aggregateBuildTimelineStats,
  aggregateBuildTimelineStatsInputParser,
} from '../../models/build-timeline.js';
import {
  centralTemplateOptions,
  centralTemplateOptionsInputParser,
  buildsCentralTemplateStats,
  buildsCentralTemplateStatsInputParser,
} from '../../models/build-reports.js';
import {
  getBuildsOverviewForRepository,
  getBuildsOverviewForRepositoryInputParser,
} from '../../models/builds.js';

export default t.router({
  timelineStats: t.procedure
    .input(aggregateBuildTimelineStatsInputParser)
    .query(passInputTo(aggregateBuildTimelineStats)),

  centralTemplateOptions: t.procedure
    .input(centralTemplateOptionsInputParser)
    .query(passInputTo(centralTemplateOptions)),

  getBuildsOverviewForRepository: t.procedure
    .input(getBuildsOverviewForRepositoryInputParser)
    .query(passInputTo(getBuildsOverviewForRepository)),

  buildsCentralTemplateStats: t.procedure
    .input(buildsCentralTemplateStatsInputParser)
    .query(passInputTo(buildsCentralTemplateStats)),
});
