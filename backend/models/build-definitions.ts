import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';

export const getBuildDefinitionsForProject = (collectionName: string, project: string) =>
  BuildDefinitionModel.find({ collectionName, project }).lean();

export const getBuildDefinitionsForRepo = (options: {
  collectionName: string;
  project: string;
  repositoryId: string;
}) => {
  return BuildDefinitionModel.find(options).lean();
};

export const getYamlPipelinesCountSummary = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  searchTerm?: string,
  repoIds?: string[]
) => {
  const result = await BuildDefinitionModel.aggregate<{
    totalCount: number;
    yamlCount: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        ...(repoIds ? { repositoryId: { $in: repoIds } } : {}),
      },
    },
    {
      $group: {
        _id: { collectionName: '$collectionName', project: '$project' },
        totalCount: { $sum: 1 },
        yamlCount: {
          $sum: {
            $cond: {
              if: { $eq: ['$process.processType', 2] },
              then: 1,
              else: 0,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalCount: 1,
        yamlCount: 1,
      },
    },
  ]);

  return result[0] || { totalCount: 0, yamlCount: 0 };
};

export const getBuildPipelineCount = (collectionName: string, project: string) =>
  BuildDefinitionModel.count({ collectionName, project }).lean();

export const getNonYamlPipelines = async (
  collectionName: string,
  project: string,
  repoIds: string[]
) => {
  // const result = await RepositoryModel.aggregate([
  //   {
  //     $match: {
  //       collectionName,
  //       'project.name': project,
  //       'id': { $in: repoIds },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'builddefinitions',
  //       let: {
  //         collectionName: '$collectionName',
  //         project: '$project.name',
  //         repositoryId: '$id',
  //       },
  //       pipeline: [
  //         {
  //           $match: {
  //             $expr: {
  //               $and: [
  //                 {
  //                   $eq: ['$collectionName', '$$collectionName'],
  //                 },
  //                 {
  //                   $eq: ['$project', '$$project'],
  //                 },
  //                 {
  //                   $eq: ['$repositoryId', '$$repositoryId'],
  //                 },
  //                 {
  //                   $eq: ['$process.processType', 1],
  //                 },
  //               ],
  //             },
  //           },
  //         },
  //       ],
  //       as: 'buildsDefinitions',
  //     },
  //   },
  //   {
  //     $match: {
  //       $expr: {
  //         $gt: [
  //           {
  //             $size: '$buildsDefinitions',
  //           },
  //           0,
  //         ],
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       '_id': 0,
  //       'repositoryId': '$id',
  //       'name': 1,
  //       'total': {
  //         $size: '$buildsDefinitions',
  //       },
  //       'buildsDefinitions.id': 1,
  //       'buildsDefinitions.latestBuild': 1,
  //       'buildsDefinitions.name': 1,
  //       'buildsDefinitions.revision': 1,
  //       'buildsDefinitions.type': 1,
  //     },
  //   },
  // ]);

  const nonYamlDefinitions = await BuildDefinitionModel.find(
    {
      collectionName,
      project,
      'repositoryId': { $in: repoIds },
      'process.processType': 1,
    },
    {
      _id: 0,
      id: 1,
      name: 1,
    }
  );

  return nonYamlDefinitions.map(b => b.id);
};
