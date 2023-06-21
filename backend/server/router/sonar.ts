import { passInputTo, t } from './trpc.js';
import {
  RepoSonarMeasuresInputParser,
  getRepoSonarMeasures,
  getSonarRepos,
} from '../../models/sonar.js';
import { filteredReposInputParser } from '../../models/active-repos.js';

export default t.router({
  getRepoSonarMeasures: t.procedure
    .input(RepoSonarMeasuresInputParser)
    .query(passInputTo(getRepoSonarMeasures)),

  getSonarRepos: t.procedure
    .input(filteredReposInputParser)
    .query(passInputTo(getSonarRepos)),
});
