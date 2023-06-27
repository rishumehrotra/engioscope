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

export const getRepoIdsForTeamNames = (
  collectionName: string,
  project: string,
  teamNames: string[]
) => {
  return TeamModel.aggregate<{
    repoIds: string[];
  }>([
    {
      $match: {
        collectionName,
        project,
        name: { $in: teamNames },
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
      $group: {
        _id: null,
        repoIds: { $addToSet: '$repoId' },
      },
    },
    { $project: { _id: 0 } },
  ]).then(x => x[0]?.repoIds ?? []);
};

export const getRepoIdsForTeamName = ({
  collectionName,
  project,
  name,
}: z.infer<typeof reposForTeamNameInputParser>) => {
  return getRepoIdsForTeamNames(collectionName, project, [name]);
};
