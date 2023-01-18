import { passInputTo, t } from './trpc.js';
import {
  paginatedReleaseIds, paginatedReleaseIdsInputParser, pipelineFiltersInputParser, summary
} from '../../models/releases.js';

export default t.router({
  summary: t.procedure
    .input(pipelineFiltersInputParser)
    .query(passInputTo(summary)),

  paginatedReleases: t.procedure
    .input(paginatedReleaseIdsInputParser)
    .query(passInputTo(paginatedReleaseIds))
});
