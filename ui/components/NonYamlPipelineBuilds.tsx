import React, { useCallback, useState } from 'react';
import { trpc } from '../helpers/trpc.js';
import { useDateRange } from '../hooks/date-range-hooks.jsx';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import useQueryParam, { asString } from '../hooks/use-query-param.js';
import NonYamlPipelineBuildDefs from './NonYamlPipelineBuildDefs.jsx';

type NonYamlPipeLineBuildProps = {
  queryPeriodDays: number;
};

const NonYamlPipeLineBuilds: React.FC<NonYamlPipeLineBuildProps> = ({
  queryPeriodDays,
}) => {
  const dateRange = useDateRange();
  const { collectionName, project } = useCollectionAndProject();
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asString);

  const [openedRepos, setOpenedRepos] = useState<string[]>([]);

  const nonYamlBuildRepos = trpc.repos.getNonYamlPipelines.useQuery({
    collectionName,
    project,
    searchTerm: search || undefined,
    groupsIncluded: selectedGroupLabels ? selectedGroupLabels.split(',') : undefined,
    ...dateRange,
  });

  const handleRepoToggle = useCallback(
    (repositoryId: string) => () => {
      if (openedRepos.includes(repositoryId)) {
        setOpenedRepos(openedRepos.filter(r => r !== repositoryId));
      } else {
        setOpenedRepos([...openedRepos, repositoryId]);
      }
    },
    [openedRepos]
  );

  if (!nonYamlBuildRepos.data) return null;

  return (
    <>
      {nonYamlBuildRepos.data.map((repo, index) => {
        return (
          <details
            key={repo.repositoryId}
            className="mb-3"
            open={index === 0}
            onToggle={handleRepoToggle(repo.repositoryId)}
          >
            <summary className="font-semibold text-lg cursor-pointer">
              {`${repo.name} (${repo.total})`}
            </summary>
            {openedRepos.includes(repo.repositoryId) ? (
              <NonYamlPipelineBuildDefs
                repositoryId={repo.repositoryId}
                queryPeriodDays={queryPeriodDays}
              />
            ) : null}
          </details>
        );
      })}
    </>
  );
};

export default NonYamlPipeLineBuilds;
