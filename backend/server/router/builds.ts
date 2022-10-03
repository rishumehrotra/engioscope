import { passInputTo, t } from './trpc.js';
import { aggregateBuildTimelineStats, aggregateBuildTimelineStatsInputParser } from '../../models/build-timeline.js';

export default t.router({
  timelineStats: t.procedure
    .input(aggregateBuildTimelineStatsInputParser)
    .query(passInputTo(aggregateBuildTimelineStats))
});
