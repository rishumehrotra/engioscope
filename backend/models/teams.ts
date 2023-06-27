import { z } from 'zod';
import { TeamModel } from './mongoose-models/TeamModel.js';
import type { collectionAndProjectInputParser } from './helpers.js';
import { collectionAndProjectInputs } from './helpers.js';

export const createUpdateTeamInputParser = z.object({
  ...collectionAndProjectInputs,
  name: z.string(),
  repoIds: z.array(z.string()),
});

export const createTeam = async (team: z.infer<typeof createUpdateTeamInputParser>) =>
  TeamModel.create(team).then(x => x._id ?? null);

export const deleteTeamInputParser = z.object({
  ...collectionAndProjectInputs,
  teamName: z.string(),
});

export const deleteTeam = async ({
  collectionName,
  project,
  teamName,
}: z.infer<typeof deleteTeamInputParser>) =>
  TeamModel.deleteOne({ collectionName, project, name: teamName }).then(
    x => x.deletedCount
  );

export const updateTeam = async (team: z.infer<typeof createUpdateTeamInputParser>) => {
  const { collectionName, project, name } = team;
  return TeamModel.updateOne({ collectionName, project, name }, team, {
    upsert: true,
  }).then(x => x.upsertedId ?? null);
};

export const getTeamNames = ({
  collectionName,
  project,
}: z.infer<typeof collectionAndProjectInputParser>) =>
  TeamModel.find(
    {
      collectionName,
      project,
    },
    { _id: 0, name: 1 }
  ).then(x => x.map(y => y.name));

export const reposForTeamNameInputParser = z.object({
  ...collectionAndProjectInputs,
  name: z.string(),
});

export const getReposForTeamName = ({
  collectionName,
  project,
  name,
}: z.infer<typeof reposForTeamNameInputParser>) => {
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
