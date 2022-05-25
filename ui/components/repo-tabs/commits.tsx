import React from 'react';
import { add, sum } from 'rambda';
import type { Location } from 'react-router-dom';
import { Link } from 'react-router-dom';
import type { RepoAnalysis } from '../../../shared/types';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';
import CommitTimeline from '../commits/CommitTimeline';
import { ProfilePic } from '../common/ProfilePic';
import Changes from '../commits/Changes';
import type { Dev } from '../../types';

export default (
  repo: RepoAnalysis,
  aggregatedDevs: Record<string, Dev>,
  location: Location,
  queryPeriodDays: number
): Tab => {
  const { commits } = repo;
  const max = Math.max(...Object.values(commits.byDev).flatMap(d => Object.values(d.byDate)));
  const subtitle = (devName: string) => {
    const excludedRepos = aggregatedDevs[devName].repos.filter(r => r.name !== repo.name);
    const commitCount = excludedRepos.flatMap(r => Object.values(r.byDate)).reduce(add, 0);
    return excludedRepos.length > 0
      ? `${commitCount} commits in ${excludedRepos.length} other ${excludedRepos.length === 1 ? 'repo' : 'repos'}`
      : 'No commits in other repos';
  };

  return {
    title: 'Commits',
    count: commits.count,
    content: () => (
      <TabContents gridCols={1}>
        {commits.count === 0
          ? (
            <AlertMessage message="No commits to this repo in the last three months" />
          )
          : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th> </th>
                    <th>Commits</th>
                    <th>Changes</th>
                    <th>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {commits.byDev.map(commitsByDev => {
                    const developerUrl = location.pathname.replace('/repos', `/devs?search="${commitsByDev.name}"`);

                    return (
                      <tr key={commitsByDev.name}>
                        <td className="text-sm">
                          <Link to={developerUrl} className="flex commits-profile">
                            <ProfilePic
                              alt={`Profile pic for ${commitsByDev.name}`}
                              src={commitsByDev.imageUrl}
                              width="44"
                              height="44"
                              className="rounded-full inline-block mr-2"
                            />
                            <div>
                              <span className="dev-name font-bold text-blue-600 capitalize">
                                {commitsByDev.name}
                              </span>
                              <p className="text-gray-500 hover:no-underline">
                                {subtitle(commitsByDev.name)}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td>
                          {sum(Object.values(commitsByDev.byDate))}
                        </td>
                        <td>
                          <Changes changes={commitsByDev.changes} />
                        </td>
                        <td>
                          <CommitTimeline
                            timeline={commitsByDev.byDate}
                            max={max}
                            queryPeriodDays={queryPeriodDays}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="w-full text-right text-sm italic text-gray-500 mt-4">
                {`* Data shown is for the last ${queryPeriodDays} days, not including merge commits`}
              </div>
            </>
          )}
      </TabContents>
    )
  };
};
