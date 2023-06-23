import { TeamModel, type Team } from './mongoose-models/TeamModel.js';

export const createTeam = async (team: Team) =>
  TeamModel.create(team)
    .then(x => x._id ?? null)
    .catch(error => error);

export const deleteTeam = async (
  collectionName: string,
  project: string,
  teamName: string
) =>
  TeamModel.deleteOne({ collectionName, project, name: teamName }).then(
    x => x.deletedCount
  );
export const updateTeam = async (team: Team) => {
  const { collectionName, project, name } = team;
  return TeamModel.updateOne({ collectionName, project, name }, team, {
    upsert: true,
  }).then(x => x.upsertedId ?? null);
};

export const getTeamNames = (
  collectionName: string,
  project: string,
  searchTerms: string[]
) =>
  TeamModel.find(
    {
      collectionName,
      project,
      ...(searchTerms?.length > 0
        ? {
            $or: searchTerms.map(term => {
              return { name: term };
            }),
          }
        : {}),
    },
    { _id: 0, name: 1 }
  )
    .lean()
    .exec();
export const getReposForTeamName = (
  collectionName: string,
  project: string,
  name: string
) =>
  TeamModel.findOne(
    {
      collectionName,
      project,
      name,
    },
    { repoIds: 1 }
  ).lean();
