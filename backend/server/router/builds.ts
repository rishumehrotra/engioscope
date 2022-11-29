import { passInputTo, t } from './trpc.js';
import { aggregateBuildTimelineStats, aggregateBuildTimelineStatsInputParser } from '../../models/build-timeline.js';
import { centralTemplateOptions, centralTemplateOptionsInputParser } from '../../models/build-reports.js';

export default t.router({
  timelineStats: t.procedure
    .input(aggregateBuildTimelineStatsInputParser)
    .query(passInputTo(aggregateBuildTimelineStats)),

  centralTemplateOptions: t.procedure
    .input(centralTemplateOptionsInputParser)
    .query(passInputTo(centralTemplateOptions))
});
