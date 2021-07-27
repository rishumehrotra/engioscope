import React from 'react';
import { RepoAnalysis } from '../../../shared/types';
import { mediumDate, num } from '../../helpers';
import { Tab } from '../ExpandingCard';
import Metric from '../Metric';
import TabContents from './TabContents';

export default (defaultBranch: string, branches: RepoAnalysis['branches']): Tab => ({
  title: 'Branches',
  count: branches.total,
  content: (
    <>
      <TabContents>
        <Metric name="Total" value={num(branches.total)} tooltip="Total number of branches in the repository" position="first" />
        <Metric name="Active" value={num(branches.active)} tooltip="Active development branches in-sync with master" />
        <Metric
          name="Abandoned"
          value={num(branches.abandoned)}
          tooltip="Inactive development branches which are out-of-sync with master, but contain commits which are not present on master"
        />
        <Metric
          name="Delete candidates"
          value={num(branches.deleteCandidates)}
          tooltip="Inactive development branches which are in-sync with master"
        />
        <Metric
          name="Possibly conflicting"
          value={num(branches.possiblyConflicting)}
          tooltip="Branches that are significantly out of sync with master"
          position="last"
        />
      </TabContents>

      {branches.significantlyAhead.branches.length ? (
        <TabContents gridCols={0}>
          <p className="text-gray-600 italic">
            The following
            {' '}
            {branches.significantlyAhead.branches.length > 1 ? 'branches are' : 'branch is'}
            {' '}
            signnificantly ahead of
            {' '}
            <code className="border-gray-300 border-2 rounded-md px-1 py-0 bg-gray-50">{defaultBranch}</code>
            {' '}
            (the default branch).
            {' '}
            {branches.significantlyAhead.branches.find(b => ['develop', 'development'].includes(b.name)) && (
              <a
                href="https://docs.microsoft.com/en-us/azure/devops/repos/git/change-default-branch?view=azure-devops"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Is the default branch configured correctly?
              </a>
            )}
          </p>
          <table width="100%" className="table-auto text-center divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Ahead by</th>
                <th className="pl-6 pr-0 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Last commit</th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
              {branches.significantlyAhead.branches.map(branch => (
                <tr key={branch.name}>
                  <td className="pl-6 py-4 whitespace-nowrap text-left">
                    <a href={branch.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {branch.name}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {branch.aheadBy}
                    {' '}
                    commits
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{mediumDate(new Date(branch.lastCommitDate))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabContents>
      ) : null}
    </>
  )
});
