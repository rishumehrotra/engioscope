import React from 'react';
import { add } from 'rambda';
import ReactTooltip from 'react-tooltip';
import { Link, useHistory } from 'react-router-dom';
import type { RepoAnalysis } from '../../../shared/types';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import CommitTimeline from '../commits/CommitTimeline';
import { ProfilePic } from '../common/ProfilePic';
import Changes from '../commits/Changes';

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
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Changes</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Timeline</th>
                  </tr>
                </thead>
                <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
                  {commits.byDev.map(commitsByDev => {
                    const history = useHistory();
                    const developerUrl = () => history.location.pathname.replace('/repos', `/devs?search="${commitsByDev.name}"`);

                    return (
                      <tr key={commitsByDev.name}>
                        <td className="px-6 py-4 text-left capitalize text-sm link-text">
                          <ProfilePic
                            alt={`Profile pic for ${commitsByDev.name}`}
                            src={commitsByDev.imageUrl}
                            width="44"
                            height="44"
                            className="rounded-full inline-block mr-2"
                          />
                          <Link to={developerUrl}>{commitsByDev.name}</Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {Object.values(commitsByDev.byDate).reduce(add, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Changes changes={commitsByDev.changes} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CommitTimeline
                            timeline={commitsByDev.byDate}
                            max={max}
                          />
                        </td>
                      </tr>
                    );
                  })}
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
