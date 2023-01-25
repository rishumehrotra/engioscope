import createContextState from '../helpers/create-context-state.js';
import type { UIProjectAnalysis } from '../../shared/types.js';

const [ProjectDetailsProvider, useProjectDetails, useSetProjectDetails] =
  createContextState<UIProjectAnalysis | null>(null);

export { ProjectDetailsProvider, useProjectDetails, useSetProjectDetails };
