import createContextState from '../helpers/create-context-state';
import { UIProjectAnalysis } from '../../shared/types';

const [
  ProjectDetailsProvider,
  useProjectDetails,
  useSetProjectDetails
] = createContextState<UIProjectAnalysis | null>(null);

export { ProjectDetailsProvider, useProjectDetails, useSetProjectDetails };
