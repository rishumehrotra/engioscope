import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { UIProjectAnalysis } from '../../shared/types';
import { useSetProjectDetails } from './project-details-hooks';

export default <T extends UIProjectAnalysis>(fetcher: (collectionName: string, projectName: string) => Promise<T>) => {
  const { collection, project } = useParams<{ collection: string; project: string }>();
  const [fetchResult, setFetchResult] = useState<T | 'loading'>('loading');
  const setProjectDetails = useSetProjectDetails();

  useEffect(() => {
    fetcher(collection, project).then(results => {
      setFetchResult(results);
      setProjectDetails(results);
    });
  }, [collection, fetcher, project, setProjectDetails]);

  return fetchResult;
};
