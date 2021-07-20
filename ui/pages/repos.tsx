import React from 'react';
import { RepoAnalysis } from '../../shared/types';
import RepoHealth from '../components/RepoHealth';

const Repos:React.FC<{repos: RepoAnalysis[]}> = ({ repos }) => (
  <div>
    {
      repos.length ? repos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : 'No Results'
    }
  </div>
);

export default Repos;
