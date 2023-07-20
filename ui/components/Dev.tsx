import React, { useState } from 'react';
import { byString, byNum } from 'sort-lib';
import { twJoin } from 'tailwind-merge';
import { Calendar, GitCommit } from 'react-feather';
import CommitTimeline from './commits/CommitTimeline.jsx';
import { ProfilePic } from './common/ProfilePic.jsx';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { relativeTime, timelineProp } from '../helpers/utils.js';
import SortableTable from './common/SortableTable.jsx';
import type { RouterClient } from '../helpers/trpc.js';

type DeveloperProps = {
  item: RouterClient['commits']['getSortedDevListing']['items'][number];
  index: number;
};

const Developer: React.FC<DeveloperProps> = ({ item, index }) => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const [isExpanded, setIsExpanded] = useState<boolean>(index === 0);
  const max =
    Math.max(
      ...item.allCommits.flatMap(obj =>
        obj.repoDailyCommits.map(dc => dc.dailyCommitsCount)
      )
    ) || 0;

  return (
    <div
      // className="bg-white border-l-4 p-6 mb-4 transition-colors duration-500 ease-in-out
      //   rounded-lg shadow relative group"
      className="bg-theme-page-content rounded-lg shadow-sm mb-4 border border-theme-seperator overflow-hidden group"
      style={{ contain: 'content' }}
    >
      <button
        className="w-full text-left flex justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-4 grid grid-cols-[min-content_1fr] gap-2 items-start">
          <div className="justify-self-center">
            <ProfilePic
              src={item.authorImage}
              className={twJoin(
                'inline-block object-cover max-w-[48px] max-h-[48px]',
                'rounded-full bg-theme-tag border border-theme-page-content'
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold">{item.authorName}</h3>
            <div className="text-sm text-theme-helptext">
              {item.totalCommits ?? '...'} commits in {item.totalReposCommitted ?? '...'}{' '}
              repositories
            </div>
          </div>
          <div className="justify-self-center text-theme-icon">
            <Calendar size={18} />
          </div>
          <div className="text-sm text-theme-helptext">
            Committed {item.latestCommit ? relativeTime(item.latestCommit) : '...'}
          </div>
          <div className="justify-self-center text-theme-icon">
            <GitCommit size={18} />
          </div>
          <div className="text-sm min-h-[2.5rem]">
            <div className="flex gap-2">
              {item.allCommits ? (
                <span className="text-theme-success">
                  + {item.allCommits.reduce((acc, commit) => acc + commit.repoAdd, 0)}
                </span>
              ) : null}
              {item.allCommits ? (
                <span className="text-theme-warn">
                  ~ {item.allCommits.reduce((acc, commit) => acc + commit.repoEdit, 0)}
                </span>
              ) : null}
              {item.allCommits ? (
                <span className="text-theme-danger">
                  - {item.allCommits.reduce((acc, commit) => acc + commit.repoDelete, 0)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="p-4 grid grid-row-[min-content_1fr] gap-2 items-start">
          <div>
            {/* <CommitTimeline             
              timeline={
                timelineProp()
              }
              max={max}
              queryPeriodDays={queryPeriodDays}
            /> */}
          </div>
          <div>
            {isExpanded ? (
              <span className="flex text-theme-highlight">
                <span>Show less</span>
              </span>
            ) : (
              <span className="flex text-theme-highlight">
                <span>Show more</span>
              </span>
            )}
          </div>
        </div>
      </button>
      {isExpanded && (
        <SortableTable
          data={item.allCommits}
          rowKey={row => String(row.repoName)}
          variant="default"
          defaultSortColumnIndex={1}
          columns={[
            {
              title: 'Repository name',
              key: 'repository name',

              // eslint-disable-next-line react/no-unstable-nested-components
              value: repository =>
                repository.repoUrl ? (
                  <a
                    href={repository.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content={repository.repoName}
                    className="link-text truncate w-full"
                  >
                    {repository.repoName}
                  </a>
                ) : (
                  repository.repoName
                ),

              sorter: byString(x => x.repoName),
            },
            {
              title: 'Commits',
              key: 'commits',
              value: repository => repository.repoCommitsCount,
              sorter: byNum(x => x.repoCommitsCount),
            },
            {
              title: 'Changes',
              key: 'changes',
              // eslint-disable-next-line react/no-unstable-nested-components
              value: repository => {
                return (
                  <div className="text-sm min-h-[2.5rem] flex flex-row justify-end">
                    <div className="flex gap-2">
                      <span className="text-theme-success">
                        + {repository.repoAdd || 0}
                      </span>

                      <span className="text-theme-warn">
                        ~ {repository.repoEdit || 0}
                      </span>

                      <span className="text-theme-danger">
                        - {repository.repoDelete || 0}
                      </span>
                    </div>
                  </div>
                );
              },
            },
            {
              title: 'Date',
              key: 'date',
              // eslint-disable-next-line react/no-unstable-nested-components
              value: repository => (
                <CommitTimeline
                  timeline={timelineProp(
                    repository.repoDailyCommits.map(c => ({
                      date: c.authorDate,
                      total: c.dailyCommitsCount,
                    }))
                  )}
                  max={max}
                  queryPeriodDays={queryPeriodDays}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default Developer;
