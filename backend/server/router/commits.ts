import {
  DevListingInputParser,
  getRepoCommitsDetails,
  getSortedDevListing,
  RepoCommitsDetailsInputParser,
} from '../../models/commits.js';
import { passInputTo, t, memoizeForUI } from './trpc.js';

export default t.router({
  getRepoCommitsDetails: t.procedure
    .input(RepoCommitsDetailsInputParser)
    .query(passInputTo(getRepoCommitsDetails)),

  getSortedDevListing: t.procedure
    .input(DevListingInputParser)
    .query(passInputTo(memoizeForUI(getSortedDevListing))),
});
