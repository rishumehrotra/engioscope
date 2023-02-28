import {
  getRepoCommitsDetails,
  RepoCommitsDetailsInputParser,
} from '../../models/commits.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  getRepoCommitsDetails: t.procedure
    .input(RepoCommitsDetailsInputParser)
    .query(passInputTo(getRepoCommitsDetails)),
});
