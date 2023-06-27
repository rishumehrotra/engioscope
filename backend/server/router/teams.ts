import { collectionAndProjectInputParser } from '../../models/helpers.js';
import {
  createTeam,
  createUpdateTeamInputParser,
  deleteTeam,
  deleteTeamInputParser,
  getReposForTeamName,
  getTeamNames,
  reposForTeamNameInputParser,
  updateTeam,
} from '../../models/teams.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  createTeam: t.procedure
    .input(createUpdateTeamInputParser)
    .mutation(passInputTo(createTeam)),

  deleteTeam: t.procedure.input(deleteTeamInputParser).mutation(passInputTo(deleteTeam)),

  updateTeam: t.procedure
    .input(createUpdateTeamInputParser)
    .mutation(passInputTo(updateTeam)),

  getTeamNames: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(getTeamNames)),

  getReposForTeamName: t.procedure
    .input(reposForTeamNameInputParser)
    .query(passInputTo(getReposForTeamName)),
});
