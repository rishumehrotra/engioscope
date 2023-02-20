import {
  getArtifacts,
  paginatedReleaseIds,
  paginatedReleaseIdsInputParser,
  pipelineFiltersInputParser,
  releasePipelineStages,
  releasePipelineDetailsInputParser,
  summary,
  usageByEnvironment,
} from '../../models/release-listing.js';
import { memoizeForUI, passInputTo, t } from './trpc.js';

export default t.router({
  summary: t.procedure
    .input(pipelineFiltersInputParser)
    .query(passInputTo(memoizeForUI(summary))),

  usageByEnvironment: t.procedure
    .input(pipelineFiltersInputParser)
    .query(passInputTo(usageByEnvironment)),

  paginatedReleases: t.procedure
    .input(paginatedReleaseIdsInputParser)
    .query(passInputTo(memoizeForUI(paginatedReleaseIds))),

  releasePipelineStages: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(memoizeForUI(releasePipelineStages))),

  getArtifacts: t.procedure
    .input(releasePipelineDetailsInputParser)
    .query(passInputTo(memoizeForUI(getArtifacts))),
});
