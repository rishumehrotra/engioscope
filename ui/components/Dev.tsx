import React, { useState } from 'react';
import { byString, byNum, byDate } from 'sort-lib';
import { twJoin } from 'tailwind-merge';
import { Calendar, GitCommit } from 'react-feather';
import { prop } from 'rambda';
import { Link } from 'react-router-dom';
import CommitTimeline, { timelineProp } from './commits/CommitTimeline.jsx';
import { ProfilePic } from './common/ProfilePic.jsx';
import useQueryPeriodDays from '../hooks/use-query-period-days.js';
import { num, relativeTime } from '../helpers/utils.js';
import SortableTable from './common/SortableTable.jsx';
import type { RouterClient } from '../helpers/trpc.js';
import AnimateHeight from './common/AnimateHeight.jsx';

type DeveloperProps = {
  item: RouterClient['commits']['getSortedDevListing']['items'][number];
  index: number;
};

const Developer: React.FC<DeveloperProps> = ({ item, index }) => {
  const [queryPeriodDays] = useQueryPeriodDays();
  const [expandedState, setExpandedState] = useState<'open' | 'closing' | 'closed'>(
    index === 0 ? 'open' : 'closed'
  );
  const max =
    Math.max(...item.repos.flatMap(r => r.dailyCommits.map(prop('count')))) || 0;

  return (
    <div
      className={twJoin(
        'bg-theme-page-content rounded-lg mb-4',
        'border border-theme-seperator group',
        'hover:shadow-md transition-shadow duration-200',
        expandedState === 'closed' ? 'shadow-sm' : 'shadow-md'
      )}
    >
      <button
        className="w-full text-left flex justify-between p-6"
        onClick={() => setExpandedState(x => (x === 'open' ? 'closing' : 'open'))}
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
            <h3
              className={twJoin(
                'font-semibold group-hover:text-theme-highlight',
                expandedState !== 'closed' && 'text-theme-highlight'
              )}
            >
              {item.authorName}
            </h3>
            <div className="text-sm text-theme-helptext">
              {num(item.totalCommits)} commits in {num(item.repos.length)} repositories
            </div>
          </div>
          <div className="justify-self-center text-theme-icon">
            <Calendar size={18} />
          </div>
          <div className="text-sm text-theme-helptext">
            Committed {relativeTime(item.latestCommit)}
          </div>
          <div className="justify-self-center text-theme-icon">
            <GitCommit size={18} />
          </div>
          <div className="text-sm">
            <div className="flex gap-2">
              {item.repos ? (
                <span className="text-theme-success">
                  + {num(item.repos.reduce((acc, commit) => acc + commit.add, 0))}
                </span>
              ) : null}
              {item.repos ? (
                <span className="text-theme-warn">
                  ~ {num(item.repos.reduce((acc, commit) => acc + commit.edit, 0))}
                </span>
              ) : null}
              {item.repos ? (
                <span className="text-theme-danger">
                  - {num(item.repos.reduce((acc, commit) => acc + commit.delete, 0))}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="self-end text-right pr-2">
          <CommitTimeline
            timeline={timelineProp(
              [
                ...item.repos.reduce((acc, repo) => {
                  repo.dailyCommits.forEach(commit => {
                    acc.set(commit.date, (acc.get(commit.date) || 0) + commit.count);
                  });
                  return acc;
                }, new Map<string, number>()),
              ]
                .map(([date, total]) => ({ date, total }))
                .sort(byDate(x => new Date(x.date)))
            )}
            max={max}
            queryPeriodDays={queryPeriodDays}
          />
          <span className="text-theme-highlight inline-block mt-6">
            {expandedState === 'open' ? 'Show less' : 'Show more'}
          </span>
        </div>
      </button>
      {expandedState !== 'closed' && (
        <AnimateHeight
          collapse={expandedState === 'closing'}
          onCollapsed={() => setExpandedState('closed')}
        >
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
                  value: repository => (
                    <Link
                      to={`../repos?search="${repository.name}"`}
                      className="link-text truncate w-full"
                    >
                      {repository.name}
                    </Link>
                  ),
                  sorter: byString(prop('name')),
                },
                {
                  title: 'Commits',
                  key: 'commits',
                  value: repository => num(repository.commitCount),
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
                            + {num(repository.add)}
                          </span>

                          <span className="text-theme-warn">
                            ~ {num(repository.edit)}
                          </span>

                          <span className="text-theme-danger">
                            - {num(repository.delete)}
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
                      className="inline-block"
                    />
                  ),
                },
              ]}
            />
          </div>
        </AnimateHeight>
      )}
    </div>
  );
};

export default Developer;
