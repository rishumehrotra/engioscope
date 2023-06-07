import React from 'react';
import DrawerTabs from './DrawerTabs.jsx';
import { useQueryContext } from '../../hooks/query-hooks.js';
import useQueryParam, { asString } from '../../hooks/use-query-param.js';
import { trpc } from '../../helpers/trpc.js';

// const TabBody:React.FC<> = ( { children } ) => {
//   return <div>{children}</div>;
// }

const YAMLPipelinesDrawer: React.FC<{
  totalPipelines: number;
  yamlPipelines: number;
}> = ({ totalPipelines, yamlPipelines }) => {
  const [search] = useQueryParam('search', asString);
  const [selectedGroupLabels] = useQueryParam('group', asString);
  const queryContext = useQueryContext();
  const repoListingWithPipelineCount =
    trpc.repos.getRepoListingWithPipelineCount.useQuery({
      queryContext,
      searchTerm: search || undefined,
      groupsIncluded: selectedGroupLabels ? selectedGroupLabels.split(',') : undefined,
    });

  return (
    <DrawerTabs
      tabs={[
        {
          title: `Not using YAML (${totalPipelines - yamlPipelines})`,
          key: 'non-yaml',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            return (
              <div className="p-3">
                <table className="w-full border-collapse border border-slate-400">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 text-left  p-2">
                        Repositories
                      </th>
                      <th className="border border-slate-300 text-right p-2">
                        Pipelines
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoListingWithPipelineCount?.data
                      ?.filter(repoPipelines => repoPipelines.nonYaml > 0)
                      ?.map(repoPipelines => (
                        <tr key={repoPipelines.repositoryId}>
                          <td className="border border-slate-300 p-2">
                            {repoPipelines.name}
                          </td>
                          <td className="border border-slate-300 p-2 text-right ">
                            {repoPipelines.nonYaml}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          },
        },
        {
          title: `Using YAML (${yamlPipelines})`,
          key: 'yaml',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            return (
              <div className="p-3">
                <table className="w-full border-collapse border border-slate-400">
                  <thead>
                    <tr className="p-2">
                      <th className="border border-slate-300 text-left p-2">
                        Repositories
                      </th>
                      <th className="border border-slate-300 p-2 text-right ">
                        Pipelines
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoListingWithPipelineCount?.data
                      ?.filter(repoPipelines => repoPipelines.yaml > 0)
                      ?.map(repoPipelines => (
                        <tr key={repoPipelines.repositoryId} className="p-2">
                          <td className="border border-slate-300 p-2">
                            {repoPipelines.name}
                          </td>
                          <td className="border border-slate-300 p-2 text-right ">
                            {repoPipelines.yaml}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          },
        },
        {
          title: `All pipelines (${totalPipelines})`,
          key: 'all',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => {
            return (
              <div className="p-3">
                <table className="w-full border-collapse border border-slate-400">
                  <thead>
                    <tr className="p-2">
                      <th className="border border-slate-300 text-left  p-2">
                        Repositories
                      </th>
                      <th className="border border-slate-300  p-2 text-right ">
                        Not Using Yaml
                      </th>
                      <th className="border border-slate-300  p-2 text-right ">
                        All Pipelines
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {repoListingWithPipelineCount?.data?.map(repoPipelines => (
                      <tr key={repoPipelines.repositoryId} className="p-2">
                        <td className="border border-slate-300 p-2">
                          {repoPipelines.name}
                        </td>
                        <td className="border border-slate-300 p-2 text-right ">
                          {repoPipelines.nonYaml}
                        </td>
                        <td className="border border-slate-300 p-2 text-right ">
                          {repoPipelines.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          },
        },
      ]}
    />
  );
};

export default YAMLPipelinesDrawer;
