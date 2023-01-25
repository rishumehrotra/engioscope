import { useParams } from 'react-router-dom';
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
  };
};
