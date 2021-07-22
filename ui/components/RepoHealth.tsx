import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import { num } from '../helpers';
import Card from './ExpandingCard';
import Metric from './Metric';
import RepoHealthDetails from './RepoHealthDetails';

const repoSubtitle = (languages: Record<string, string> | undefined) => (languages
  ? [
    Object.keys(languages)[0],
    `(${Object.values(languages)[0]})`
  ].join(' ')
  : undefined);

const TabContents: React.FC<{ gridCols?: number }> = ({ gridCols, children }) => (
  <div className={`grid ${gridCols === 6 ? 'grid-cols-6' : 'grid-cols-5'} gap-4 p-6 py-6 rounded-lg bg-gray-100`}>
    {children}
  </div>
);

const RepoHealth: React.FC<{repo:RepoAnalysis}> = ({ repo }) => (
  <Card
    title={repo.name}
    subtitle={repoSubtitle(repo.languages)}
    tabs={[
      {
        title: 'Builds',
        count: repo.builds?.count || 0,
        content: (
          <TabContents>
            {repo.builds
              ? (
                <>
                  <Metric name="Total successful" value={num(repo.builds.success)} />
                  <Metric name="Number of executions" value={num(repo.builds.count)} />
                  <Metric name="Success rate" value={`${Math.round((repo.builds.success * 100) / repo.builds.count)}%`} />
                  <Metric
                    name="Average duration"
                    value={repo.builds.duration.average}
                    additionalValue={`${repo.builds.duration.min} - ${repo.builds.duration.max}`}
                  />
                  <Metric
                    name="Current status"
                    value={repo.builds.status.type}
                    additionalValue={repo.builds.status.type === 'failed' ? repo.builds.status.since : undefined}
                  />
                </>
              )
              : (<div>No builds for this repo</div>)}
          </TabContents>
        )
      },
      ...repo.indicators.map(indicator => ({
        title: indicator.name,
        count: indicator.count,
        content: <RepoHealthDetails
          indicators={indicator.indicators}
          gridCols={5}
        />
      }))
    ]}
  />
);

export default RepoHealth;
