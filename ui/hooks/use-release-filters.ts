import { useParams } from 'react-router-dom';
import { useDateRange } from './date-range-hooks.jsx';
import useQueryParam, { asBoolean, asString, asStringArray } from './use-query-param.js';

type ReleaseFilters = {
  collectionName: string;
  project: string;
  searchTerm?: string;
  nonMasterReleases?: boolean;
  notStartingWithBuildArtifact?: boolean;
  stageNameContaining?: string;
  stageNameUsed?: string;
  notConfirmingToBranchPolicies?: boolean;
  repoGroups?: string[];
  startDate: Date;
  endDate: Date;
};

export default (): ReleaseFilters => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [search] = useQueryParam('search', asString);
  const [nonMasterReleases] = useQueryParam('nonMasterReleases', asBoolean);
  const [notStartsWithArtifact] = useQueryParam('notStartsWithArtifact', asBoolean);
  const [stageNameExists] = useQueryParam('stageNameExists', asString);
  const [stageNameExistsNotUsed] = useQueryParam('stageNameExistsNotUsed', asString);
  const [nonPolicyConforming] = useQueryParam('nonPolicyConforming', asBoolean);
  const [selectedGroupLabels] = useQueryParam('group', asStringArray);
  const dateRange = useDateRange();

  if (!collection || !project) {
    throw new Error("Couldn't find a collection or project");
  }

  return {
    collectionName: collection,
    project,
    searchTerm: search,
    nonMasterReleases,
    notStartingWithBuildArtifact: notStartsWithArtifact,
    stageNameContaining: stageNameExists,
    stageNameUsed: stageNameExistsNotUsed,
    notConfirmingToBranchPolicies: nonPolicyConforming,
    repoGroups: selectedGroupLabels,
    ...dateRange,
  };
};
