import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { byString, asc } from 'sort-lib';
import CommitTimeline from './commits/CommitTimeline.js';
import { DownChevron, UpChevron } from './common/Icons.js';
import { ProfilePic } from './common/ProfilePic.js';
import type { DevListing } from '../../backend/models/commits.js';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import Changes2 from './commits/Changes2.jsx';

type DeveloperProps = {
  item: DevListing;
  index: number;
};

const Developer2: React.FC<DeveloperProps> = ({ item, index }) => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const [isExpanded, setIsExpanded] = useState<boolean>(index === 0);
  const location = useLocation();

  type CommitsTimelineProp = {
    date: string;
    total: number;
  }[];
  const timelineProp = (commits: CommitsTimelineProp) => {
    const dateCommits: Record<string, number> = {};
    commits.forEach(commit => {
      dateCommits[commit.date] = commit.total;
    });

    return dateCommits;
  };

  const max =
    Math.max(
      ...item.allCommits.flatMap(obj =>
        obj.repoDailyCommits.map(dc => dc.dailyCommitsCount)
      )
    ) || 0;

  return (
    <div
      className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
        rounded-lg shadow relative workitem-body"
      style={{ contain: 'content' }}
    >
      <button
        className="w-full text-left flex justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex gap-3">
          <ProfilePic
            src={item.authorImage}
            alt={`${item.authorName}'s profile pic`}
            width="48"
            height="48"
            className="rounded-full inline-block"
          />
          <div>
            <h3 className="font-bold text-md">{item.authorName}</h3>
            <div className="text-base font-normal text-gray-600">
              <span className="text-blue-gray text-sm my-2">
                <span className="font-semibold text-base">{item.totalCommits}</span>
                {` ${item.totalCommits === 1 ? 'commit' : 'commits'} in `}
                <span className="font-semibold text-base">
                  {item.totalReposCommitted}
                </span>
                {` ${item.totalReposCommitted === 1 ? 'repo' : 'repos'}`}
              </span>
            </div>
          </div>
        </div>
        {isExpanded ? (
          <span className="flex text-gray-500">
            <span>Show less</span>
            <UpChevron />
          </span>
        ) : (
          <span className="flex text-gray-500">
            <span className="show-more">Show more</span>
            <DownChevron />
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="bg-gray-100 px-8 py-8 mt-4 rounded-lg">
          <table className="table-auto text-center divide-y divide-gray-200 w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  {' '}
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Commits
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Changes
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Timeline
                </th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
              {/* {dev.repos
                .sort(desc(byNum(r => sum(Object.values(r.byDate)))))
                .map(repo => (
                  <tr key={repo.name}>
                    <td className="px-6 py-4 text-left w-5/12">
                      <Link
                        to={location.pathname.replace(
                          '/devs',
                          `/repos?search="${repo.name}"`
                        )}
                        className="link-text"
                      >
                        {repo.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-1/12">
                      {sum(Object.values(repo.byDate))}
                    </td>
                    <td className="whitespace-nowrap">
                      <Changes changes={repo.changes} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-4/12">
                      <CommitTimeline
                        timeline={repo.byDate}
                        max={Math.max(...allCommits)}
                        queryPeriodDays={queryPeriodDays}
                      />
                    </td>
                  </tr>
                ))} */}
              {item.allCommits.sort(asc(byString(r => r.repoName))).map(repo => (
                <tr key={repo.repoName}>
                  <td className="px-6 py-4 text-left w-5/12">
                    <Link
                      to={location.pathname.replace(
                        '/devs',
                        `/repos?search="${repo.repoName}"`
                      )}
                      className="link-text"
                    >
                      {repo.repoName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-1/12">
                    {repo.repoCommitsCount}
                  </td>
                  <td className="whitespace-nowrap">
                    <Changes2
                      add={repo.repoAdd}
                      edit={repo.repoEdit}
                      deleteCount={repo.repoDelete}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-4/12">
                    <CommitTimeline
                      timeline={timelineProp(
                        repo.repoDailyCommits.map(c => ({
                          date: c.authorDate,
                          total: c.dailyCommitsCount,
                        }))
                      )}
                      max={max}
                      queryPeriodDays={queryPeriodDays}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="w-full text-right text-sm italic text-gray-500 mt-4">
            {`* Data shown is for the last ${queryPeriodDays} days, not including merge commits`}
          </p>
        </div>
      )}
    </div>
  );
};

export default Developer2;
