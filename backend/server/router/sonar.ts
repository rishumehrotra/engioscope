import { passInputTo, t } from './trpc.js';
import {
  RepoSonarMeasuresInputParser,
  getRepoSonarMeasures,
} from '../../models/sonar.js';

export default t.router({
  getRepoSonarMeasures: t.procedure
    .input(RepoSonarMeasuresInputParser)
    .query(passInputTo(getRepoSonarMeasures)),
});
