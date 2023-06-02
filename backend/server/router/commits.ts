import {
  devFilterInputParser,
  devListingInputParser,
  getFilteredDevCount,
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
    .input(devListingInputParser)
    .query(passInputTo(memoizeForUI(getSortedDevListing))),

  getFilteredDevCount: t.procedure
    .input(devFilterInputParser)
    .query(passInputTo(getFilteredDevCount)),
});
