import React from 'react';
import { add } from 'rambda';
import ReactTooltip from 'react-tooltip';
import type { RepoAnalysis } from '../../../shared/types';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import { num } from '../../helpers/utils';
import CommitTimeline from '../CommitTimeline';
import { ProfilePic } from '../ProfilePic';

export default (commits: RepoAnalysis['commits']): Tab => {
  const max = Math.max(...Object.values(commits.byDev).flatMap(d => Object.values(d.byDate)));
  return {
    title: 'Commits',
    count: commits.count,
    content: () => (
      <TabContents gridCols={1}>
        <ReactTooltip />
        {commits.count === 0
          ? (
            <AlertMessage message="No commits to this repo in the last month" />
          )
          : (
            <>
              <table className="table-auto text-center divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider"> </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Commits</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider" colSpan={3}>Changes</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Timeline</th>
                  </tr>
                </thead>
                <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                  {commits.byDev.map(commitsByDev => (
                    <tr key={commitsByDev.name}>
                      <td className="px-6 py-4 text-left capitalize">
                        <ProfilePic
                          alt={`Profile pic for ${commitsByDev.name}`}
                          src={commitsByDev.imageUrl}
                          width="44"
                          height="44"
                          className="rounded-full inline-block mr-2"
                        />
                        {commitsByDev.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {Object.values(commitsByDev.byDate).reduce(add, 0)}
                      </td>
                      <td className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-green-700">
                        <p data-tip={`Added ${num(commitsByDev.changes.add)} files`}>
                          {commitsByDev.changes.add
                            ? `+${num(commitsByDev.changes.add)}`
                            : ' '}
                        </p>
                      </td>
                      <td
                        data-tip={`Modified ${num(commitsByDev.changes.edit)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-400"
                      >
                        {commitsByDev.changes.edit
                          ? `~${num(commitsByDev.changes.edit)}`
                          : ' '}
                      </td>
                      <td
                        data-tip={`Deleted code in ${num(commitsByDev.changes.delete)} files`}
                        className="pl-0 pr-2 py-4 whitespace-nowrap text-right text-red-700"
                      >
                        {commitsByDev.changes.delete
                          ? `-${num(commitsByDev.changes.delete)}`
                          : ' '}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CommitTimeline
                          timeline={commitsByDev.byDate}
                          max={max}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="w-full text-right text-sm italic text-gray-500 mt-4">
                <span>* Data shown is for the last 30 days, not including merge commits</span>
              </div>
            </>
          )}
      </TabContents>
    )
  };
};
