import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import RepoHealth from '../components/RepoHealth';
import SearchInput from '../components/SearchInput';
import { UpChevron, DownChevron } from '../components/Icons';
import Select from '../components/Select';
import { ProjectAnalysis, RepoAnalysis } from '../../shared-types';

const fetchProjectMetrics = (collection: string, project: string) => (
  fetch(`/api/${collection}_${project}.json`).then(res => res.json())
);

const Project: React.FC = () => {
  const [repoAnalysis, setRepoAnalysis] = useState<ProjectAnalysis | undefined>();
  const [searchString, setSearchString] = useState<string>('');
  const [sort, setSort] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<string>('Builds');
  const { collection, project } = useParams<{ collection: string, project: string }>();

  useEffect(() => {
    fetchProjectMetrics(collection, project).then(setRepoAnalysis);
  }, [collection, project]);

  if (!repoAnalysis) return <div>Loading...</div>;

  const sortByIndicators = (sortBy: string) => (a: RepoAnalysis, b: RepoAnalysis) => {
    const branchRatingA = a.indicators.find(indicator => indicator.name === sortBy)?.count;
    const branchRatingB = b.indicators.find(indicator => indicator.name === sortBy)?.count;
    if (branchRatingA && branchRatingB) {
      return (branchRatingA > branchRatingB) ? sort : sort * -1;
    }

    if (branchRatingA) return sort;
    if (branchRatingB) return sort * -1;

    return (a.rating > b.rating ? sort : sort * -1);
  };

  const sortFunction = (a: RepoAnalysis, b: RepoAnalysis) => (a.rating > b.rating ? sort : sort * -1);
  const getSortFunction = (sortBy: string) => (sortBy === 'overall' ? sortFunction : sortByIndicators(sortBy));

  const filteredRepos = repoAnalysis.repos
    .filter(repo => repo.name.toLowerCase().includes(searchString.toLowerCase()))
    .sort(getSortFunction(sortBy));

  return (
    <>
      <div className="justify-between my-8">
        <div className="mt-4">
          <h1 className="text-4xl font-semibold text-gray-800">
            {repoAnalysis.name[1]}
            <span className="text-base ml-2 text-gray-600">
              {repoAnalysis.repos.length}
              {'   '}
              repositories
            </span>
          </h1>
          <p className="italic text-sm text-gray-600 mb-8">
            {`Last updated on: ${repoAnalysis.lastUpdated}`}
          </p>
        </div>
        <div className="flex justify-between w-full items-center">
          <SearchInput className="w-1/3" onSearch={searchString => setSearchString(searchString)} searchString={searchString} />
          <div className="">
            <button
              className="text-base font-medium text-gray-600
                text-center flex items-end justify-end rounded-lg cursor-pointer mb-4"
              style={{ outline: 'none' }}
              onClick={() => setSort(sort * -1)}
            >
              {sort === 1 ? <UpChevron className="-ml-2" /> : <DownChevron className="-ml-2" />}
              Sort by Rating
            </button>
            <Select
              className="mr-6"
              onChange={setSortBy}
              options={[
                { label: 'Builds', value: 'Builds' },
                { label: 'Branches', value: 'Branches' },
                { label: 'Pull requests', value: 'Pull requests' },
                { label: 'Tests', value: 'Tests' },
                { label: 'Releases', value: 'Releases' },
                { label: 'Code quality', value: 'Code quality' }
              ]}
              value={sortBy}
            />
          </div>
        </div>
      </div>
      {filteredRepos.length ? filteredRepos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : 'No Results'}
    </>
  );
};

export default Project;
