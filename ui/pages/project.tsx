import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import RepoHealth from '../components/RepoHealth';
import SearchInput from '../components/SearchInput';
import { Ascending, Descending } from '../components/Icons';
import Select from '../components/Select';
import { ProjectRepoAnalysis, RepoAnalysis } from '../../shared/types';
import { fetchProjectMetrics } from '../network';

const ProjectDetails : React.FC<Pick<ProjectRepoAnalysis, 'name' | 'repos' | 'lastUpdated'>> = projectAnalysis => (
  <div className="mt-4">
    <h1 className="text-4xl font-semibold text-gray-800">
      {projectAnalysis.name[1]}
      <span className="text-base ml-2 text-gray-600">
        {projectAnalysis.repos.length}
        {'   '}
        repositories
      </span>
    </h1>
    <p className="text-sm text-gray-600 mb-8 mt-2 flex items-center">
      Last updated on
      <p className="font-bold text-gray-800 ml-1">{projectAnalysis.lastUpdated}</p>
      {' '}
      {/* <button
        type="button"
        className="ml-5 bg-white py-2 px-3 border hover:border-gray-300
        rounded-md hover:shadow-sm text-sm leading-4 font-medium text-indigo-500
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex"
      >
        <Refresh />
        <p className="ml-1">Refresh now</p>
      </button> */}
    </p>
  </div>
);

type SortButtonsProps = {
  sort: number;
  setSort: React.Dispatch<React.SetStateAction<number>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  labels: string[]
}

const SortButtons: React.FC<SortButtonsProps> = ({
  sort, setSort, setSortBy, sortBy, labels
}) => (
  <div className="grid grid-cols-2">
    <button
      className="text-base font-medium text-gray-600
      text-center flex items-center justify-end rounded-lg cursor-pointer"
      style={{ outline: 'none' }}
      onClick={() => setSort(sort * -1)}
    >
      {sort === 1 ? <Ascending /> : <Descending />}
      <p className="mb-1 ml-2 text-sm">Sort By</p>
    </button>
    <Select
      className="bg-transparent text-gray-900 rounded-lg border-0
      form-select p-0 pl-2 h-9 w-full sm:text-sm font-medium
      focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500"
      onChange={setSortBy}
      options={labels.map(l => ({ label: l, value: l }))}
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
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectRepoAnalysis | undefined>();
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
          <ProjectDetails
            name={projectAnalysis.name}
            repos={projectAnalysis.repos}
            lastUpdated={projectAnalysis.lastUpdated}
          />
          <SortButtons
            sort={sort}
            setSort={setSort}
            setSortBy={setSortBy}
            sortBy={sortBy}
            labels={projectAnalysis.repos[0]?.indicators.map(i => i.name)}
          />
        </div>
      </div>
      {filteredRepos.length ? filteredRepos.map(repo => (
        <RepoHealth repo={repo} key={repo.name} />
      )) : 'No Results'}
    </>
  );
};

export default Project;
