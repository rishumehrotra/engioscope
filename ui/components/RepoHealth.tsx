import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import Card from './ExpandingCard';
import RepoHealthDetails from './RepoHealthDetails';

const repoSubtitle = (languages: Record<string, string> | undefined) => (languages
  ? [
    Object.keys(languages)[0],
    `(${Object.values(languages)[0]})`
  ].join(' ')
  : undefined);

const RepoHealth: React.FC<{repo:RepoAnalysis}> = ({ repo }) => (
  <Card
    title={repo.name}
    subtitle={repoSubtitle(repo.languages)}
    tabs={repo.indicators.map(indicator => ({
      title: indicator.name,
      count: indicator.count,
      content: <RepoHealthDetails
        indicators={indicator.indicators}
        gridCols={5}
      />
    }))}
  />
);

export default RepoHealth;
