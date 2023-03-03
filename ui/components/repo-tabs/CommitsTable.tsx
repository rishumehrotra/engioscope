import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { trpc } from '../../helpers/trpc.js';
import { useDateRange } from '../../hooks/date-range-hooks.jsx';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';

import CommitTimeline from '../commits/CommitTimeline.jsx';
import AlertMessage from '../common/AlertMessage.jsx';
import { ProfilePic } from '../common/ProfilePic.jsx';
import CommitChanges from './CommitChanges.jsx';
import TabContents from './TabContents.jsx';

const CommitsTable: React.FC<{
  repositoryId: string;
  queryPeriodDays: number;
}> = ({ repositoryId, queryPeriodDays }) => {
  const { collectionName, project } = useCollectionAndProject();
  const dateRange = useDateRange();
  const location = useLocation();
  const commitsDetails = trpc.commits.getRepoCommitsDetails.useQuery({
    collectionName,
    project,
    repositoryId,
    ...dateRange,
  });

  const max = commitsDetails.data
    ? Math.max(...commitsDetails.data.flatMap(obj => obj.daily.map(item => item.total)))
    : 0;
  type CommitsParam = {
    date: string;
    total: number;
  };

  const timelineProp = (commits: CommitsParam[]) => {
    const dateCommits: Record<string, number> = {};
    commits.forEach(commit => {
      dateCommits[commit.date] = commit.total;
    });

    return dateCommits;
  };

  if (!commitsDetails.data) return null;
  return (
    <TabContents gridCols={1}>
      {commitsDetails.data.length === 0 ? (
        <AlertMessage message="No commits to this repo in the last three months" />
      ) : (
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
              {commitsDetails.data.map(commits => {
                const developerUrl = location.pathname.replace(
                  '/repos',
                  `/devs?search="${commits.authorName}"`
                );

                return (
                  <tr key={commits.authorEmail}>
                    <td className="text-sm">
                      <Link to={developerUrl} className="flex commits-profile">
                        <ProfilePic
                          alt={`Profile pic for ${commits.authorName}`}
                          src={commits.authorImageUrl}
                          width="44"
                          height="44"
                          className="rounded-full inline-block mr-2"
                        />
                        <div>
                          <span className="dev-name font-bold text-blue-600 capitalize">
                            {commits.authorName}
                          </span>
                          <p className="text-gray-500 hover:no-underline">
                            {/*  Other Commits */}
                            {commits.otherCommits === 0
                              ? `No commits in other repos`
                              : `${commits.otherCommits} commits in ${
                                  commits.allRepos.length - 1
                                } repos`}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td>{commits.repoCommits}</td>
                    {/* Changes */}
                    <td>
                      <CommitChanges
                        add={commits.totalAdd}
                        edit={commits.totalEdit}
                        totalDelete={commits.totalDelete}
                      />
                    </td>
                    <td>
                      {/* TimeLine Cell */}
                      <CommitTimeline
                        timeline={timelineProp(commits.daily)}
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
            <br />
            <p className="text-green-500">Commits v2 : Powered By MongoDB</p>
          </div>
        </>
      )}
    </TabContents>
  );
};

export default CommitsTable;
