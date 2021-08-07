import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UIProjectAnalysis } from '../../shared/types';
import { useSetProjectDetails } from './project-details-hooks';

export type UseListingHookArg<T extends UIProjectAnalysis, U> = {
  fetcher: (collectionName: string, projectName: string) => Promise<T>;
  list: (x: T) => U[];
};

type UseListingHookReturnType<T extends UIProjectAnalysis, U> = { list: U[]; analysis: T };

export default <T extends UIProjectAnalysis, U>(
  { fetcher, list }: UseListingHookArg<T, U>
): 'loading' | UseListingHookReturnType<T, U> => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [analysisResult, setAnalysisResult] = useState<T | 'loading'>('loading');
  const setProjectDetails = useSetProjectDetails();

  useEffect(() => {
    fetcher(collection, project).then(l => {
      setAnalysisResult(l);
      setProjectDetails(l);
    });
  }, [collection, project, fetcher, setProjectDetails]);

  return analysisResult === 'loading' ? 'loading' : { list: list(analysisResult), analysis: analysisResult };
};
