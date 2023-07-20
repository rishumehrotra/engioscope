import React, { useState } from 'react';
import { byString, byNum } from 'sort-lib';
import { twJoin } from 'tailwind-merge';
import { Calendar, GitCommit } from 'react-feather';
import { prop } from 'rambda';
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
    Math.max(...item.repos.flatMap(r => r.dailyCommits.map(prop('count')))) || 0;

  return (
    <div
      className={twJoin(
        'bg-theme-page-content rounded-lg shadow-sm mb-4 overflow-hidden',
        'border border-theme-seperator group'
      )}
    >
      <button
        className="w-full text-left flex justify-between p-6"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="grid grid-cols-[min-content_1fr] gap-x-4 gap-y-3 items-start">
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
              {item.totalCommits ?? '...'} commits in {item.repos.length ?? '...'}{' '}
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
          <div className="text-sm">
            <div className="flex gap-2">
              {item.repos ? (
                <span className="text-theme-success">
                  + {item.repos.reduce((acc, commit) => acc + commit.add, 0)}
                </span>
              ) : null}
              {item.repos ? (
                <span className="text-theme-warn">
                  ~ {item.repos.reduce((acc, commit) => acc + commit.edit, 0)}
                </span>
              ) : null}
              {item.repos ? (
                <span className="text-theme-danger">
                  - {item.repos.reduce((acc, commit) => acc + commit.delete, 0)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="self-end">
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
        <div className="border-t border-t-theme-seperator">
          <SortableTable
            data={item.repos}
            rowKey={prop('name')}
            variant="default"
            defaultSortColumnIndex={1}
            columns={[
              {
                title: 'Repository name',
                key: 'repository name',

                // eslint-disable-next-line react/no-unstable-nested-components
                value: repository =>
                  repository.url ? (
                    <a
                      href={repository.url}
                      target="_blank"
                      rel="noreferrer"
                      data-tooltip-id="react-tooltip"
                      data-tooltip-content={repository.name}
                      className="link-text truncate w-full"
                    >
                      {repository.name}
                    </a>
                  ) : (
                    repository.name
                  ),

                sorter: byString(prop('name')),
              },
              {
                title: 'Commits',
                key: 'commits',
                value: repository => repository.commitCount,
                sorter: byNum(prop('commitCount')),
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
                          + {repository.add || 0}
                        </span>

                        <span className="text-theme-warn">~ {repository.edit || 0}</span>

                        <span className="text-theme-danger">
                          - {repository.delete || 0}
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
                      repository.dailyCommits.map(c => ({
                        date: c.date,
                        total: c.count,
                      }))
                    )}
                    max={max}
                    queryPeriodDays={queryPeriodDays}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default Developer;
