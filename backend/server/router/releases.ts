import {
  getArtifacts,
  paginatedReleaseIds, paginatedReleaseIdsInputParser, pipelineFiltersInputParser,
  releasePipelineDetails, releasePipelineDetailsInputParser, summary
} from '../../models/release-listing.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  summary: t.procedure
    .input(pipelineFiltersInputParser)
    .query(passInputTo(summary)),

  paginatedReleases: t.procedure
    .input(paginatedReleaseIdsInputParser)
    .query(passInputTo(paginatedReleaseIds)),

  releasePipelineDetails: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(releasePipelineDetails)),

  getArtifacts: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(getArtifacts))
});
