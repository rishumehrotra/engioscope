import { t, passInputTo } from './trpc.js';
import {
  CollectionInputParser,
  getAllCollections,
  getProjectsForCollection,
  ProjectSearchInputParser,
  searchProjects,
} from '../../models/collection.js';
import {
  ReadSummaryInputParser,
  readSummary,
} from '../../scraper/collection-wi-summary.js';

export default t.router({
  allCollections: t.procedure.query(getAllCollections),
  collectionProjects: t.procedure
    .input(CollectionInputParser)
    .query(passInputTo(getProjectsForCollection)),
  searchProjects: t.procedure
    .input(ProjectSearchInputParser)
    .query(passInputTo(searchProjects)),
  collectionSummary: t.procedure
    .input(ReadSummaryInputParser)
    .query(passInputTo(readSummary)),
});
