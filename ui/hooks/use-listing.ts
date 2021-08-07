import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UIProjectAnalysis } from '../../shared/types';
import { useSetProjectDetails } from './project-details-hooks';
import { useSetSortOptions, useSortParams } from './sort-hooks';

export type UseListingHookArg<T extends UIProjectAnalysis, U> = {
  fetcher: (collectionName: string, projectName: string) => Promise<T>;
  list: (x: T) => U[];
  sort?: {
    default: string;
    by: Record<string, (a: U, b: U) => number>;
  };
};

type UseListingHookReturnType<T extends UIProjectAnalysis, U> = 'loading' | { list: U[]; analysis: T };

export default (
  <T extends UIProjectAnalysis, U>({ fetcher, list, sort }: UseListingHookArg<T, U>): UseListingHookReturnType<T, U> => {
    const { collection, project } = useParams<{ collection: string; project: string }>();
    const [analysisResult, setAnalysisResult] = useState<T | 'loading'>('loading');
    const setProjectDetails = useSetProjectDetails();
    const setSortOptions = useSetSortOptions();
    const [sortParams] = useSortParams();

    if (sort && !Object.keys(sort.by).includes(sort.default)) {
      throw new Error(`Sort option '${sort.default}' is not defined in sort.by`);
    }

    useEffect(() => {
      setSortOptions(
        sort
          ? { sortKeys: Object.keys(sort.by), defaultKey: sort.default }
          : null
      );
    }, [setSortOptions, sort]);

    useEffect(() => {
      fetcher(collection, project).then(l => {
        setAnalysisResult(l);
        setProjectDetails(l);
      });
    }, [collection, project, fetcher, setProjectDetails]);

    if (analysisResult === 'loading') return 'loading';

    const result = sort
      ? list(analysisResult).sort(
        (a, b) => (
          (sortParams.sort === 'asc' ? 1 : -1)
          * sort.by[sortParams.sortBy || sort.default](a, b)
        )
      )
      : list(analysisResult);

    return { list: result, analysis: analysisResult };
  }
);
