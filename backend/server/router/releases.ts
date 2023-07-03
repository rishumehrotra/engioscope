import {
  getArtifacts,
  paginatedReleaseIds,
  paginatedReleaseIdsInputParser,
  pipelineFiltersInputParser,
  releasePipelineStages,
  releasePipelineDetailsInputParser,
  summary,
  usageByEnvironment,
  filteredReleaseCount,
} from '../../models/release-listing.js';
import { memoizeForUI, passInputTo, t } from './trpc.js';

export default t.router({
  summary: t.procedure.input(pipelineFiltersInputParser).query(passInputTo(summary)),

  usageByEnvironment: t.procedure
    .input(pipelineFiltersInputParser)
    .query(passInputTo(usageByEnvironment)),

  filteredReleaseCount: t.procedure
    .input(pipelineFiltersInputParser)
    .query(passInputTo(filteredReleaseCount)),

  paginatedReleases: t.procedure
    .input(paginatedReleaseIdsInputParser)
    .query(passInputTo(paginatedReleaseIds)),

  releasePipelineStages: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(memoizeForUI(releasePipelineStages))),

  getArtifacts: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(memoizeForUI(getArtifacts))),
});
