import { TeamModel, type Team } from './mongoose-models/TeamModel.js';

export const createTeam = async (team: Team) =>
  TeamModel.create(team).then(x => x._id ?? null);

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
      name: { $in: searchTerms },
    },
    { _id: 0, name: 1 }
  ).then(x => x.map(y => y.name));

export const getReposForTeamName = (
  collectionName: string,
  project: string,
  name: string
) => {
  return TeamModel.aggregate<{
    teamName: string;
    repos: { repoId: string; repoName: string }[];
  }>([
    {
      $match: {
        collectionName,
        project,
        name,
      },
    },
    {
      $unwind: {
        path: '$repoIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    { $addFields: { repoId: '$repoIds' } },
    {
      $lookup: {
        from: 'repositories',
        let: { repoId: '$repoId' },
        pipeline: [
          {
            $match: {
              collectionName,
              'project.name': project,
              '$expr': { $eq: ['$id', '$$repoId'] },
            },
          },
          { $limit: 1 },
          { $project: { _id: 0, repoName: '$name' } },
        ],
        as: 'repoInfo',
      },
    },
    {
      $unwind: {
        path: '$repoInfo',
        preserveNullAndEmptyArrays: false,
      },
    },
    { $addFields: { repoName: '$repoInfo.repoName' } },
    { $project: { _id: 0, repoInfo: 0 } },
    {
      $group: {
        _id: '$name',
        teamName: { $first: '$name' },
        repos: {
          $push: {
            repoId: '$repoId',
            repoName: '$repoName',
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);
};
