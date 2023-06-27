import { TRPCError } from '@trpc/server';
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
  createTeam: t.procedure.input(createUpdateTeamInputParser).mutation(
    passInputTo(async input => {
      try {
        return await createTeam(input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('E11000 duplicate key error ')
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A team with this name already exists',
            cause: error,
          });
        }
        throw error;
      }
    })
  ),

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
