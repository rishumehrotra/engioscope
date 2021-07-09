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

const ProjectDetails : React.FC<Pick<ProjectAnalysis, 'name' | 'repos' | 'lastUpdated'>> = projectAnalysis => (
  <div className="mt-4">
    <h1 className="text-4xl font-semibold text-gray-800">
      {projectAnalysis.name[1]}
      <span className="text-base ml-2 text-gray-600">
        {projectAnalysis.repos.length}
        {'   '}
        repositories
      </span>
    </h1>
    <p className="italic text-sm text-gray-600 mb-8">
      {`Last updated on: ${projectAnalysis.lastUpdated}`}
    </p>
  </div>
);

type SortButtonsProps = {
  sort: number;
  setSort: React.Dispatch<React.SetStateAction<number>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>
}

const SortButtons: React.FC<SortButtonsProps> = ({
  sort, setSort, setSortBy, sortBy
}) => (
  <div>
    <button
      className="text-base font-medium text-gray-600
      text-center flex items-end justify-end rounded-lg cursor-pointer mb-4"
      style={{ outline: 'none' }}
      onClick={() => setSort(sort * -1)}
    >
      {sort === 1 ? <UpChevron className="-ml-2" /> : <DownChevron className="-ml-2" />}
      Sort by
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
);

const sortByIndicators = (sortBy: string, sort: number) => (a: RepoAnalysis, b: RepoAnalysis) => {
  const branchRatingA = a.indicators.find(indicator => indicator.name === sortBy)?.count;
  const branchRatingB = b.indicators.find(indicator => indicator.name === sortBy)?.count;
  if (branchRatingA && branchRatingB) {
    return (branchRatingA > branchRatingB) ? sort : sort * -1;
  }
  if (branchRatingA) return sort;
  if (branchRatingB) return sort * -1;
  return (a.rating > b.rating ? sort : sort * -1);
};

const bySearchTerm = (searchTerm: string) => (repo: RepoAnalysis) => (
  repo.name.toLowerCase().includes(searchTerm.toLowerCase())
);

const Project: React.FC = () => {
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectAnalysis | undefined>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sort, setSort] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<string>('Builds');
  const { collection, project } = useParams<{ collection: string, project: string }>();

  useEffect(() => {
    fetchProjectMetrics(collection, project).then(setProjectAnalysis);
  }, [collection, project]);

  if (!projectAnalysis) return <div>Loading...</div>;

  const filteredRepos = projectAnalysis.repos
    .filter(bySearchTerm(searchTerm))
    .sort(sortByIndicators(sortBy, sort));

  return (
    <>
      <div className="my-8">
        <div className="flex justify-end -mt-20">
          <SearchInput className="w-1/3" onSearch={setSearchTerm} searchTerm={searchTerm} />
        </div>
        <div className="flex justify-between w-full items-center mt-8">
          <ProjectDetails name={projectAnalysis.name} repos={projectAnalysis.repos} lastUpdated={projectAnalysis.lastUpdated} />
          <SortButtons sort={sort} setSort={setSort} setSortBy={setSortBy} sortBy={sortBy} />
        </div>
      </div>
      {filteredRepos.length ? filteredRepos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : 'No Results'}
    </>
  );
};

export default Project;
