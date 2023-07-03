import useQueryParam, { asBoolean, asString, asStringArray } from './use-query-param.js';
import { useQueryContext } from './query-hooks.js';
import type { QueryContext } from '../../backend/models/utils.js';

type ReleaseFilters = {
  queryContext: QueryContext;
  searchTerm?: string;
  nonMasterReleases?: boolean;
  notStartingWithBuildArtifact?: boolean;
  stageNameContaining?: string;
  stageNameUsed?: string;
  notConfirmingToBranchPolicies?: boolean;
  repoGroups?: string[];
  teams?: string[];
};

export default (): ReleaseFilters => {
  const queryContext = useQueryContext();
  const [search] = useQueryParam('search', asString);
  const [nonMasterReleases] = useQueryParam('nonMasterReleases', asBoolean);
  const [notStartsWithArtifact] = useQueryParam('notStartsWithArtifact', asBoolean);
  const [stageNameExists] = useQueryParam('stageNameExists', asString);
  const [stageNameExistsNotUsed] = useQueryParam('stageNameExistsNotUsed', asString);
  const [nonPolicyConforming] = useQueryParam('nonPolicyConforming', asBoolean);
  const [selectedGroupLabels] = useQueryParam('group', asStringArray);
  const [teams] = useQueryParam('teams', asStringArray);

  return {
    queryContext,
    searchTerm: search,
    nonMasterReleases,
    notStartingWithBuildArtifact: notStartsWithArtifact,
    stageNameContaining: stageNameExists,
    stageNameUsed: stageNameExistsNotUsed,
    notConfirmingToBranchPolicies: nonPolicyConforming,
    repoGroups: selectedGroupLabels,
    teams,
  };
};
