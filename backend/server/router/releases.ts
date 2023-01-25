import {
  getArtifacts,
  paginatedReleaseIds,
  paginatedReleaseIdsInputParser,
  pipelineFiltersInputParser,
  releasePipelineStages,
  releasePipelineDetailsInputParser,
  summary,
} from '../../models/release-listing.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  summary: t.procedure.input(pipelineFiltersInputParser).query(passInputTo(summary)),

  paginatedReleases: t.procedure
    .input(paginatedReleaseIdsInputParser)
    .query(passInputTo(paginatedReleaseIds)),

  releasePipelineStages: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(releasePipelineStages)),

  getArtifacts: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(getArtifacts)),
});
