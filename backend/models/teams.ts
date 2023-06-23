import mongoose from 'mongoose';
import { TeamModel, type Team } from './mongoose-models/TeamModel.js';
import { isExactSearchString } from './active-repos.js';

export const checkIfTeamNameExists = async (
  teamName: string,
  collectionName: string,
  project: string
) => TeamModel.findOne({ name: teamName, collectionName, project }).lean().exec();

export const createTeam = async (team: Team) => {
  const teamNameAlreadyExists = await checkIfTeamNameExists(
    team.name,
    team.collectionName,
    team.project
  );
  if (teamNameAlreadyExists !== null) {
    throw new Error(`Team name ${team.name} already exists`);
  }
  return TeamModel.create(team).then(x => x._id);
};

export const deleteTeam = async (teamId: string) =>
  TeamModel.deleteOne({ _id: teamId }).then(x => x.deletedCount);
export const updateTeam = async (team: Team, teamId: string) =>
  TeamModel.updateOne({ _id: new mongoose.Types.ObjectId(teamId) }, team, {
    upsert: true,
  }).then(x => x.upsertedId ?? null);

export const getTeams = (
  collectionName: string,
  project: string,
  searchTerms: string[]
) =>
  TeamModel.find({
    collectionName,
    project,
    ...(searchTerms && searchTerms.length > 0
      ? {
          $or: searchTerms.map(term => {
            if (isExactSearchString(term)) {
              return { name: term.replaceAll('"', '') };
            }
            return { name: { $regex: new RegExp(term, 'i') } };
          }),
        }
      : {}),
  })
    .lean()
    .exec();
